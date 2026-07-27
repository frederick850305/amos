// ============================================================
// Function Service —— 接入 amos-server 后端
// 端点：/api/maintenance/functions
// ------------------------------------------------------------
// 视图层（BusinessWindow 的 Functions 窗口 / FunctionsHierarchyView）只调用
// 本 service，不直接操作 mock。
//
// 为兼容既有「同步绑定」用法（Hierarchy 读 listSync()/byNo()/search()、BusinessWindow
// 调 changeStatus/update/updateLocation 走同步签名），本 service 复用 db.functions
// 作为响应式缓存：
//   * loadAll()   从后端拉取并原地替换 db.functions 内容（保留未落库本地草稿）；
//   * save/remove 调后端并同步刷新 db.functions；
//   * listSync()/byNo()/search()/get()/roots()/locationMap() 仍同步返回 db.functions；
//   * update/updateLocation/changeStatus/add 同步更新本地缓存，并 fire-and-forget
//     调后端持久化（保持 Hierarchy 既有的同步调用签名不变）；
//   * installComponent/removeComponent/save/remove 为 async，等待后端响应。
//
// 数据权限：功能位置按船（installation）划分，列表/读取统一按当前 installation 过滤；
// 其 department 为描述性名称（与登录会话的 department code 不同），故窗口不按
// department 收敛（避免登录后全部被 scopeByDepartment 过滤掉）。
// ============================================================

import { db } from '../mock/index.js'
import { apiFetch } from './api.js'
import { workOrderService } from './workOrderService.js'
import { store } from '../store.js'

const BASE = '/maintenance/functions'

// 草稿判定：后端返回 id 为 number；本地新建为字符串 id
function isNew(vm) {
  return !vm || vm.id == null || typeof vm.id === 'string'
}
const numId = (v) => (typeof v === 'number' ? v : undefined)

// ---- DTO 适配 ----
function fromDto(d) {
  if (!d) return null
  return {
    id: d.id,
    functionNo: d.functionNo || '',
    installation: d.installation || '',
    department: d.department || '',
    description: d.description || '',
    reference: d.reference || '',
    parentFunctionNo: d.parentFunctionNo || '',
    status: d.status || 'In Use',
    location: d.location || '',
    criticality: d.criticality || '',
    // 后端以 installedComponentNo 回填，前端用 installedComponentId 展示
    installedComponentId: d.installedComponentId || '',
    sfiCode: d.sfiCode || '',
    system: d.system || '',
    subSystem: d.subSystem || '',
    remarks: d.remarks || '',
    serialNo: d.serialNo || '',
    maker: d.maker || '',
    model: d.model || '',
    tagNo: d.tagNo || '',
    assetValue: d.assetValue != null ? d.assetValue : 0,
    acquisitionDate: d.acquisitionDate || '',
    currency: d.currency || '',
    depreciation: d.depreciation != null ? d.depreciation : 0,
    functionCounters: (d.functionCounters || []).map((c) => ({
      id: c.id,
      code: c.code || '',
      description: c.description || '',
      unit: c.unit || '',
      lastValue: c.lastValue != null ? c.lastValue : 0,
    })),
    rotationLog: (d.rotationLog || []).map((r) => ({ ...r })),
  }
}

function toDto(vm) {
  if (!vm) return null
  return {
    id: numId(vm.id),
    functionNo: vm.functionNo || null,
    installation: vm.installation || null,
    department: vm.department || null,
    description: vm.description || null,
    reference: vm.reference || null,
    parentFunctionNo: vm.parentFunctionNo || null,
    status: vm.status || null,
    location: vm.location || null,
    criticality: vm.criticality || null,
    // installedComponentId 由 install/remove 命令维护，不在 applyDto 改写，此处不发送
    sfiCode: vm.sfiCode || null,
    system: vm.system || null,
    subSystem: vm.subSystem || null,
    remarks: vm.remarks || null,
    serialNo: vm.serialNo || null,
    maker: vm.maker || null,
    model: vm.model || null,
    tagNo: vm.tagNo || null,
    assetValue: vm.assetValue != null ? vm.assetValue : null,
    acquisitionDate: vm.acquisitionDate || null,
    currency: vm.currency || null,
    depreciation: vm.depreciation != null ? vm.depreciation : null,
    functionCounters: (vm.functionCounters || []).map((c) => ({
      id: numId(c.id),
      code: c.code || null,
      description: c.description || null,
      unit: c.unit || null,
      lastValue: c.lastValue != null ? c.lastValue : null,
    })),
    // rotationLog 由后端维护，不在保存时发送
  }
}

