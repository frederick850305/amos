import { AMOS_PAGES } from '../data/amosData.js'
import DashboardView from '../views/DashboardView.vue'
import ComponentsView from '../views/ComponentsView.vue'
import ComponentTypesView from '../views/ComponentTypesView.vue'
import ComponentsHierarchyView from '../views/ComponentsHierarchyView.vue'
import FunctionsHierarchyView from '../views/FunctionsHierarchyView.vue'
import CountersOverviewView from '../views/CountersOverviewView.vue'
import WorkOrdersView from '../views/WorkOrdersView.vue'
import StockItemsView from '../views/StockItemsView.vue'
import StockWantedView from '../views/StockWantedView.vue'
import PurchaseFormsView from '../views/PurchaseFormsView.vue'
import QuotationComparisonView from '../views/QuotationComparisonView.vue'
import BudgetsView from '../views/BudgetsView.vue'
import VouchersView from '../views/VouchersView.vue'
import OptionsView from '../views/OptionsView.vue'
import GlobalSearchView from '../views/GlobalSearchView.vue'
import WorkflowNotificationsView from '../views/WorkflowNotificationsView.vue'
import ComponentStatusLogView from '../views/ComponentStatusLogView.vue'
import ComponentArchiveView from '../views/ComponentArchiveView.vue'
import GenericWindowView from '../views/GenericWindowView.vue'

// 专用页面（重点实现）
const specialized = {
  dashboard: DashboardView,
  components: ComponentsView,
  'component-types': ComponentTypesView,
  'components-hierarchy': ComponentsHierarchyView,
  'functions-hierarchy': FunctionsHierarchyView,
  'counters-overview': CountersOverviewView,
  'work-orders': WorkOrdersView,
  'stock-items': StockItemsView,
  wanted: StockWantedView,
  forms: PurchaseFormsView,
  'quotation-comparison': QuotationComparisonView,
  budgets: BudgetsView,
  vouchers: VouchersView,
  options: OptionsView,
  'global-search': GlobalSearchView,
  'workflow-notifications': WorkflowNotificationsView,
  'component-status-log': ComponentStatusLogView,
  'component-archive': ComponentArchiveView,
}

// 其余页面统一走通用业务窗口（Filter + 列表 + 明细标签页）
export const pageComponents = Object.fromEntries(
  AMOS_PAGES.map((p) => [p.key, specialized[p.key] || GenericWindowView]),
)
