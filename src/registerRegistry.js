// ============================================================
// Register 管理窗口配置注册表（驱动 RegisterWindow.vue）
// ------------------------------------------------------------
// 每个 register 描述：窗口标题、业务主键字段、状态字段与类型、
// 列表列、明细编辑字段。字段定义复用于 RecordDetail 的渲染
// （支持 text / select / textarea / color / checkbox / number / readonly）。
//
// statusKind:
//   'string'  → 状态为 "ACTIVE" / "INACTIVE"（默认值 ACTIVE）
//   'boolean' → 状态为布尔（active 字段，默认值 true）
// ============================================================

export const registerRegistry = {
  // 手册：合格制造商（Address Register）
  makers: {
    windowTitle: 'Makers',
    codeField: 'code',
    statusField: 'status',
    statusKind: 'string',
    columns: [
      { key: 'code', label: 'Code', width: '120px' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
      { key: 'remarks', label: 'Remarks' },
    ],
    detailFields: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
      { key: 'remarks', label: 'Remarks', type: 'textarea' },
    ],
  },

  // 手册：合格供应商（Address Register）；注意主键字段是 vendorNo 而非 code
  vendors: {
    windowTitle: 'Vendors',
    codeField: 'vendorNo',
    statusField: 'status',
    statusKind: 'string',
    columns: [
      { key: 'vendorNo', label: 'Vendor No.', width: '120px' },
      { key: 'name', label: 'Name' },
      { key: 'country', label: 'Country', width: '110px' },
      { key: 'currency', label: 'Currency', width: '90px' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailFields: [
      { key: 'vendorNo', label: 'Vendor No.' },
      { key: 'name', label: 'Name' },
      { key: 'country', label: 'Country' },
      { key: 'currency', label: 'Currency' },
      { key: 'paymentTerms', label: 'Payment Terms' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
      { key: 'remarks', label: 'Remarks', type: 'textarea' },
    ],
  },

  // 手册 Working with Functions：Location 地点主数据（installation 作用域 + 自引用层级）
  locations: {
    windowTitle: 'Locations',
    codeField: 'code',
    statusField: 'status',
    statusKind: 'string',
    columns: [
      { key: 'code', label: 'Code', width: '120px' },
      { key: 'name', label: 'Name' },
      { key: 'locationType', label: 'Type', width: '110px' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailFields: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'locationType', label: 'Location Type' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
      { key: 'remarks', label: 'Remarks', type: 'textarea' },
    ],
  },

  // 手册 P44-46：Function Criticality 注册表（degree 列表 + 颜色编码指示器）
  // showAll：参考数据无“删除”概念，仅有 active 状态 —— 列表显示全部记录（失效置灰），
  // 隐藏 Delete 与“显示已停用”开关，改由 Deactivate / Reactivate 切换状态。
  'function-criticalities': {
    windowTitle: 'Function Criticality',
    codeField: 'degree',
    statusField: 'active',
    statusKind: 'boolean',
    showAll: true,
    columns: [
      { key: 'degree', label: 'Degree', width: '120px' },
      { key: 'description', label: 'Description', width: '160px' },
      { key: 'color', label: 'Indicator', width: '100px', color: true },
      { key: 'active', label: 'Active', width: '80px' },
    ],
    detailFields: [
      { key: 'degree', label: 'Degree' },
      { key: 'description', label: 'Description' },
      { key: 'color', label: 'Colour-coded Indicator', type: 'color' },
      { key: 'sortOrder', label: 'Sort Order', type: 'number' },
      { key: 'active', label: 'Active', type: 'checkbox', checkLabel: '启用' },
    ],
  },

  // 手册 Chapter 4 / Stock：Units —— 计量单位
  units: {
    windowTitle: 'Units',
    codeField: 'code',
    statusField: 'status',
    statusKind: 'string',
    columns: [
      { key: 'code', label: 'Code', width: '110px' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailFields: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ],
  },

  // 手册 Chapter 4 / Purchasing：Currencies —— 币种
  currencies: {
    windowTitle: 'Currencies',
    codeField: 'code',
    statusField: 'status',
    statusKind: 'string',
    columns: [
      { key: 'code', label: 'Code', width: '90px' },
      { key: 'name', label: 'Name' },
      { key: 'symbol', label: 'Symbol', width: '80px' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailFields: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'symbol', label: 'Symbol' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ],
  },

  // 手册：Job Classes —— 作业等级
  'job-classes': {
    windowTitle: 'Job Classes',
    codeField: 'code',
    statusField: 'status',
    statusKind: 'string',
    columns: [
      { key: 'code', label: 'Code', width: '110px' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailFields: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ],
  },

  // 手册：Trades —— 工种
  trades: {
    windowTitle: 'Trades',
    codeField: 'code',
    statusField: 'status',
    statusKind: 'string',
    columns: [
      { key: 'code', label: 'Code', width: '110px' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailFields: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ],
  },

  // 手册：Disciplines —— 专业
  disciplines: {
    windowTitle: 'Disciplines',
    codeField: 'code',
    statusField: 'status',
    statusKind: 'string',
    columns: [
      { key: 'code', label: 'Code', width: '110px' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailFields: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ],
  },

  // 手册 Chapter 5：Budget Codes —— 预算代码
  'budget-codes': {
    windowTitle: 'Budget Codes',
    codeField: 'code',
    statusField: 'status',
    statusKind: 'string',
    columns: [
      { key: 'code', label: 'Code', width: '120px' },
      { key: 'name', label: 'Name' },
      { key: 'parentBudgetCode', label: 'Parent', width: '120px' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailFields: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'parentBudgetCode', label: 'Parent Budget Code' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ],
  },
}
