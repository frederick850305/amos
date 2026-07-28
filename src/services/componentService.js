// ============================================================
// Component Service —— 接入 amos-server 后端
// 端点：/api/maintenance/components
// ------------------------------------------------------------
// 视图层（ComponentsView / ComponentsHierarchyView）只调用本 service，
// 不直接操作 mock。
//
// 为兼容既有「同步绑定」用法（列表 computed 读 listSync()、hierarchy 读
// byNo()/search()/listSync()），本 service 复用 db.components 作为响应式
// 缓存：
//   * loadAll()   从后端拉取并原地替换 db.components 内容（保留未落库本地草稿）；
//   * save/remove 调后端并同步刷新 db.components；
//   * listSync()/byNo()/search() 仍同步返回 db.components（与旧签名一致）。
//
// 状态机（手册 Component Status）：
//   * 已安装到 function（functionNo 非空）→ 'In Use'
//   * 未安装到 function                         → 'Available'
//   * 手动可切换为 'Transferred' / 'Scrapped'
//   * 所有状态变更经后端 change-status 命令持久化，并写 component_status_log。
//
// 安装/拆卸（setFunction）与 Function History（getFunctionHistory）已在模块 06 后端化：
// setFunction 经 functionService 的 install/remove-component 命令持久化并写状态日志；
// getFunctionHistory 走后端 GET /{id}/function-history。
// ============================================================

import { db, uid } from '../mock/index.js'
import { apiFetch } from './api.js'
import { functionService } from './functionService.js'

const BASE = '/maintenance/components'

export const COMPONENT_STATUSES = ['In Use', 'Available', 'Transferred', 'Scrapped']

// 自动推导状态：仅当状态处于自动管理集合（In Use / Available）时才覆盖，
// 以免冲掉用户手动设置的 Transferred / Scrapped。
function deriveStatus(comp) {
  const installed = !!comp.functionNo
  const autoManaged = comp.status === 'In Use' || comp.status === 'Available'
  return autoManaged ? (installed ? 'In Use' : 'Available') : comp.status
}

function isNew(vm) {
  return !vm || vm.id == null || typeof vm.id === 'string'
}

// ---- DTO 适配 ----
function fromDto(d) {
  if (!d) return null
  return {
    id: d.id,
    number: d.number || '',
    typeNumber: d.typeNumber || '',
    name: d.name || '',
    status: d.status || 'Available',
    maker: d.maker || '',
    type: d.type || '',
    serialNo: d.serialNo || '',
    location: d.location || '',
    department: d.department || '',
    vendor: d.vendor || '',
    functionNo: d.functionNo || '',
    installDate: d.installDate || '',
    installation: d.installation || '',
    parentComponent: d.parentComponent || '',
    componentTypeModel: d.componentTypeModel || '',
    dateCreated: d.dateCreated || '',
    dateModified: d.dateModified || '',
    componentCounters: (d.componentCounters || []).map((c) => ({
      id: c.id,
      code: c.code || '',
      description: c.description || '',
      unit: c.unit || '',
      currentValue: c.currentValue != null ? c.currentValue : 0,
      dependsOn: c.dependsOn || '',
      latestZeroedDate: c.latestZeroedDate || '',
      startValue: c.startValue != null ? c.startValue : 0,
      average: c.average != null ? c.average : 0,
      calculate: c.calculate || 'No',
    })),
    componentMeasurePoints: (d.componentMeasurePoints || []).map((m) => ({
      id: m.id,
      code: m.code || '',
      description: m.description || '',
      unit: m.unit || '',
      trend: m.trend || 'Stable',
      value: m.value != null ? m.value : '',
      lastReadDate: m.lastReadDate || '',
    })),
  }
}

