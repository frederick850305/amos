// Neusoft M&P 原型系统 - 元数据（安装地点 / 部门 / 菜单 / 页面注册表）

// 三艘船（Installation = 船）。原型以 MV Traveller 为基准扩充，并新增 MV Voyager（集装箱船）、
// MV Endeavour（油轮），以体现船队（Fleet）级的设备与功能位置管理场景。
export const installations = [
  { code: 'Traveller', name: 'MV Traveller（散货船）' },
  { code: 'Voyager', name: 'MV Voyager（集装箱船）' },
  { code: 'Endeavour', name: 'MV Endeavour（油轮）' },
]

// 每艘船拥有独立的部门（工作范围 scope）；同名的部门在不同船上属于不同 Installation。
const SHIP_DEPARTMENTS = ['Engine Room', 'Deck', 'Bridge', 'Cargo', 'Accommodation', 'Electrical', 'Engineering']
export const departments = ['Traveller', 'Voyager', 'Endeavour'].flatMap((inst) =>
  SHIP_DEPARTMENTS.map((code) => ({ installation: inst, code, name: code })),
)

export const DEPARTMENTS_BY_INSTALLATION = departments.reduce((acc, d) => {
  ;(acc[d.installation] = acc[d.installation] || []).push(d.code)
  return acc
}, {})

// ===== 模块分组（左侧快捷栏 + 菜单归属） =====
export const modules = [
  { key: 'maintenance', title: 'Maintenance', label: '维护', icon: 'wrench', defaultPage: 'work-orders' },
  { key: 'stock', title: 'Stock', label: '库存', icon: 'box', defaultPage: 'stock-items' },
  { key: 'purchase', title: 'Purchase', label: '采购', icon: 'cart', defaultPage: 'forms' },
  { key: 'budget', title: 'Budget', label: '预算', icon: 'coin', defaultPage: 'budgets' },
]

// ===== 页面注册表 =====
// [key, title, desc, priority, module]
const pageDefs = {
  dashboard: ['Dashboard', '系统首页：告警、通知与快捷入口', 'P0', 'home'],

  'component-types': ['Component Types', '组件类型模板：作业 / 备件 / 计数器 / 测点', 'P1', 'maintenance'],
  components: ['Components', '实际安装、拆卸、维修、跟踪历史的实体设备', 'P0', 'maintenance'],
  'components-hierarchy': ['Components Hierarchy', '设备 / 部件树状结构（Toggle number 显示 SFI 编码）', 'P0', 'maintenance'],
  functions: ['Functions', '固定功能位置：主机系统、辅助锅炉等', 'P0', 'maintenance'],
  'functions-hierarchy': ['Functions Hierarchy', '固定功能位置树状结构（Toggle number 显示 SFI 编码）', 'P0', 'maintenance'],
  // 手册 P44-46：Function Criticality 注册表（先定义 degree 列表 + 颜色编码指示器，再应用到 Functions / Functions Hierarchy）
  'function-criticalities': ['Function Criticality', '关键性程度注册表：定义 degree 列表与颜色编码指示器', 'P2', 'maintenance'],
  'component-type-jobs': ['Component Type Jobs', '组件类型级别预防性维护作业', 'P1', 'maintenance'],
  'component-jobs': ['Component Jobs', '组件级别维护作业', 'P1', 'maintenance'],
  'job-planning': ['Job Planning', '周期 / 计数器 / 测点 / 触发式调度', 'P1', 'maintenance'],
  rounds: ['Maintenance Rounds', '巡检轮次定义与轮次工单生成', 'P1', 'maintenance'],
  'work-orders': ['Work Orders', '维护任务执行单（Requested→Completed）', 'P0', 'maintenance'],
  'work-planning': ['Work Planning', '批量计划与调整工单', 'P1', 'maintenance'],
  projects: ['Projects', '维护项目与分包、成本归集', 'P1', 'maintenance'],
  'report-work': ['Report Work', '工单执行上报：资源 / 备件 / 历史', 'P0', 'maintenance'],
  'counters-overview': ['Counters Overview', '查看计数器读数（只读：当前值 + 平均值）', 'P2', 'maintenance'],
  'update-counters': ['Update Counters', '更新组件 / 功能计数器读数', 'P2', 'maintenance'],
  'update-measure-points': ['Update Measure Points', '更新测点读数', 'P2', 'maintenance'],
  'maintenance-history': ['Maintenance History', '维修历史记录查阅', 'P2', 'maintenance'],
  'maintenance-log': ['Maintenance Log', '维护日志', 'P2', 'maintenance'],
  'component-status-log': ['Component Status Log', '组件状态变更日志（安装/拆卸/Change Status/Transferred 留痕）', 'P2', 'maintenance'],
  'component-archive': ['Component Archive', '组件档案：从先前部门转入的历史数据（Component/Transfer/Status）', 'P2', 'maintenance'],

  'stock-types': ['Stock Types', '库存物料类型与制造商 / 供应商 / 等级', 'P1', 'stock'],
  'stock-items': ['Stock Items', '具体库存实例与位置 / 状态 / 成本', 'P0', 'stock'],
  wanted: ['Stock Wanted', '计算短缺库存并发起采购', 'P0', 'stock'],
  transactions: ['Stock Transactions', '出入库 / 移动 / 冲销交易', 'P1', 'stock'],
  'transfer-documents': ['Transfer Documents', '跨地点转移单与审批流', 'P1', 'stock'],
  'stock-control': ['Stock Control', '库存控制与盘点', 'P2', 'stock'],

  forms: ['Forms', 'Requisition / Query / Purchase Order 流程', 'P0', 'purchase'],
  quotations: ['Quotations', '询价报价管理', 'P1', 'purchase'],
  'quotation-comparison': ['Quotation Comparison', '多供应商报价矩阵比较', 'P0', 'purchase'],
  deliveries: ['Deliveries', '采购到货登记与收货', 'P1', 'purchase'],
  'transport-documents': ['Transport Documents', '运输单据与中转地点', 'P2', 'purchase'],
  'quality-checks': ['Quality Checks', '质检与索赔', 'P1', 'purchase'],
  contracts: ['Contracts', '采购合同与价格矩阵', 'P1', 'purchase'],
  'custom-clearance-forms': ['Custom Clearance Forms', '清关单据', 'P2', 'purchase'],

  budgets: ['Budget', '预算与预算组层级', 'P0', 'budget'],
  vouchers: ['Vouchers', '发票凭证与成本归集', 'P0', 'budget'],

  options: ['Options', '系统选项与配置', 'P2', 'tools'],
  'global-search': ['Global Search', '跨安装地点 / 部门全局搜索', 'P2', 'tools'],
  'workflow-notifications': ['Workflow Notifications', '工作流通知：待确认列表', 'P2', 'tools'],
}

