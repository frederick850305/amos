// ============================================================
// Stock Type Service —— 库存类型（Stock Types / Part Master）领域的数据访问层
// ------------------------------------------------------------
// 与既有 service 同构：视图层只调用本 service。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
// Stock Type 在原型内主要作为主数据被 Stock Items / 组件注册引用，
// 暂以只读访问为主。
// ============================================================

import { db } from '../mock/index.js'

export const stockTypeService = {
  // ---- 读取 ----
  list() {
    return db.stockTypes
  },
  get(stockTypeNo) {
    return db.stockTypes.find((s) => s.stockTypeNo === stockTypeNo) || null
  },
  // stockTypeNo → stockType 的映射（供 Stock Items 明细快速查找）
  byNo() {
    return Object.fromEntries(db.stockTypes.map((s) => [s.stockTypeNo, s]))
  },
}
