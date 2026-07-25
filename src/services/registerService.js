// ============================================================
// Register Service —— 对接 amos-server Registers 模块（PR #7）
// 10 个 register 的统一 GET 封装；字段命名以后端为准：
//   makers:         {id, code, name, status, remarks}
//   vendors:        {id, vendorNo, name, ...}          // 注意键是 vendorNo 而非 code
//   function-criticalities: {id, degree, description, color, sortOrder, active}
//   locations:      {id, installationId, code, name, parentLocationId, locationType, status, remarks}
//   units / currencies / job-classes / trades / disciplines / budget-codes ...
// ============================================================

import apiFetch from './api.js'

const reg = (path) => apiFetch('/register/' + path)

export const registerService = {
  makers: () => reg('makers'),
  vendors: () => reg('vendors'),
  functionCriticalities: () => reg('function-criticalities'),
  locations: () => reg('locations'),
  units: () => reg('units'),
  currencies: () => reg('currencies'),
  jobClasses: () => reg('job-classes'),
  trades: () => reg('trades'),
  disciplines: () => reg('disciplines'),
  budgetCodes: () => reg('budget-codes'),
}
