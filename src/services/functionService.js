// ============================================================
// Function Service —— 功能位置（Functions / SFI）领域的数据访问层
// ------------------------------------------------------------
// 与既有 service 同构：视图层只调用本 service，后续接真实后端时
// 仅替换方法体（fetch/axios），方法签名保持不变。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
// 功能位置在原型内多为只读展示（Hierarchy / Counters / Work Orders 派生），
// 暂不提供写入方法；后续如需增删改再补齐。
// ============================================================

import { db } from '../mock/index.js'
import { componentService } from './componentService.js'
import { workOrderService } from './workOrderService.js'

export const functionService = {
  // ---- 读取 ----
  list() {
    return db.functions
  },
  get(functionNo) {
    return db.functions.find((f) => f.functionNo === functionNo) || null
  },
  // 手册 Working with Functions：新建功能位置（Functions / Functions Hierarchy 窗口 New）
  add(fn) {
    const rec = { status: 'In Use', criticality: 'Medium', functionCounters: [], rotationLog: [], ...fn }
    db.functions.push(rec)
    return rec
  },
  // 手册：编辑功能位置字段（含 Location 级联、Parent 层级等由 BusinessWindow 处理）
  update(functionNo, changes) {
    const fn = this.get(functionNo)
    if (!fn) return null
    Object.assign(fn, changes)
    return fn
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
  // ---- 写入（手册 Component Locations）----
  // 修改 function 的 location 时，级联更新所有已安装在该 function 上的组件的 location。
  updateLocation(functionNo, newLocation) {
    db.components
      .filter((c) => c.functionNo === functionNo)
      .forEach((c) => { c.location = newLocation })
  },
// 手册 Component Locations（Functions 窗口 Options > Install / Remove Component）：
// 安装组件到 function，双向同步 function.installedComponentId 与组件的 functionNo。
// 一个 function 仅允许安装一个组件：若已装其他组件，先将其拆卸。
// details：安装时登记的评论（手册 P40 step 4 "Add any Details"），写入 Rotation Log 供 Notes 查看。
async installComponent(functionNo, componentNumber, details = '') {
  const fn = db.functions.find((f) => f.functionNo === functionNo)
  if (!fn) return null
  if (fn.installedComponentId && fn.installedComponentId !== componentNumber) {
    const prev = db.components.find((c) => c.number === fn.installedComponentId)
    if (prev) await componentService.setFunction(prev.id, '')
  }
  fn.installedComponentId = componentNumber
  const comp = db.components.find((c) => c.number === componentNumber)
  if (!comp) return null
  const res = await componentService.setFunction(comp.id, functionNo)
  // 手册 Working with Functions：Rotation Log 记录组件安装 / 拆卸历史（含 Details 评论）
  fn.rotationLog = fn.rotationLog || []
  fn.rotationLog.push({
    componentNo: comp.number,
    componentName: comp.name || '',
    action: 'Installed',
    performedBy: 'A. Admin',
    performedAt: new Date().toISOString().slice(0, 10),
    details: details || '',
  })
  return res
},
  // 从 function 拆卸当前组件（手册 P42 Removing a Component from a Function）：
  //  - newLocation：组件拆卸后移动到的新 Location（手册 "Select a New Location ... This updates the Location field"）
  //  - status：拆卸原因状态（如 Scrapped / Transferred），手册 "Select a Status ... indicates a reason for the removal"
  //  - details：拆卸评论，写入 Rotation Log 供 Notes 查看
  //  - cascadeSubFunctions：若所选 function 是 parent，勾选后级联拆卸所有 sub-functions 上的组件
  // 返回 { removedIds, cancelledWorkOrders, deactivatedRoundJobs }：
  //   removedIds          被拆卸的 function id 列表（含级联）
  //   cancelledWorkOrders 因 Scrapped/Transferred 被取消的工单编号（手册 P42）
  //   deactivatedRoundJobs 因组件移出而停用的轮次作业编号（手册 P42 Note）
  async removeComponent(functionNo, { newLocation = '', status = '', details = '', cascadeSubFunctions = false } = {}) {
    const fn = db.functions.find((f) => f.functionNo === functionNo)
    if (!fn || !fn.installedComponentId) return null
    const removedIds = []
    const cancelledWorkOrders = []
    const deactivatedRoundJobs = []
    const detach = async (target) => {
      const comp = db.components.find((c) => c.number === target.installedComponentId)
      const compNo = comp ? comp.number : ''
      target.installedComponentId = ''
      if (comp) {
        // 先清空 functionNo（setFunction 会同步清空 location 并记录历史）
        await componentService.setFunction(comp.id, '')
        // 手册：拆卸后组件移动到 New Location；并设置移除原因状态
        if (newLocation) comp.location = newLocation
        if (status) comp.status = status
      }
      target.rotationLog = target.rotationLog || []
      target.rotationLog.push({
        componentNo: compNo,
        componentName: comp ? comp.name : '',
        action: 'Removed',
        performedBy: 'A. Admin',
        performedAt: new Date().toISOString().slice(0, 10),
        details: details || '',
        newLocation: newLocation || '',
        status: status || '',
      })
      removedIds.push(target.id)
      // 手册 P42：Scrapped / Transferred 时取消该组件全部未开始工单（已上报开始者除外）
      if (status === 'Scrapped' || status === 'Transferred') {
        const cancelled = await workOrderService.cancelOutstandingForComponent(compNo, { exceptStarted: true })
        cancelledWorkOrders.push(...cancelled)
        // 手册 P42 Note：依赖该 function + component 的轮次作业随组件移出而停用
        db.roundJobs
          .filter((rj) => rj.functionNo === target.functionNo && rj.componentNo === compNo && rj.status === 'Active')
          .forEach((rj) => { rj.status = 'Inactive'; deactivatedRoundJobs.push(rj.roundCode) })
      }
    }
    await detach(fn)
    if (cascadeSubFunctions) {
      for (const sub of db.functions.filter((s) => s.parentFunctionNo === functionNo && s.installedComponentId)) {
        await detach(sub)
      }
    }
    return { removedIds, cancelledWorkOrders, deactivatedRoundJobs }
  },
  // 手册 P40：将 action 形式的 rotationLog 聚合为组件周期视图。
  // 每一行代表一个组件在该功能位置上的“安装 → 拆卸”周期；若仍未拆卸，则 Removed 列为空。
  buildRotationCycles(rotationLog = []) {
    const byNo = componentService.byNo()
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
          // 若存在未闭合的安装周期，先作为“当前仍安装”输出
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
  // 手册 2 / P38-39 Changing Function Status：
  // 只能对"空的"（未安装组件的）function 设置状态；装有组件的 function 不能改状态。
  // 若所选 function 有 sub-functions，勾选 cascadeSubFunctions 时把全部 sub-functions
  // 也设为相同的新状态（手册："Change status of sub-functions also"）。
  changeStatus(functionNo, newStatus, { cascadeSubFunctions = false } = {}) {
    const fn = db.functions.find((f) => f.functionNo === functionNo)
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
    return { ok: true, updatedIds }
  },
}