export const functionService = {
  // ---- 加载 / 同步缓存 ----
  // 从后端拉取当前船的功能位置，原地替换 db.functions（保留尚未落库的本地字符串 id 草稿）
  async loadAll(installation) {
    const inst = installation || store.installation
    const q = inst ? `?installation=${encodeURIComponent(inst)}` : ''
    const list = await apiFetch(`${BASE}${q}`)
    const fromBackend = (list || []).map(fromDto)
    const drafts = db.functions.filter((f) => typeof f.id !== 'number')
    db.functions.length = 0
    fromBackend.forEach((r) => db.functions.push(r))
    drafts.forEach((d) => db.functions.push(d))
    return db.functions.slice()
  },

  // 同步读取（供 computed 派生 / 视图列表源，保持对 db 的响应式追踪）
  listSync() {
    return db.functions
  },

  // 兼容旧调用：返回缓存快照
  async list() {
    return db.functions.slice()
  },

  // 服务端列表过滤：转发 installation/department/status/parentFunctionNo/criticality/q
  async query(filters = {}) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v != null && v !== '') qs.set(k, v)
    }
    const q = qs.toString()
    const list = await apiFetch(`${BASE}${q ? '?' + q : ''}`)
    return (list || []).map(fromDto)
  },

  // 按 functionNo 同步读取（Hierarchy 用，不触发网络）
  get(functionNo) {
    return db.functions.find((f) => f.functionNo === functionNo) || null
  },

  // functionNo → 后端数据库 id（install/remove/changeStatus 需要 id 路径参数）
  _idOf(functionNo) {
    const f = db.functions.find((x) => x.functionNo === functionNo)
    return f && typeof f.id === 'number' ? f.id : null
  },

  // functionNo → function 的映射（供 Hierarchy / Counters 快速查找）
  byNo() {
    return Object.fromEntries(db.functions.map((f) => [f.functionNo, f]))
  },
  // functionNo → location 的映射（供 Work Orders 列表展示）
  locationMap() {
    return Object.fromEntries(db.functions.map((f) => [f.functionNo, f.location]))
  },
  // 顶层功能（无父）——功能位置树的根
  roots() {
    return db.functions.filter((f) => !f.parentFunctionNo)
  },
  // 名称 / 编码片段模糊查找（供 Hierarchy 的 Find 窗口）
  search(text) {
    const s = (text || '').trim().toLowerCase()
    if (!s) return []
    return db.functions.filter((f) => (f.functionNo + ' ' + f.description).toLowerCase().includes(s))
  },

  // ---- 写入（同步更新本地缓存 + fire-and-forget 持久化）----
  // 新建功能位置（Functions Hierarchy 窗口 / Copy Functions）。本地立即入缓存，
  // 再后台 POST 持久化；后端返回后替换为带 id 的正式记录。
  add(fn) {
    const rec = { status: 'In Use', criticality: '', functionCounters: [], rotationLog: [], ...fn }
    if (!rec.installation) rec.installation = store.installation
    if (!rec.department) rec.department = store.department
    db.functions.push(rec)
    const dto = toDto(rec)
    apiFetch(BASE, { method: 'POST', body: dto })
      .then((created) => {
        const vm = fromDto(created)
        const i = db.functions.findIndex((f) => f.id === rec.id || (f.functionNo === rec.functionNo && !f.id))
        if (i >= 0) db.functions[i] = vm
      })
      .catch(() => {})
    return rec
  },

  // 编辑功能位置字段（Hierarchy 用）。同步写入本地缓存并后台 PUT。
  update(functionNo, changes) {
    const fn = this.get(functionNo)
    if (!fn) return null
    Object.assign(fn, changes)
    const id = this._idOf(functionNo)
    if (id != null) {
      const dto = toDto(fn)
      apiFetch(`${BASE}/${id}`, { method: 'PUT', body: dto }).catch(() => {})
    }
    return fn
  },

  // 修改 function 的 location 时，级联更新所有已安装在该 function 上的组件的 location，
  // 并后台 PUT 持久化（手动改 location 时由 BusinessWindow 调用）。
  updateLocation(functionNo, newLocation) {
    const fn = this.get(functionNo)
    if (!fn) return
    fn.location = newLocation
    const id = this._idOf(functionNo)
    if (id != null) {
      const dto = toDto(fn)
      dto.location = newLocation
      apiFetch(`${BASE}/${id}`, { method: 'PUT', body: dto }).catch(() => {})
    }
    // 级联：已安装组件跟随 function 的 location
    if (fn.installedComponentId) {
      const comp = db.components.find((c) => c.number === fn.installedComponentId)
      if (comp) comp.location = newLocation
    }
  },

  // 手册 2 / P38-39 Changing Function Status：
  // 只能对"空的"（未安装组件的）function 设置状态；装有组件的 function 不能改状态。
  // 同步更新本地缓存，并后台 POST change-status 持久化；返回 { ok, updatedIds } 供 UI 同步。
  changeStatus(functionNo, newStatus, { cascadeSubFunctions = false } = {}) {
    const fn = this.get(functionNo)
    if (!fn) return { ok: false, reason: 'not-found' }
    // 手册：不能对当前装有 component 的 function 更改 status
    if (fn.installedComponentId) {
      return { ok: false, reason: 'installed' }
    }
    if (!['In Use', 'Scrapped'].includes(newStatus)) return { ok: false, reason: 'invalid-status' }
    const updatedIds = [fn.id]
    fn.status = newStatus
    if (cascadeSubFunctions) {
      db.functions
        .filter((f) => f.parentFunctionNo === functionNo)
        .forEach((sub) => {
          // 仅对同样为空的 sub-function 生效（装有组件的 sub-function 仍受手册约束，不能改）
          if (!sub.installedComponentId) {
            sub.status = newStatus
            updatedIds.push(sub.id)
          }
        })
    }
    const id = this._idOf(functionNo)
    if (id != null) {
      apiFetch(`${BASE}/${id}/change-status`, {
        method: 'POST',
        body: { newStatus, cascadeSubFunctions },
      })
        .then((res) => {
          ;(res?.updatedIds || []).forEach((iid) => {
            const f = db.functions.find((x) => x.id === iid)
            if (f) f.status = newStatus
          })
        })
        .catch(() => {})
    }
    return { ok: true, updatedIds }
  },

  // ---- 持久化：新建 / 更新 / 删除（BusinessWindow Functions 窗口）----
  // 新建（draft 字符串 id）走 POST；已存在（number id）走 PUT。返回后端正式记录。
  async save(rec) {
    const dto = toDto(rec)
    if (isNew(rec)) {
      dto.installation = rec.installation || store.installation
      dto.department = rec.department || store.department
      const created = await apiFetch(BASE, { method: 'POST', body: dto })
      const vm = fromDto(created)
      const i = db.functions.findIndex((f) => f.id === rec.id)
      if (i >= 0) db.functions[i] = vm
      else db.functions.push(vm)
      return vm
    }
    const id = Number(rec.id)
    const updated = await apiFetch(`${BASE}/${id}`, { method: 'PUT', body: dto })
    const vm = fromDto(updated)
    const i = db.functions.findIndex((f) => String(f.id) === String(rec.id))
    if (i >= 0) db.functions[i] = vm
    else db.functions.push(vm)
    return vm
  },

  // 删除（传入对象或 functionNo）。后端存在则 DELETE 并按 id 移除本地缓存。
  async remove(rec) {
    const fn = typeof rec === 'object' ? rec : this.get(rec)
    if (!fn) return
    const id = typeof fn.id === 'number' ? fn.id : null
    if (id != null) {
      try {
        await apiFetch(`${BASE}/${id}`, { method: 'DELETE' })
      } catch (e) {
        throw e
      }
    }
    const i = db.functions.findIndex((f) => (id != null ? f.id === id : f.functionNo === fn.functionNo))
    if (i >= 0) db.functions.splice(i, 1)
  },

  // ---- 安装 / 拆卸组件（手册 Component Locations）----
  // 安装组件到 function，后端联动维护组件状态与轮次/历史日志；本地同步刷新缓存。
  async installComponent(functionNo, componentNumber, details = '') {
    const id = this._idOf(functionNo)
    if (id == null) throw new Error('功能位置尚未保存，无法安装组件：' + functionNo)
    const updated = await apiFetch(`${BASE}/${id}/install-component`, {
      method: 'POST',
      body: { componentNumber, details },
    })
    const vm = fromDto(updated)
    const i = db.functions.findIndex((f) => f.id === vm.id)
    if (i >= 0) db.functions[i] = vm
    else db.functions.push(vm)
    // 同步组件缓存：后端已把组件 functionNo / status / location 联动更新
    const comp = db.components.find((c) => c.number === componentNumber)
    if (comp) {
      comp.functionNo = vm.functionNo
      comp.status = 'In Use'
      comp.location = vm.location
    }
    return vm
  },

  // 从 function 拆卸当前组件（手册 P42 Removing a Component from a Function）：
  //  - newLocation：组件拆卸后移动到的新 Location
  //  - status：拆卸原因状态（如 Scrapped / Transferred）
  //  - details：拆卸评论
  //  - cascadeSubFunctions：若所选 function 是 parent，勾选后级联拆卸所有 sub-functions 上的组件
  // 返回 { ok, cancelledWorkOrders, deactivatedRoundJobs }（cancelled/deactivated 为本地 best-effort
  // 计算，后端 remove-component 当前不返回这些字段）。
  async removeComponent(functionNo, { newLocation = '', status = '', details = '', cascadeSubFunctions = false } = {}) {
    const id = this._idOf(functionNo)
    if (id == null) throw new Error('功能位置尚未保存，无法拆卸组件：' + functionNo)
    const fnLocal = this.get(functionNo)
    const compNo = fnLocal?.installedComponentId || ''
    const cancelledWorkOrders = []
    const deactivatedRoundJobs = []
    // 本地 best-effort：Scrapped/Transferred 时取消未开始工单并停用轮次作业（保持 UX 提示）
    if (compNo && (status === 'Scrapped' || status === 'Transferred')) {
      const cancelled = await workOrderService.cancelOutstandingForComponent(compNo, { exceptStarted: true })
      cancelledWorkOrders.push(...cancelled)
      db.roundJobs
        .filter((rj) => rj.functionNo === functionNo && rj.componentNo === compNo && rj.status === 'Active')
        .forEach((rj) => {
          rj.status = 'Inactive'
          deactivatedRoundJobs.push(rj.roundCode)
        })
    }
    const updated = await apiFetch(`${BASE}/${id}/remove-component`, {
      method: 'POST',
      body: { newLocation, status, details, cascadeSubFunctions },
    })
    const vm = fromDto(updated)
    const i = db.functions.findIndex((f) => f.id === vm.id)
    if (i >= 0) db.functions[i] = vm
    else db.functions.push(vm)
    // 同步组件缓存
    const comp = db.components.find((c) => c.number === compNo)
    if (comp) {
      comp.functionNo = ''
      if (newLocation) comp.location = newLocation
      if (status) comp.status = status
    }
    return { ok: true, cancelledWorkOrders, deactivatedRoundJobs }
  },

  // 手册 P40：将 action 形式的 rotationLog 聚合为组件周期视图。
  // 每一行代表一个组件在该功能位置上的“安装 → 拆卸”周期；若仍未拆卸，则 Removed 列为空。
  buildRotationCycles(rotationLog = []) {
    const byNo = Object.fromEntries(db.components.map((c) => [c.number, c]))
    const entries = rotationLog
      .map((r) => ({ ...r, _ts: new Date(r.performedAt || '1970-01-01').getTime() }))
      .sort((a, b) => a._ts - b._ts)
    const groups = {}
    entries.forEach((e) => {
      ;(groups[e.componentNo] = groups[e.componentNo] || []).push(e)
    })
    const cycles = []
    Object.keys(groups).forEach((componentNo) => {
      const list = groups[componentNo]
      const componentName = list[0]?.componentName || byNo[componentNo]?.name || ''
      let installEntry = null
      list.forEach((e) => {
        if (e.action === 'Installed') {
          if (installEntry) {
            cycles.push({
              componentNo,
              componentName,
              installedAt: installEntry.performedAt,
              installedBy: installEntry.performedBy,
              removedAt: '',
              removedBy: '',
              details: installEntry.details || '',
            })
          }
          installEntry = e
        } else if (e.action === 'Removed' && installEntry) {
          cycles.push({
            componentNo,
            componentName,
            installedAt: installEntry.performedAt,
            installedBy: installEntry.performedBy,
            removedAt: e.performedAt,
            removedBy: e.performedBy,
            details: [installEntry.details, e.details].filter(Boolean).join(' / '),
          })
          installEntry = null
        }
      })
      if (installEntry) {
        cycles.push({
          componentNo,
          componentName,
          installedAt: installEntry.performedAt,
          installedBy: installEntry.performedBy,
          removedAt: '',
          removedBy: '',
          details: installEntry.details || '',
        })
      }
    })
    // 最新的周期在前，与手册截图一致
    return cycles.sort((a, b) => new Date(b.installedAt || '1970-01-01').getTime() - new Date(a.installedAt || '1970-01-01').getTime())
  },
}
