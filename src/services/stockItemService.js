// ============================================================
// Stock Item Service —— 库存项（Stock Items / Parts）领域的数据访问 / 业务逻辑层
// ------------------------------------------------------------
// 与 componentService 同构：视图层只调用本 service，后续接真实后端时
// 仅替换方法体（fetch/axios），方法签名保持不变。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
//   * 写入方法异步（模拟后端事务）
// ============================================================

import { db, uid } from '../mock/index.js'

export const stockItemService = {
  // ---- 读取 ----
  list() {
    return db.stockItems
  },
  get(id) {
    return db.stockItems.find((s) => s.id === id) || null
  },
  // 手册 2.3(6)：Outstanding Forms（该备件相关、仍在进行中的申请单 / 采购单）
  relatedForms(item) {
    if (!item) return []
    const tno = item.stockTypeNo
    const out = []
    db.purchaseForms.forEach((f) =>
      f.lineItems.forEach((li) => {
        if (li.partNo === tno) out.push({ formNo: f.formNo, type: f.type, status: f.status, quantity: li.quantity, vendor: f.vendor })
      }),
    )
    return out
  },
  // 手册 2.3(7)：Stock Transactions
  relatedTransactions(item) {
    return !item ? [] : db.transactions.filter((t) => t.stockItem === item.stockItemNo)
  },
  // 手册 2.3(8)：Component（按功能位置匹配使用该材料的设备 / 部件）
  relatedComponents(item) {
    return !item ? [] : db.components.filter((c) => c.functionNo && c.functionNo === item.functionNo)
  },
  // 按功能位置匹配库存项（供 Components 明细 Parts 标签）
  byFunction(functionNo) {
    return !functionNo ? [] : db.stockItems.filter((s) => s.functionNo && s.functionNo === functionNo)
  },
  // 指定 stockType 是否已在某地点登记（供 Register as Component 的 Auto-Register Stock 去重）
  existsAt(stockTypeNo, location) {
    return db.stockItems.some((s) => s.stockTypeNo === stockTypeNo && s.location === location)
  },

  // ---- 写入 ----
  async create(data) {
    const item = { id: uid('si'), ...data }
    db.stockItems.push(item)
    return item
  },
  // 手册 2.3：Move 生成两条事务——来源 Transferred Out、目的 Transferred In
  async move(id, toLocation, qty) {
    const item = db.stockItems.find((s) => s.id === id)
    if (!item) return null
    const tno = 'TX-' + Math.floor(Math.random() * 9000 + 1000)
    const date = new Date().toISOString().slice(0, 10)
    db.transactions.push({ id: uid('tx'), transactionNo: tno + 'A', type: 'Transferred Out', stockItem: item.stockItemNo, quantity: qty, fromLocation: item.location, toLocation, date, reference: 'MV' })
    db.transactions.push({ id: uid('tx'), transactionNo: tno + 'B', type: 'Transferred In', stockItem: item.stockItemNo, quantity: qty, fromLocation: item.location, toLocation, date, reference: 'MV' })
    item.location = toLocation
    return item
  },
  async setStatus(id, status) {
    const item = db.stockItems.find((s) => s.id === id)
    if (!item) return null
    item.status = status
    return item
  },
}
