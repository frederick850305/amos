// ============================================================
// Register Service —— 对接 amos-server Registers 模块（PR #7）
// 10 个 register 的统一 GET/POST/PUT/DELETE 封装；字段命名以后端为准。
//
// 后端实体字段（POST/PUT 负载）：
//   makers:         {code, name, status(ACTIVE/INACTIVE), remarks}
//   vendors:        {vendorNo, name, country, currency, paymentTerms, status, remarks}  // 注意键是 vendorNo 非 code
//   locations:      {code, name, locationType, status, remarks}
//   function-criticalities: {degree, description, color, sortOrder, active(boolean)}
//   units / job-classes / trades / disciplines / budget-codes: {code, name, [description/parentBudgetCode], status}
//   currencies:     {code, name, symbol, status}
// ============================================================

import apiFetch from './api.js'

// 前端页 key（与 amosData.js / registerRegistry 一致）→ 后端路由 path（单一事实来源）
const PATHS = {
  'makers': 'makers',
  'vendors': 'vendors',
  'function-criticalities': 'function-criticalities',
  'locations': 'locations',
  'units': 'units',
  'currencies': 'currencies',
  'job-classes': 'job-classes',
  'trades': 'trades',
  'disciplines': 'disciplines',
  'budget-codes': 'budget-codes',
}

const reg = (path, opts) => apiFetch('/register/' + path, opts)

// 列表（GET 全量；数据量小，前端负责搜索/过滤）
export function list(key) {
  return reg(PATHS[key])
}
// 新建（POST）；payload 不应含 id（后端生成）
export function create(key, payload) {
  return reg(PATHS[key], { method: 'POST', body: payload })
}
// 更新（PUT /{id}）
export function update(key, id, payload) {
  return reg(PATHS[key] + '/' + id, { method: 'PUT', body: payload })
}
// 软删（DELETE /{id} → 后端置 INACTIVE / active=false）
export function remove(key, id) {
  return reg(PATHS[key] + '/' + id, { method: 'DELETE' })
}

// 兼容既有调用（session.loadRegisterLookups 按命名取值）
export const registerService = {
  makers: () => list('makers'),
  vendors: () => list('vendors'),
  functionCriticalities: () => list('function-criticalities'),
  locations: () => list('locations'),
  units: () => list('units'),
  currencies: () => list('currencies'),
  jobClasses: () => list('job-classes'),
  trades: () => list('trades'),
  disciplines: () => list('disciplines'),
  budgetCodes: () => list('budget-codes'),
  // 通用 CRUD（供通用 Register 管理窗口 RegisterWindow.vue 使用）
  list,
  create,
  update,
  remove,
}

export default registerService