function toDto(vm) {
  if (!vm) return null
  const numId = (v) => (typeof v === 'number' ? v : undefined)
  return {
    id: numId(vm.id),
    number: vm.number || null,
    typeNumber: vm.typeNumber || null,
    name: vm.name || null,
    status: vm.status || 'Available',
    maker: vm.maker || null,
    type: vm.type || null,
    serialNo: vm.serialNo || null,
    location: vm.location || null,
    department: vm.department || null,
    vendor: vm.vendor || null,
    functionNo: vm.functionNo || null,
    installDate: vm.installDate || null,
    installation: vm.installation || null,
    parentComponent: vm.parentComponent || null,
    componentTypeModel: vm.componentTypeModel || null,
    componentCounters: (vm.componentCounters || []).map((c) => ({
      id: numId(c.id),
      code: c.code,
      description: c.description,
      unit: c.unit,
      currentValue: c.currentValue,
      dependsOn: c.dependsOn || '',
      latestZeroedDate: c.latestZeroedDate || '',
      startValue: c.startValue != null ? c.startValue : 0,
      average: c.average != null ? c.average : 0,
      calculate: c.calculate || 'No',
    })),
    componentMeasurePoints: (vm.componentMeasurePoints || []).map((m) => ({
      id: numId(m.id),
      code: m.code,
      description: m.description,
      unit: m.unit,
      trend: m.trend || 'Stable',
      value: m.value != null ? m.value : '',
      lastReadDate: m.lastReadDate || '',
    })),
  }
}