export const AMOS_PAGES = Object.entries(pageDefs).map(([key, [title, desc, priority, module]]) => ({
  key,
  title,
  desc,
  priority,
  module,
}))

export const prototypeData = {
  productName: 'M&P',
  windowCaption: 'Traveller /Maintenance',
  version: 'Vrs.10.0.30（国产化原型）',
  user: 'A. Admin',
}

// ===== 顶部菜单栏定义 =====
// item: { label, page? } 打开窗口；{ label, action? } 触发动作；{ label, disabled? } 置灰
export const menu = [
  {
    label: 'File',
    items: [
      { label: 'Print', action: 'print' },
      { label: 'Filter…', action: 'filter' },
      { label: 'Switch Department', action: 'switch-department' },
      { label: 'Lock Application', action: 'lock' },
      { label: 'Save', action: 'save' },
      { label: 'Close Window', action: 'close' },
      // 手册 P44-46：File > Open Register > Maintenance > Function Criticality
      { label: 'Open Register', action: 'open-register' },
      { label: 'Exit', action: 'exit' },
    ],
  },
  {
    label: 'Maintenance',
    items: [
      { label: 'Component Types', page: 'component-types' },
      { label: 'Components', page: 'components' },
      { label: 'Components Hierarchy', page: 'components-hierarchy' },
      { label: 'Functions', page: 'functions' },
      { label: 'Functions Hierarchy', page: 'functions-hierarchy' },
      // 手册 P44-46：Function Criticality 注册表入口
      { label: 'Function Criticality', page: 'function-criticalities' },
      { label: 'Component Type Jobs', page: 'component-type-jobs' },
      { label: 'Component Jobs', page: 'component-jobs' },
      { label: 'Job Planning', page: 'job-planning' },
      { label: 'Maintenance Rounds', page: 'rounds' },
      { label: 'Work Orders', page: 'work-orders' },
      { label: 'Work Planning', page: 'work-planning' },
      { label: 'Projects', page: 'projects' },
      { label: 'Counter Overview', page: 'counters-overview' },
      { label: 'Update Counters', page: 'update-counters' },
      { label: 'Update Measure Points', page: 'update-measure-points' },
      { label: 'Report Work', page: 'report-work' },
      { label: 'Maintenance History', page: 'maintenance-history' },
      { label: 'Maintenance Log', page: 'maintenance-log' },
      { label: 'Component Status Log', page: 'component-status-log' },
    ],
  },
  {
    label: 'Stock',
    items: [
      { label: 'Stock Types', page: 'stock-types' },
      { label: 'Stock Items', page: 'stock-items' },
      { label: 'Stock Wanted', page: 'wanted' },
      { label: 'In / Out of Stock', page: 'transactions' },
      { label: 'Stock Control', page: 'stock-control' },
      { label: 'Transfer Documents', page: 'transfer-documents' },
    ],
  },
  {
    label: 'Purchase',
    items: [
      { label: 'Forms', page: 'forms' },
      { label: 'Quotations', page: 'quotations' },
      { label: 'Quotation Comparison', page: 'quotation-comparison' },
      { label: 'Deliveries', page: 'deliveries' },
      { label: 'Transport Documents', page: 'transport-documents' },
      { label: 'Quality Checks', page: 'quality-checks' },
      { label: 'Contracts', page: 'contracts' },
      { label: 'Custom Clearance Forms', page: 'custom-clearance-forms' },
    ],
  },
  {
    label: 'Budget',
    items: [
      { label: 'Budget', page: 'budgets' },
      { label: 'Vouchers', page: 'vouchers' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Options', page: 'options' },
      { label: 'Select View', action: 'select-view' },
      { label: 'Configuration', page: 'options' },
      { label: 'Change Password…', action: 'change-password' },
      { label: 'Global Search', page: 'global-search' },
      { label: 'License Update', action: 'license' },
    ],
  },
  {
    label: 'Window',
    items: [
      { label: 'Cascade', action: 'cascade' },
      { label: 'Maximize', action: 'maximize' },
      { label: 'Open Windows', action: 'open-windows' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'User Guide', action: 'userguide' },
      { label: 'SFI Coding', action: 'sfi-info' },
      { label: 'About', action: 'about' },
    ],
  },
]
