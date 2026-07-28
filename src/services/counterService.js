// ============================================================
// Counter Service —— 计数器 / 测点读数（模块 07 后端化）
// ------------------------------------------------------------
// 端点（amos-server CounterController）：
//   GET  /maintenance/counters/overview
//   POST /maintenance/components/{cid}/counters/{id}/readings
//   POST /maintenance/functions/{fid}/counters/{id}/readings
//   POST /maintenance/components/{cid}/measure-points/{id}/readings
//   POST /maintenance/components/{cid}/counters/{id}/set-start
//   GET  /maintenance/counter-logs / GET /maintenance/measure-logs
//
// 与既有 service 同构：复用 db.counterLogs / db.measureLogs 作为响应式
// 缓存，loadLogs()/loadMeasureLogs() 从后端拉取并原地替换；list()/
// byComponent() 保持同步签名（供 computed 派生）。
// 组件 / 计数器为本地草稿（非数字 id）时回落旧 mock 行为（演示模式兼容）。
// ============================================================

import { db, uid } from '../mock/index.js'
import { apiFetch } from './api.js'

const BASE = '/maintenance'

// 手册 P44：Average = 当前累计 / 自安装（或上次归零）至今的天数（mock 回落用）
function calcAverage(totalRunning, baseDate, readingDate) {
  const base = baseDate || readingDate
  let days = 365
  if (base && readingDate) {
    const d = (new Date(readingDate) - new Date(base)) / 86400000
    if (d > 0) days = d
  }
  return (totalRunning / days).toFixed(1)
}

// 组件计数器行从类型继承时的默认字段（mock 回落用）
function blankCounter(c) {
  return { ...c, startValue: 0, currentValue: 0, latestZeroedDate: '', average: 0, calculate: 'No' }
}

function isBackendId(v) {
  return typeof v === 'number'
}

// ---- DTO 适配 ----
// 后端 CounterReadingLogDto → 视图行（registry 'update-counters' 列）
function counterLogFromDto(d, unit = '') {
  return {
    id: d.id,
    component: d.componentNo || '',
    function: d.functionNo || '',
    counter: d.code || d.description || '',
    description: d.description || '',
    currentValue: d.newValue != null ? d.newValue : '',
    newValue: d.newValue != null ? d.newValue : '',
    oldValue: d.oldValue != null ? d.oldValue : '',
    delta: d.delta != null ? d.delta : '',
    unit,
    readingDate: d.readingDate || '',
    createdBy: d.createdBy || '',
  }
}

// 后端 MeasurePointReadingLogDto → 视图行（registry 'update-measure-points' 列）
function measureLogFromDto(d) {
  return {
    id: d.id,
    component: d.componentNo || '',
    function: d.functionNo || '',
    measurePoint: d.code || d.description || '',
    description: d.description || '',
    value: d.value != null ? d.value : '',
    trend: d.trend || '',
    readingDate: d.readingDate || '',
    createdBy: d.createdBy || '',
  }
}

// 应用后端返回的 ComponentCounterDto 到本地缓存计数器行
function applyCounterDto(cc, dto) {
  if (!cc || !dto) return
  cc.currentValue = dto.currentValue != null ? dto.currentValue : cc.currentValue
  cc.latestZeroedDate = dto.latestZeroedDate || cc.latestZeroedDate
  cc.startValue = dto.startValue != null ? Number(dto.startValue) : cc.startValue
  cc.average = dto.average != null ? Number(dto.average) : cc.average
}

// 查找本地组件缓存
function findComponent(componentNo) {
  return db.components.find((c) => c.number === componentNo)
}

// 计数器行按 code 或 description 匹配（Update Counters 窗口 counter 字段为自由文本）
function findCounter(comp, key) {
  return (comp?.componentCounters || []).find((c) => c.code === key || c.description === key)
}

function findMeasurePoint(comp, key) {
  return (comp?.componentMeasurePoints || []).find((m) => m.code === key || m.description === key)
}

// 后端保存成功后，用持久化日志替换列表中的本地草稿行
function replaceLog(arr, draftId, saved) {
  const i = arr.findIndex((r) => r.id === draftId)
  if (i >= 0) arr[i] = saved
  else arr.push(saved)
  return saved
}