export const componentService = {
  // ---- 加载 / 同步缓存 ----
  // 从后端拉取全部，原地替换 db.components（保留尚未落库的本地字符串 id 草稿）
  async loadAll() {
    const list = await apiFetch(BASE)
    const fromBackend = (list || []).map(fromDto)
    const drafts = db.components.filter((c) => typeof c.id !== 'number')
    db.components.length = 0
    fromBackend.forEach((r) => db.components.push(r))
    drafts.forEach((d) => db.components.push(d))
    return db.components.slice()
  },

  // 同步读取（供 computed 派生 / 视图列表源，保持对 db 的响应式追踪）
  listSync() {
    return db.components
  },

  // 兼容旧调用：返回缓存快照
  async list() {
    return db.components.slice()
  },

  // 服务端列表过滤：转发 installation/department/status/typeNumber/functionNo/q 到后端 list()
  async query(filters = {}) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v != null && v !== '') qs.set(k, v)
    }
    const q = qs.toString()
    const list = await apiFetch(`${BASE}${q ? '?' + q : ''}`)
    return (list || []).map(fromDto)
  },

  async get(id) {
    const d = await apiFetch(`${BASE}/${id}`)
    return fromDto(d)
  },

  // number → component 的映射（供 Hierarchy 快速查找）
  byNo() {
    return Object.fromEntries(db.components.map((c) => [c.number, c]))
  },

  // 按 id 列表批量取组件
  getByIds(ids = []) {
    return ids.map((id) => db.components.find((c) => c.id === id)).filter(Boolean)
  },

  // 名称 / 编码片段模糊查找（供 Hierarchy 的 Find 窗口）
  search(text) {
    const s = (text || '').trim().toLowerCase()
    if (!s) return []
    return db.components.filter((c) => (c.number + ' ' + c.name).toLowerCase().includes(s))
  },

  // ---- 部件类型（Component Types）主数据访问 ----
  listComponentTypes() {
    return db.componentTypes
  },
  getComponentType(typeNumber) {
    return db.componentTypes.find((c) => c.typeNumber === typeNumber) || null
  },
  // 复制 / 新增部件类型（保留兼容）
  async addComponentType(record) {
    db.componentTypes.push(record)
    return record
  },

  // 由 Component Types 的 Register as Component 流程 seed 一条后端返回的实例
  addComponentSeed(comp) {
    const rec = fromDto(comp) || comp
    const i = db.components.findIndex((c) => c.number === rec.number)
    if (i >= 0) db.components[i] = rec
    else db.components.push(rec)
    return rec
  },

  // ---- 持久化：新建 / 更新 / 删除 ----
  async save(rec) {
    const dto = toDto(rec)
    if (isNew(rec)) {
      const created = await apiFetch(BASE, { method: 'POST', body: dto })
      const vm = fromDto(created)
      const i = db.components.findIndex((c) => c.id === rec.id)
      if (i >= 0) db.components[i] = vm
      else db.components.push(vm)
      return vm
    }
    const updated = await apiFetch(`${BASE}/${rec.id}`, { method: 'PUT', body: dto })
    const vm = fromDto(updated)
    const i = db.components.findIndex((c) => String(c.id) === String(rec.id))
    if (i >= 0) db.components[i] = vm
    else db.components.push(vm)
    return vm
  },

  async remove(rec) {
    if (!isNew(rec)) await apiFetch(`${BASE}/${rec.id}`, { method: 'DELETE' })
    const i = db.components.findIndex((c) => c.id === rec.id)
    if (i >= 0) db.components.splice(i, 1)
  },

  // ---- 注册组件（来自 Component Types 窗口 Options > Register as Component）----
  // 注册时尚未安装到 function，状态按手册推导为 'Available'。
  async register({ typeNumber, name, maker, model, location, department, functionNo = '', installDate = '' }) {
    const dto = {
      number: 'C-' + Math.floor(Math.random() * 90000 + 10000),
      typeNumber,
      name,
      maker,
      type: '',
      serialNo: '',
      status: '',
      location,
      functionNo: functionNo || '',
      vendor: maker,
      parentComponent: '',
      installDate: installDate || '',
      department,
      componentCounters: [],
      componentMeasurePoints: [],
    }
    const created = await apiFetch(BASE, { method: 'POST', body: dto })
    const vm = fromDto(created)
    vm.status = deriveStatus(vm) // 注册默认无 function → Available
    const i = db.components.findIndex((c) => c.id === created.id)
    if (i >= 0) db.components[i] = vm
    else db.components.push(vm)
    return vm
  },

  // ---- 设置功能位置（安装 / 拆卸，模块 06 后端化）----
  // 经 functionService 的 install/remove-component 命令持久化：
  //  - 新 functionNo 非空 → 先在旧 function 上拆卸（组件回落 Available），再安装到新 function；
  //  - 新 functionNo 为空 → 仅在旧 function 上拆卸。
  // 后端联动维护组件 functionNo / status / location 并写状态日志；本地缓存随后刷新。
  // 注意：成功后的 UI 刷新不再依赖末尾 get(id)（后端繁忙时可能失败），改为乐观更新本地缓存，
  // get(id) 仅作为后台校正且失败忽略，避免 Install/Remove 后 UI 不刷新（按钮灰色 / 报未安装）。
  async setFunction(id, functionNo) {
    const comp = db.components.find((c) => c.id === id)
    if (!comp) return null
    const oldFn = comp.functionNo || ''
    const newFn = functionNo || ''
    if (oldFn === newFn) return comp
    try {
      // 先从旧 function 拆卸（组件回落 Available）。若旧 function 已无组件（已拆），
      // 后端会抛 "no component installed"，属无害场景，忽略并继续安装新 function。
      if (oldFn) {
        try {
          await functionService.removeComponent(oldFn, {
            details: newFn ? `Moved to ${newFn}` : 'Removed from component',
          })
        } catch (removeErr) {
          console.warn('[setFunction] removeComponent(old) skipped:', removeErr?.message || removeErr)
        }
      }
      if (newFn) {
        await functionService.installComponent(newFn, comp.number, 'Installed via component')
      }
      // 乐观更新本地缓存（不依赖末端 get，避免后端繁忙时 UI 不刷新）
      const updated = db.components.find((c) => String(c.id) === String(id)) || comp
      updated.functionNo = newFn
      updated.status = newFn ? 'In Use' : 'Available'
      return updated
    } catch (e) {
      // 安装 / 拆卸失败：回滚到后端真实状态（后台校正，失败忽略）
      const refreshed = await this.get(id).catch(() => null)
      if (refreshed) {
        const i = db.components.findIndex((c) => String(c.id) === String(id))
        if (i >= 0) db.components[i] = refreshed
      }
      throw e
    }
  },

  // ---- Functions Performed 历史（模块 06 后端化）----
  // 后端按组件 id 查询 component_function_history；未保存草稿回落本地 mock。
  async getFunctionHistory(componentId) {
    if (componentId == null || typeof componentId !== 'number') {
      return db.componentFunctionHistory.filter((h) => h.componentId === componentId).slice().reverse()
    }
    try {
      return await apiFetch(`${BASE}/${componentId}/function-history`)
    } catch {
      return db.componentFunctionHistory.filter((h) => h.componentId === componentId).slice().reverse()
    }
  },

  // ---- Component Archives（手册 Component Archives）----
  // 组件从其他部门转入时写三种档案（后端 archive 端点按 componentNo 查询）。
  async transferIn({ componentNo, fromDepartment, toDepartment, archiveData = {} }) {
    const kinds = ['component', 'transfer', 'status']
    kinds.forEach((kind) => {
      db.componentArchives.push({
        id: uid('ca'),
        componentNo,
        kind,
        fromDepartment,
        toDepartment,
        archiveDate: new Date().toISOString().slice(0, 10),
        data: archiveData[kind] || `${kind} archive from ${fromDepartment}`,
      })
    })
    return true
  },
  // 组件档案查询改为后端持久化（GET /{id}/archive?kind=）。
  // 后端按 componentNo 查询，但路径需组件 id，故先用 number 在缓存反查 id。
  async getArchives(componentNo, kind) {
    if (!componentNo) return []
    const comp = db.components.find((c) => c.number === componentNo)
    if (!comp || typeof comp.id !== 'number') return []
    let path = `${BASE}/${comp.id}/archive`
    if (kind) path += `?kind=${encodeURIComponent(kind)}`
    return apiFetch(path)
  },

  // ---- 修改状态（Options > Change Status）----
  // 调后端 change-status 命令（写 component_status_log），并同步本地缓存状态。
  // 返回 { ok, affectedWanted, updatedIds }：affectedWanted 由本地 stockWanted 计算
  // （stock 模块尚未后端化），其余字段与后端一致。
  async changeStatus(id, newStatus, { cascadeSubComponents = false } = {}) {
    const res = await apiFetch(`${BASE}/${id}/change-status`, {
      method: 'POST',
      body: { newStatus, cascadeSubComponents },
    })
    const ids = res.updatedIds || [id]
    ids.forEach((iid) => {
      const c = db.components.find((x) => x.id === iid)
      if (c) c.status = newStatus
    })

    let affectedWanted = []
    if (newStatus === 'Transferred') {
      const comp = db.components.find((x) => x.id === id)
      affectedWanted = (db.stockWanted || []).filter(
        (w) => w.forComponent && (w.forComponent === comp?.number || w.forComponent === comp?.functionNo),
      )
    }
    return { ok: true, affectedWanted, updatedIds: ids }
  },

  // ---- 组件 Transferred 时处理 Stock Wanted 引用（本地 mock，stock 模块尚未后端化）----
  async resolveTransferredStock(componentId, { clearQuantity = false } = {}) {
    const comp = db.components.find((c) => c.id === componentId)
    if (!comp) return
    db.stockWanted.forEach((w) => {
      if (w.forComponent === comp.number || w.forComponent === comp.functionNo) {
        if (clearQuantity) w.wantedQty = 0
        w.forComponent = ''
      }
    })
  },

  // ---- 状态日志查询（后端持久化）----
  async getStatusLog(id) {
    return apiFetch(`${BASE}/${id}/status-log`)
  },
  // 全局状态日志（Maintenance > Component Status Log 独立窗口）
  async getAllStatusLogs() {
    return apiFetch(`${BASE}/status-log`)
  },
}
