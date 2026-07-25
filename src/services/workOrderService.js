// ============================================================
// Work Order Service —— 工单（Work Orders）领域的数据访问 / 业务逻辑层
// ------------------------------------------------------------
// 与 componentService 同构：视图层只调用本 service，后续接真实后端时
// 仅替换方法体（fetch/axios），方法签名保持不变。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
//   * 写入方法异步（模拟后端事务）
// ============================================================

import { db, uid } from '../mock/index.js'

// 手册 4：Work Orders 状态流
export const WORK_ORDER_FLOW = ['Requested', 'Planned', 'Issued', 'Completed']
// 手册 4：删除限制 —— 仅初始状态(Requested)可物理删除；其余应走 Cancel 流程
const DELETABLE_STATUSES = ['Requested']

export const workOrderService = {
  // ---- 读取 ----
  list() {
    return db.workOrders
  },
  get(id) {
    return db.workOrders.find((w) => w.id === id) || null
  },
  // 某组件关联的工单（供 Components 明细 Work Order / History 标签）
  byComponent(componentNo) {
    return db.workOrders.filter((w) => w.componentId === componentNo)
  },
  // Dashboard KPI：逾期工单数（status === 'Overdue'）
  overdueCount() {
    return db.workOrders.filter((w) => w.status === 'Overdue').length
  },
  // Dashboard KPI：进行中工单数（Requested / Planned / Issued）
  openCount() {
    return db.workOrders.filter((w) => ['Requested', 'Planned', 'Issued'].includes(w.status)).length
  },

  // ---- 写入 ----
  async create(data) {
    const wo = { id: uid('wo'), ...data }
    db.workOrders.push(wo)
    return wo
  },
  async setStatus(id, status) {
    const wo = db.workOrders.find((w) => w.id === id)
    if (!wo) return null
    wo.status = status
    return wo
  },
  // Issue / Advance：沿状态流推进到下一状态（终态 Completed 不再前进）
  async advance(id) {
    const wo = db.workOrders.find((w) => w.id === id)
    if (!wo) return null
    const i = WORK_ORDER_FLOW.indexOf(wo.status)
    if (i >= 0 && i < WORK_ORDER_FLOW.length - 1) wo.status = WORK_ORDER_FLOW[i + 1]
    return wo
  },
  // 删除：仅初始状态可物理删除，否则返回 { ok:false, reason:'status', status }
  async remove(id) {
    const wo = db.workOrders.find((w) => w.id === id)
    if (!wo) return { ok: false, reason: 'notfound' }
    if (!DELETABLE_STATUSES.includes(wo.status)) return { ok: false, reason: 'status', status: wo.status }
    const i = db.workOrders.indexOf(wo)
    if (i >= 0) db.workOrders.splice(i, 1)
    return { ok: true }
  },
  // 手册 P42 Removing a Component from a Function：
  // 若拆卸时组件被置为 Scrapped / Transferred，所有未开始（outstanding）的工单都会被取消，
  // 但“已上报开始（Started）”的工单例外——这些工单仍可继续上报直至 Completed。
  // 返回被取消的工单编号列表（供 UI 提示）。
  async cancelOutstandingForComponent(componentNo, { exceptStarted = true } = {}) {
    const cancelled = []
    db.workOrders.forEach((w) => {
      if (w.componentId !== componentNo) return
      if (['Completed', 'Cancelled'].includes(w.status)) return
      if (exceptStarted && w.status === 'Started') return
      w.status = 'Cancelled'
      cancelled.push(w.workOrderNo)
    })
    return cancelled
  },
}
