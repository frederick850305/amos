// ============================================================
// Collection Service —— 通用集合访问层（按 dataKey 动态定位 db 集合）
// ------------------------------------------------------------
// 用途：BusinessWindow / RecordDetail 这类「通用容器」组件按配置里的
// dataKey（如 'jobs' / 'workOrders' / 'stockItems' …）动态操作对应集合，
// 无法在编译期绑定到某个具体的领域 service。本 service 提供一个统一入口，
// 让这些组件不再直接 import db，而是通过 dataKey 读写集合。
//
// 与领域 service 的关系：
//   * 领域 service（componentService 等）承载各自的业务规则，是首选；
//   * 本 service 仅做「按键访问集合」的基础能力，供动态容器兜底使用。
//
// 后续接真实后端时：把 collection() 换成对应资源的 GET，push/removeBy
// 换成 POST/DELETE 即可，dataKey → endpoint 的映射在此集中维护。
// ============================================================

import { db } from '../mock/index.js'

// dataKey 白名单：仅允许访问已知业务集合，避免误用任意键
const KNOWN_KEYS = new Set([
  'componentTypes', 'components', 'componentStatusLog', 'functions', 'jobs',
  'workOrders', 'stockTypes', 'stockItems', 'stockWanted', 'transactions',
  // 手册 P181：Stock Type 的 Makers / Vendors / Grades 可编辑子表集合
  'stockTypeMakers', 'stockTypeVendors', 'stockGrades',
  'transferDocs', 'purchaseForms', 'quotations', 'deliveries', 'transportDocs',
  'qualityChecks', 'contracts', 'budgets', 'vouchers', 'counterLogs',
  'measureLogs', 'projects', 'maintenanceLog', 'jobDescriptions',
  // 手册 P44-46：Function Criticality 注册表（degree 列表 + 颜色编码指示器）
  'functionCriticalities',
])

export const collectionService = {
  // ---- 读取：返回集合原数组（保持响应式；找不到时返回空数组） ----
  collection(dataKey) {
    if (!dataKey || !KNOWN_KEYS.has(dataKey)) return []
    return db[dataKey] || []
  },

  // ---- 写入：向集合追加一条记录 ----
  push(dataKey, record) {
    const arr = this.collection(dataKey)
    arr.push(record)
    return record
  },

  // ---- 删除：按谓词从集合移除首个匹配项，返回是否删除 ----
  removeBy(dataKey, predicate) {
    const arr = this.collection(dataKey)
    const i = arr.findIndex(predicate)
    if (i >= 0) { arr.splice(i, 1); return true }
    return false
  },
}
