// ============================================================
// Counter Service —— 计数器读数（Counter Logs）领域的数据访问层
// ------------------------------------------------------------
// 与既有 service 同构：视图层只调用本 service。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
// Counters Overview 为只读视图（手册 3.1：仅显示当前读数，不可更新），
// 故暂不提供写入方法。
// ============================================================

import { db, uid } from '../mock/index.js'

// 手册 P44：Average = 当前累计 / 自安装（或上次归零）至今的天数
function calcAverage(totalRunning, baseDate, readingDate) {
  const base = baseDate || readingDate
  let days = 365
  if (base && readingDate) {
    const d = (new Date(readingDate) - new Date(base)) / 86400000
    if (d > 0) days = d
  }
  return (totalRunning / days).toFixed(1)
}

// 组件计数器行从类型继承时的默认字段（手册 P44：Counters 标签字段集）
function blankCounter(c) {
  return { ...c, startValue: 0, currentValue: 0, latestZeroedDate: '', average: 0, calculate: 'No' }
}

export const counterService = {
  // ---- 读取 ----
  list() {
    return db.counterLogs
  },
  // 某组件的计数器读数
  byComponent(componentNo) {
    return db.counterLogs.filter((r) => r.component === componentNo)
  },

  // 手册 P44：依赖联动 —— 被依赖组件更新后，级联同步所有 dependsOn 指向它的同 code 计数器
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

  // 手册 Function Counters：组件安装所在 function 的同 description 计数器，随组件读数增量同步递增
  // （组件与 function 计数器的 code 命名可能不同，但 description 一致，故以 description 匹配）
  _syncFunctionCounter(comp, description, delta) {
    if (!comp || !comp.functionNo || !delta) return
    const fn = db.functions.find((f) => f.functionNo === comp.functionNo)
    if (!fn) return
    fn.functionCounters = fn.functionCounters || []
    const fc = fn.functionCounters.find((c) => c.description === description)
    if (fc) fc.lastValue = (fc.lastValue || 0) + delta
  },

  // 手册 3（Update Counters）：记录一次读数——回写组件 componentCounters 当前值，并级联依赖组件
  recordReading(rec) {
    const comp = db.components.find((c) => c.number === rec.component)
    if (!comp) return null
    // 若该组件尚未从类型继承 counters，则惰性初始化
    if (!comp.componentCounters) {
      const ct = db.componentTypes.find((t) => t.typeNumber === comp.typeNumber)
      comp.componentCounters = (ct?.counters || []).map(blankCounter)
    }
    const cc = (comp.componentCounters || []).find((c) => c.description === rec.counter)
    if (cc) {
      const oldValue = cc.currentValue
      cc.currentValue = rec.newValue != null ? rec.newValue : rec.currentValue
      const delta = cc.currentValue - oldValue
      cc.latestZeroedDate = rec.readingDate || cc.latestZeroedDate
      cc.average = calcAverage(cc.currentValue, comp.installDate, cc.latestZeroedDate)
      // 同步所有依赖本组件该计数器的其它组件（手册 P44：Counters Dependent on Other Components' Counters）
      this._syncDependents(rec.component, cc.code, cc.currentValue, cc.latestZeroedDate)
      // 手册 Function Counters：组件读数更新 → 所属 function 的同 description 计数器同步递增相同增量
      this._syncFunctionCounter(comp, cc.description, delta)
    }
    // 追加一条只读历史日志
    db.counterLogs.push({
      id: uid('cl'),
      component: rec.component,
      function: rec.function,
      counter: rec.counter,
      currentValue: cc ? cc.currentValue : rec.currentValue,
      newValue: rec.newValue,
      unit: rec.unit,
      readingDate: rec.readingDate,
    })
    return cc
  },

  // 手册 P44：Counters 标签 Set Start —— 将当前累计值快照为归零点，重置平均基准
  setStart(componentNo, code) {
    const comp = db.components.find((c) => c.number === componentNo)
    if (!comp?.componentCounters) return null
    const cc = comp.componentCounters.find((c) => c.code === code)
    if (!cc) return null
    cc.startValue = cc.currentValue
    cc.latestZeroedDate = new Date().toISOString().slice(0, 10)
    cc.average = calcAverage(cc.currentValue, comp.installDate, cc.latestZeroedDate)
    return cc
  },

  // 手册 3.1（Counters Overview）：聚合所有组件当前计数器读数（惰性从类型初始化）
  allCounters() {
    const arr = []
    db.components.forEach((c) => {
      let counters = c.componentCounters
      if (!counters) {
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
