import { reactive } from 'vue'
import { AMOS_PAGES } from './data/amosData.js'

export const store = reactive({
  installation: 'Traveller',
  department: 'Engine Room',
  user: 'Fred',
  synced: true,
  openTabs: [],        // [{ pageKey, title }]
  activeKey: null,
  globalDialog: null,  // 'switch-department' | 'about' | 'select-view' | 'change-password' | 'options'
  globalMessage: '',
  toast: null,
  // ===== Options（对应手册 1.2） =====
  options: {
    showShortcut: true,      // Task bar：显示左侧工具栏
    shortcutMode: 'list',    // 'icon' = Icon bar，'list' = List bar
    confirmExit: false,      // General：退出时确认
    windowingMode: 'Cascade',// General：窗口模式 Maximized / Cascade
    checkInterval: 60,       // General：Mailbox/Dashboard 刷新间隔(秒)
    enableDashboard: true,   // Dashboard：启用仪表盘
    selectedAlerts: [],      // Dashboard：已选 Alerts
    showGauge: true,         // Dashboard：显示告警表盘（Gauge）
    showWorkflowNotification: true, // Dashboard：显示工作流通知区
    dashboardUrl: '',        // Dashboard：主页引入 URL（右下角网页）
    dashboardImage: '',      // Dashboard：左上角图片（如 Logo）
    themeEnabled: false,     // Theme：启用主题
    views: [],               // Views：自定义界面（Private）
    defaultView: '',         // Views：默认界面
    startupWithView: false,  // Views：启动时进入 View
    predefinedFields: [],    // Predefined Fields：自定义字段
    predefinedFilters: [],   // Predefined Filter：自定义过滤
    // 手册 Component Archives：组件从其他部门转入时，是否生成 archive 档案
    createComponentArchiveOnTransferIn: true,
  },
  presetFilter: null,    // 双击 Dashboard 告警时设定的预过滤
  // 回跳上下文：从某窗口 View 跳出后，切回时用于恢复选中状态与 tab 定位
  returnContext: null,    // { sourceWindow, typeNumber?, targetId? }
  // 手册 Component Archives：Options > Archive 打开的档案视图上下文
  archiveComponentNo: '',
  archiveKind: '',
  // 手册 2 / P36 脚注：系统参数 Use Component Types（默认 TRUE，启用 Component Type 功能）
  useComponentTypes: true,
  // 手册 P44：Components 窗口 Counters 标签 Update 按钮 → 打开 Update Counters 并预填当前组件
  presetCounterComponent: '',
})

let toastTimer = null
export function showToast(msg, tone = 'info') {
  store.toast = { msg, tone }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (store.toast = null), 2200)
}

export function openWindow(pageKey) {
  if (!AMOS_PAGES.some((p) => p.key === pageKey)) return
  const existing = store.openTabs.find((t) => t.pageKey === pageKey)
  if (!existing) {
    const page = AMOS_PAGES.find((p) => p.key === pageKey)
    store.openTabs.push({ pageKey, title: page.title })
  }
  store.activeKey = pageKey
}

export function closeTab(pageKey) {
  const i = store.openTabs.findIndex((t) => t.pageKey === pageKey)
  if (i < 0) return
  store.openTabs.splice(i, 1)
  if (store.activeKey === pageKey) {
    store.activeKey = store.openTabs.length ? store.openTabs[Math.max(0, i - 1)].pageKey : null
  }
}

export function setActive(pageKey) {
  store.activeKey = pageKey
}

export function showDialog(name) {
  store.globalDialog = name
}
export function closeDialog() {
  store.globalDialog = null
}

export function setPresetFilter(filter) {
  store.presetFilter = filter || null
}

export function setInstallation(code) {
  store.installation = code
  const dept = DEPARTMENTS_BY_INSTALLATION[code]
  if (dept && dept.length) store.department = dept[0]
}
export function setDepartment(code) {
  store.department = code
}

// 手册 P20（Installations and Departments）：department 是工作范围(scope)。
// 带 department 标签的记录必须匹配当前 department 才显示；无标签（类型/模板/作业）始终显示。
// 同时按当前船（Installation）过滤：带 installation 字段的记录（functions / components）仅显示当前船。
export function scopeByDepartment(rows) {
  const dept = store.department
  const inst = store.installation
  return rows.filter((r) => {
    if (dept && r.department && r.department !== dept) return false
    if (inst && r.installation && r.installation !== inst) return false
    return true
  })
}

// 延迟引入，避免循环依赖
import { DEPARTMENTS_BY_INSTALLATION } from './data/amosData.js'