export const counterService = {
  // ---- 读取（同步，供 computed 派生）----
  list() {
    return db.counterLogs
  },
  byComponent(componentNo) {
    return db.counterLogs.filter((r) => r.component === componentNo)
  },
  listMeasureLogs() {
    return db.measureLogs
  },

  // ---- 从后端拉取读数日志（原地替换缓存，保留未保存草稿）----
  async loadLogs(filters = {}) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) if (v != null && v !== '') qs.set(k, v)
    const q = qs.toString()
    const list = await apiFetch(`${BASE}/counter-logs${q ? '?' + q : ''}`)
    const rows = (list || []).map((d) => {
      const cc = findCounter(findComponent(d.componentNo), d.code || d.description)
      return counterLogFromDto(d, cc?.unit || '')
    })
    const drafts = db.counterLogs.filter((r) => typeof r.id === 'string' && r.id.startsWith('new_'))
    db.counterLogs.length = 0
    rows.forEach((r) => db.counterLogs.push(r))
    drafts.forEach((r) => db.counterLogs.push(r))
    return db.counterLogs.slice()
  },

  async loadMeasureLogs(filters = {}) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) if (v != null && v !== '') qs.set(k, v)
    const q = qs.toString()
    const list = await apiFetch(`${BASE}/measure-logs${q ? '?' + q : ''}`)
    const rows = (list || []).map(measureLogFromDto)
    const drafts = db.measureLogs.filter((r) => typeof r.id === 'string' && r.id.startsWith('new_'))
    db.measureLogs.length = 0
    rows.forEach((r) => db.measureLogs.push(r))
    drafts.forEach((r) => db.measureLogs.push(r))
    return db.measureLogs.slice()
  },

  // ---- 手册 3（Update Counters）：记录组件计数器读数 ----
  // 后端命令：写不可变日志 + 更新当前值/平均 + dependsOn 级联 + 同步 function 计数器。
  // 返回 { counter, log }。组件/计数器为本地草稿时回落 mock 行为。
  async recordReading(rec) {
    const comp = findComponent(rec.component)
    if (!comp) throw new Error('组件不存在：' + (rec.component || '(空)'))
    const cc = findCounter(comp, rec.counter)
    if (!cc) throw new Error(`组件 ${comp.number} 上不存在计数器「${rec.counter || '(空)'}」（按 code / description 匹配）`)

    if (isBackendId(comp.id) && isBackendId(cc.id)) {
      const res = await apiFetch(`${BASE}/components/${comp.id}/counters/${cc.id}/readings`, {
        method: 'POST',
        body: {
          newValue: Number(rec.newValue),
          readingDate: rec.readingDate || '',
          unit: rec.unit || cc.unit || '',
        },
      })
      // 回写本地缓存：本计数器 + 级联依赖计数器 + function 计数器
      applyCounterDto(cc, res.componentCounter)
      ;(res.dependentUpdates || []).forEach((dto) => {
        db.components.forEach((c) => {
          const dep = (c.componentCounters || []).find((x) => x.id === dto.id)
          if (dep) applyCounterDto(dep, dto)
        })
      })
      if (res.functionCounter) {
        const fn = db.functions.find((f) => f.functionNo === comp.functionNo)
        const fc = (fn?.functionCounters || []).find(
          (x) => x.id === res.functionCounter.id || x.description === res.functionCounter.description,
        )
        if (fc) fc.lastValue = Number(res.functionCounter.lastValue)
      }
      const saved = counterLogFromDto(res.log, rec.unit || cc.unit || '')
      replaceLog(db.counterLogs, rec.id, saved)
      return { counter: cc, log: saved }
    }

    // ---- mock 回落（演示模式 / 本地草稿组件）----
    const oldValue = cc.currentValue
    cc.currentValue = rec.newValue != null ? rec.newValue : rec.currentValue
    const delta = cc.currentValue - oldValue
    cc.latestZeroedDate = rec.readingDate || cc.latestZeroedDate
    cc.average = calcAverage(cc.currentValue, comp.installDate, cc.latestZeroedDate)
    this._syncDependents(rec.component, cc.code, cc.currentValue, cc.latestZeroedDate)
    this._syncFunctionCounter(comp, cc.description, delta)
    const saved = {
      id: uid('cl'),
      component: rec.component,
      function: rec.function || comp.functionNo || '',
      counter: rec.counter,
      currentValue: cc.currentValue,
      newValue: rec.newValue,
      unit: rec.unit || cc.unit || '',
      readingDate: rec.readingDate,
    }
    replaceLog(db.counterLogs, rec.id, saved)
    return { counter: cc, log: saved }
  },

  // ---- 手册 3（Update Measure Points）：记录测点读数 ----
  async recordMeasurePointReading(rec) {
    const comp = findComponent(rec.component)
    if (!comp) throw new Error('组件不存在：' + (rec.component || '(空)'))
    const mp = findMeasurePoint(comp, rec.measurePoint)

    if (mp && isBackendId(comp.id) && isBackendId(mp.id)) {
      const res = await apiFetch(`${BASE}/components/${comp.id}/measure-points/${mp.id}/readings`, {
        method: 'POST',
        body: {
          value: rec.value != null ? String(rec.value) : '',
          trend: rec.trend || 'Stable',
          readingDate: rec.readingDate || '',
        },
      })
      // 回写本地测点缓存
      if (res.measurePoint) {
        mp.value = res.measurePoint.value != null ? res.measurePoint.value : mp.value
        mp.trend = res.measurePoint.trend || mp.trend
        mp.lastReadDate = res.measurePoint.lastReadDate || mp.lastReadDate
      }
      const saved = measureLogFromDto(res.log)
      replaceLog(db.measureLogs, rec.id, saved)
      return { measurePoint: mp, log: saved }
    }

    // ---- mock 回落 ----
    if (mp) {
      mp.value = rec.value
      mp.trend = rec.trend || mp.trend
      mp.lastReadDate = rec.readingDate || mp.lastReadDate
    }
    const saved = {
      id: uid('ml'),
      component: rec.component,
      function: comp.functionNo || '',
      measurePoint: rec.measurePoint,
      value: rec.value,
      trend: rec.trend || 'Stable',
      readingDate: rec.readingDate,
    }
    replaceLog(db.measureLogs, rec.id, saved)
    return { measurePoint: mp, log: saved }
  },

  // ---- 手册 P44：Set Start（归零：快照当前值为起点，重置平均基准）----
  async setStart(componentNo, code) {
    const comp = findComponent(componentNo)
    if (!comp) return null
    const cc = (comp.componentCounters || []).find((c) => c.code === code)
    if (!cc) return null
    if (isBackendId(comp.id) && isBackendId(cc.id)) {
      const res = await apiFetch(`${BASE}/components/${comp.id}/counters/${cc.id}/set-start`, { method: 'POST' })
      applyCounterDto(cc, res.componentCounter)
      return cc
    }
    // mock 回落
    cc.startValue = cc.currentValue
    cc.latestZeroedDate = new Date().toISOString().slice(0, 10)
    cc.average = calcAverage(cc.currentValue, comp.installDate, cc.latestZeroedDate)
    return cc
  },

  // ---- 手册 3.1（Counters Overview）：后端聚合查询，摊平为表格行 ----
  async loadOverview({ component, function: fn, inherits } = {}) {
    const qs = new URLSearchParams()
    if (component) qs.set('component', component)
    if (fn) qs.set('function', fn)
    if (inherits) qs.set('inherits', 'true')
    const q = qs.toString()
    const items = await apiFetch(`${BASE}/counters/overview${q ? '?' + q : ''}`)
    const rows = []
    ;(items || []).forEach((item) => {
      ;(item.counters || []).forEach((cc) => {
        rows.push({
          componentId: item.componentId,
          component: item.componentNo,
          function: item.functionNo || '',
          counter: cc.code,
          description: cc.description || '',
          currentValue: cc.currentValue != null ? cc.currentValue : 0,
          unit: cc.unit || '',
          latestZeroedDate: cc.latestZeroedDate || '',
          average: cc.average != null ? Number(cc.average) : '',
          dependsOn: cc.dependsOn || '',
          calculate: cc.calculate || 'No',
        })
      })
    })
    return rows
  },

  // ---- 以下为 mock 回落（演示模式）----
  _syncDependents(targetComponentNo, code, value, latestZeroedDate) {
    db.components.forEach((c) => {
      ;(c.componentCounters || []).forEach((cc) => {
        if (cc.dependsOn === targetComponentNo && cc.code === code) {
          cc.currentValue = value
          cc.latestZeroedDate = latestZeroedDate || new Date().toISOString().slice(0, 10)
          cc.average = calcAverage(value, c.installDate, cc.latestZeroedDate)
        }
      })
    })
  },

  _syncFunctionCounter(comp, description, delta) {
    if (!comp || !comp.functionNo || !delta) return
    const fn = db.functions.find((f) => f.functionNo === comp.functionNo)
    if (!fn) return
    fn.functionCounters = fn.functionCounters || []
    const fc = fn.functionCounters.find((c) => c.description === description)
    if (fc) fc.lastValue = (fc.lastValue || 0) + delta
  },

  // 手册 3.1：mock 回落 —— 聚合本地缓存所有组件计数器（演示模式用）
  allCounters() {
    const arr = []
    db.components.forEach((c) => {
      let counters = c.componentCounters
      if (!counters || !counters.length) {
        const ct = db.componentTypes.find((t) => t.typeNumber === c.typeNumber)
        counters = (ct?.counters || []).map(blankCounter)
      }
      ;(counters || []).forEach((cc) => {
        arr.push({
          component: c.number,
          function: c.functionNo,
          counter: cc.code,
          description: cc.description,
          currentValue: cc.currentValue,
          unit: cc.unit,
          latestZeroedDate: cc.latestZeroedDate || '',
          average: cc.average || calcAverage(cc.currentValue, c.installDate, cc.latestZeroedDate),
          dependsOn: cc.dependsOn || '',
          calculate: cc.calculate || 'No',
        })
      })
    })
    return arr
  },
}
