// ============================================================
// Stock Wanted Service —— 库存需求领域的数据访问 / 业务逻辑层
// ------------------------------------------------------------
// 与 componentService 同构：视图层只调用本 service，后续接真实后端时
// 仅替换方法体（fetch/axios），方法签名保持不变。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
//   * 写入方法异步（模拟后端事务）
// ============================================================

import { db, uid } from '../mock/index.js'

export const stockWantedService = {
  // ---- 读取 ----
  list() {
    return db.stockWanted
  },
  // Dashboard KPI：低于重订水平（缺货）的库存项数
  shortageCount() {
    return db.stockWanted.filter((s) => s.currentQty < s.reorderLevel).length
  },

  // ---- 写入 ----
  // 重新计算 Wanted = Max(0, Reorder Level − Current − Outstanding)
  async recalculate() {
    db.stockWanted.forEach((r) => {
      r.wantedQty = Math.max(0, r.reorderLevel - r.currentQty - (r.outstanding || 0))
    })
    return db.stockWanted.slice()
  },
  // 手册 3：由缺货项生成 Requisition 采购申请（写入 purchaseForms）
  async generateRequisitions() {
    const need = db.stockWanted.filter((r) => r.wantedQty > 0)
    if (!need.length) return { ok: false, reason: 'none' }
    const no = 'REQ-' + Math.floor(Math.random() * 9000 + 1000)
    const form = {
      id: uid('pf'),
      formNo: no,
      type: 'Requisition',
      status: 'Draft',
      vendor: '',
      deliveryLocation: 'ER-Store-A',
      contract: '',
      createdDate: new Date().toISOString().slice(0, 10),
      lineItems: need.map((r) => ({ id: uid('li'), partNo: r.stockTypeNo, description: r.description, quantity: r.wantedQty, unitPrice: 0, currency: 'USD' })),
      total: 0,
    }
    db.purchaseForms.unshift(form)
    return { ok: true, formNo: no, count: need.length }
  },
}
