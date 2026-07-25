// ============================================================
// Budget Service —— 预算（Budget / Budget Group）领域的数据访问 / 业务逻辑层
// ------------------------------------------------------------
// 与 componentService 同构：视图层只调用本 service，后续接真实后端时
// 仅替换方法体（fetch/axios），方法签名保持不变。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
//   * 写入方法异步（模拟后端事务）
// ============================================================

import { db, uid } from '../mock/index.js'

export const budgetService = {
  // ---- 读取 ----
  list() {
    return db.budgets
  },
  get(id) {
    return db.budgets.find((b) => b.id === id) || null
  },
  // 手册 5：Breakdown —— 某预算关联的所有凭证（按 budgetCode 匹配）
  vouchersOf(code) {
    if (!code) return []
    return db.vouchers.filter((v) => (v.formNos || []).length && v.budgetCode === code)
  },
  // 手册 5：Hierarchy —— 按 groupCode 聚合的预算组（累计 Committed / Paid / Limit）
  accumulatedGroups() {
    const map = {}
    db.budgets.forEach((b) => {
      map[b.groupCode] = map[b.groupCode] || { code: b.groupCode, committed: 0, paid: 0, limit: 0, children: [] }
      map[b.groupCode].committed += b.committed
      map[b.groupCode].paid += b.paid
      map[b.groupCode].limit += b.limit
      map[b.groupCode].children.push(b)
    })
    return Object.values(map)
  },
  // Dashboard KPI：整体预算占用率（已承诺 / 上限，四舍五入为百分比）
  usagePercent() {
    const committed = db.budgets.reduce((s, b) => s + b.committed, 0)
    const limit = db.budgets.reduce((s, b) => s + b.limit, 0)
    return limit ? Math.round((committed / limit) * 100) : 0
  },

  // ---- 写入 ----
  async create(data = {}) {
    const rec = {
      id: uid('bg'),
      code: data.code || 'BG-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      title: data.title || 'New Budget',
      groupCode: data.groupCode || 'FIN',
      class: data.class || 'Purchase',
      model: data.model || 'Manual',
      status: data.status || 'Preliminary',
      access: data.access || 'Open',
      warning: data.warning ?? 80,
      limit: data.limit ?? 100000,
      committed: data.committed ?? 0,
      paid: data.paid ?? 0,
      forecast: data.forecast ?? 0,
    }
    db.budgets.push(rec)
    return rec
  },
}
