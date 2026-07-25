<template>
  <div class="dash">
    <!-- 手册 1.2：Image 出现在仪表盘左上角（如 Logo） -->
    <img v-if="opt.dashboardImage" :src="opt.dashboardImage" class="dash-logo" alt="dashboard image" />

    <!-- 手册 1.2：Enable Dashboard 关闭时显示提示 -->
    <div v-if="!opt.enableDashboard" class="dash-disabled">
      <p>仪表盘已禁用。请在 Options → Dashboard 中勾选「Enable Dashboard」以重新启用。</p>
      <button class="amos-btn sm primary" @click="openWindow('options')">打开 Options</button>
    </div>

    <template v-else>
    <section class="kpi-grid">
      <div class="kpi" v-for="k in kpis" :key="k.label">
        <span class="kpi-label">{{ k.label }}</span>
        <span class="kpi-num" :class="k.tone">{{ k.value }}</span>
        <span class="kpi-sub">{{ k.sub }}</span>
      </div>
    </section>

    <div class="dash-cols" :class="{ full: !opt.showWorkflowNotification }">
      <!-- 告警概览 -->
      <div class="panel">
        <div class="panel-head">
          <h3>Alerts Overview</h3>
          <div class="row" style="gap:6px">
            <button class="amos-btn sm" :class="{ primary: chartType === 'bar' }" @click="chartType = 'bar'">条形图</button>
            <button class="amos-btn sm" :class="{ primary: chartType === 'pie' }" @click="chartType = 'pie'">饼图</button>
          </div>
        </div>
        <div class="panel-body">
          <div v-if="chartType === 'bar'" class="alert-bars">
            <div v-for="a in alerts" :key="a.name" class="alert-row" :class="{ sel: selectedAlert === a.name }"
                 @dblclick="openAlert(a)" @click="selectedAlert = a.name"
                 @contextmenu.stop.prevent="onAlertCtx($event, a)">
              <span class="alert-name">{{ a.group }} · {{ a.name }}</span>
              <div class="bar-track"><div class="bar-fill" :class="a.tone" :style="{ width: (a.number / maxAlert) * 100 + '%' }" /></div>
              <span class="alert-num">{{ a.number }}</span>
              <!-- 手册 1.2：Gauge 表盘可视化 alert 值 -->
              <span v-if="opt.showGauge" class="gauge" :style="{ background: gaugeGradient(a) }"><b>{{ a.number }}</b></span>
            </div>
          </div>
          <div v-else class="pie-wrap">
            <div class="pie" :style="{ background: pieGradient }" @dblclick="openAlert(selectedAlert || alerts[0])" style="cursor:pointer" />
            <ul class="pie-legend">
              <li v-for="a in alerts" :key="a.name" @dblclick="openAlert(a)" :class="{ sel: selectedAlert === a.name }" @click="selectedAlert = a.name"><i :class="['dot', a.tone]" /> {{ a.name }} <b>({{ a.number }})</b></li>
            </ul>
          </div>
          <p class="hint">双击告警可打开相关业务窗口；右击告警弹出「刷新 / 打开 / 打印」菜单。</p>
        </div>
      </div>

      <!-- 通知：手册 1.2 ShowWorkflowNotification 可隐藏本区域 -->
      <div v-if="opt.showWorkflowNotification" class="panel">
        <div class="panel-head"><h3>Notifications</h3></div>
        <div class="panel-body">
          <div v-for="n in notifications" :key="n.module" class="notif-row" @dblclick="openNotif(n)">
            <span class="notif-mod">{{ n.module }}</span>
            <span class="tag blue">{{ n.number }}</span>
          </div>
          <hr class="sep" />
          <div class="quick-links">
            <button v-for="q in quick" :key="q.key" class="amos-btn sm" @click="openWindow(q.key)">{{ q.label }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 手册 1.2：Webpage 出现在右下角，可切换位置 -->
    <div v-if="opt.dashboardUrl" class="dash-web" :class="webPos">
      <div class="web-bar">
        <span>Web Page</span>
        <span class="web-pos-btns">
          <button class="amos-btn xs" :class="{ primary: webPos === 'right' }" @click="webPos = 'right'" title="右侧竖置">▯</button>
          <button class="amos-btn xs" :class="{ primary: webPos === 'bottom' }" @click="webPos = 'bottom'" title="底部横置">▭</button>
        </span>
      </div>
      <iframe :src="opt.dashboardUrl" class="web-frame" sandbox="allow-same-origin allow-scripts" />
    </div>

    <!-- 右击告警弹出菜单（手册 1.2：Refresh / Open / Print） -->
    <div v-if="ctxMenu" class="ctx-menu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }" @click.stop>
      <div class="ctx-item" @click="ctxRefresh">Refresh</div>
      <div class="ctx-item" @click="ctxOpen">Open</div>
      <div class="ctx-item" @click="ctxPrint">Print</div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { dashboardAlerts, dashboardNotifications } from '../mock/index.js'
import { workOrderService } from '../services/workOrderService.js'
import { stockWantedService } from '../services/stockWantedService.js'
import { purchaseFormService } from '../services/purchaseFormService.js'
import { budgetService } from '../services/budgetService.js'
import { store, openWindow, showToast, setPresetFilter } from '../store.js'

const opt = store.options

// 手册 1.2 Options → Dashboard 区：按 selectedAlerts 过滤告警
const alerts = computed(() => {
  const sel = opt.selectedAlerts
  const list = dashboardAlerts.value
  // 未选中任何 alert 时显示全部；选中后只显示已选的
  return sel && sel.length ? list.filter((a) => sel.includes(a.name)) : list
})
const notifications = dashboardNotifications
const chartType = ref('bar')
const maxAlert = computed(() => Math.max(...alerts.value.map((a) => a.number), 1))
const selectedAlert = ref(null)

// 网页框位置
const webPos = ref('right')

const kpis = computed(() => [
  { label: 'Overdue WO', value: workOrderService.overdueCount() || 1, sub: '逾期工单', tone: 'red' },
  { label: 'Open WO', value: workOrderService.openCount(), sub: '进行中工单', tone: 'blue' },
  { label: 'Stock Shortage', value: stockWantedService.shortageCount(), sub: '低于重订水平', tone: 'orange' },
  { label: 'Open Requisitions', value: purchaseFormService.openRequisitionCount(), sub: '待处理申请', tone: 'blue' },
  { label: 'Budget Used', value: budgetService.usagePercent() + '%', sub: '预算占用', tone: 'violet' },
])
const quick = [
  { key: 'work-orders', label: 'Work Orders' },
  { key: 'components', label: 'Components' },
  { key: 'wanted', label: 'Stock Wanted' },
  { key: 'forms', label: 'Purchase Forms' },
  { key: 'budgets', label: 'Budget' },
]

const colors = { red: '#d64b54', blue: '#1e6fd9', orange: '#e8853a', green: '#1f9d63', violet: '#8b5cf6' }
const pieGradient = computed(() => {
  const list = alerts.value
  let acc = 0
  const segs = list.map((a) => {
    const start = acc
    const frac = a.number / list.reduce((s, x) => s + x.number, 0)
    acc += frac * 360
    return `${colors[a.tone]} ${start}deg ${acc}deg`
  })
  return `conic-gradient(${segs.join(',')})`
})

// 手册 1.2：Gauge —— 半圆表盘，按 number/maxAlert 比例填充，中心显示数值
function gaugeGradient(a) {
  const frac = a.number / maxAlert.value
  const deg = Math.min(frac, 1) * 180
  return `conic-gradient(var(--amos-blue) 0deg ${deg}deg, #e6ebf1 ${deg}deg 180deg, transparent 180deg 360deg)`
}

function openAlert(a) {
  const map = { Maintenance: 'work-orders', Purchase: 'forms', Stock: 'wanted', Budget: 'budgets' }
  let target = map[a.group] || 'dashboard'
  // 手册 1.5：报价类告警应跳到 Quotations 窗口
  if (a.group === 'Purchase' && /Quotation/.test(a.name)) target = 'quotations'
  // 双击告警直接打开已过滤的列表（手册 1.5：如逾期工单）
  let preset = null
  if (target === 'work-orders') {
    if (/Overdue/.test(a.name)) preset = { planning: 'Overdue' }
    else if (/This Week/.test(a.name)) preset = { planning: 'Due This Week' }
    else if (/Planned/.test(a.name)) preset = { planning: 'Due Now' }
  }
  if (preset) setPresetFilter(preset)
  showToast(`打开 ${a.group} 窗口：${a.name}`, 'info')
  openWindow(target)
}
// 手册 1.2：双击通知模块 → 直接打开 WorkFlow Notifications 窗口
function openNotif(n) {
  setPresetFilter({ module: n.module })
  showToast(`打开 Workflow Notifications：${n.module}`, 'info')
  openWindow('workflow-notifications')
}

// ===== 右击菜单：Refresh / Open / Print =====
const ctxMenu = ref(null)
const ctxTarget = ref(null)
function onAlertCtx(e, a) {
  ctxTarget.value = a || null
  selectedAlert.value = a ? a.name : selectedAlert.value
  ctxMenu.value = { x: e.clientX, y: e.clientY }
}
function closeCtx() { ctxMenu.value = null }
function ctxRefresh() {
  selectedAlert.value = null
  showToast('Alerts 已刷新', 'info')
  closeCtx()
}
function ctxOpen() {
  if (ctxTarget.value) openAlert(ctxTarget.value)
  else showToast('请先选择一条告警', 'warn')
  closeCtx()
}
function ctxPrint() {
  showToast('正在打印 Alerts Overview…', 'info')
  closeCtx()
}
onMounted(() => document.addEventListener('click', closeCtx))
onUnmounted(() => document.removeEventListener('click', closeCtx))
</script>

<style scoped>
.dash { position: relative; padding: 16px; display: grid; gap: 16px; overflow: auto; height: 100%; }
.dash-logo { position: absolute; top: 12px; left: 12px; max-height: 46px; max-width: 120px; z-index: 5; border-radius: 4px; box-shadow: 0 1px 3px rgba(20,50,90,.18); pointer-events: none; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.kpi { background: #fff; border: 1px solid var(--amos-border); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 1px 2px rgba(20,50,90,.05); }
.kpi-label { font-size: 12px; color: var(--amos-text-soft); }
.kpi-num { font-size: 26px; font-weight: 800; }
.kpi-num.red { color: var(--amos-danger); } .kpi-num.blue { color: var(--amos-blue); }
.kpi-num.orange { color: var(--amos-warn); } .kpi-num.violet { color: #8b5cf6; }
.kpi-sub { font-size: 11.5px; color: var(--amos-text-soft); }
.dash-cols { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }
.dash-cols.full { grid-template-columns: 1fr; }
.panel { background: #fff; border: 1px solid var(--amos-border); border-radius: 8px; box-shadow: 0 1px 2px rgba(20,50,90,.05); display: flex; flex-direction: column; }
.panel-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--amos-border); }
.panel-head h3 { margin: 0; font-size: 13px; color: #2c486a; }
.panel-body { padding: 12px; }
.alert-row { display: grid; grid-template-columns: 200px 1fr 36px 40px; align-items: center; gap: 10px; padding: 5px 0; cursor: pointer; border-radius: 4px; }
.alert-row:hover { background: #f5f8fc; }
.alert-row.sel { background: var(--amos-blue-soft); }
.alert-name { font-size: 12.5px; color: #36506e; }
.alert-num { text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; }
.bar-track { background: #eef2f7; border-radius: 4px; height: 12px; overflow: hidden; }
.bar-fill.red { background: #d64b54; } .bar-fill.blue { background: #1e6fd9; } .bar-fill.orange { background: #e8853a; } .bar-fill.green { background: #1f9d63; }
.gauge { width: 34px; height: 34px; border-radius: 50%; position: relative; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 3px #fff; }
.gauge b { font-size: 11px; color: #2c486a; font-variant-numeric: tabular-nums; }
.pie-wrap { display: flex; align-items: center; gap: 18px; }
.pie { width: 130px; height: 130px; border-radius: 50%; flex-shrink: 0; }
.pie-legend { list-style: none; margin: 0; padding: 0; font-size: 12.5px; }
.pie-legend li { padding: 3px 0; display: flex; align-items: center; gap: 6px; cursor: pointer; border-radius: 4px; }
.pie-legend li:hover { background: #f0f3f8; }
.pie-legend li.sel { background: var(--amos-blue-soft); }
.dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.dot.red { background: #d64b54; } .dot.blue { background: #1e6fd9; } .dot.orange { background: #e8853a; } .dot.green { background: #1f9d63; } .dot.violet { background: #8b5cf6; }
.hint { font-size: 11.5px; color: var(--amos-text-soft); margin: 10px 0 0; }
.notif-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 4px; border-bottom: 1px dashed var(--amos-border); cursor: pointer; }
.notif-row:hover { background: #f5f8fc; }
.notif-mod { font-size: 12.5px; color: #36506e; }
.quick-links { display: flex; flex-wrap: wrap; gap: 8px; }
.sep { border: none; border-top: 1px dashed var(--amos-border); margin: 10px 0; }
@media (max-width: 980px) { .dash-cols { grid-template-columns: 1fr; } }
.dash-disabled { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; height: 100%; color: var(--amos-text-soft); font-size: 14px; text-align: center; padding: 40px; }
.dash-web { position: fixed; z-index: 20; border: 1px solid var(--amos-border); border-radius: 8px; background: #fff; box-shadow: 0 4px 16px rgba(20,50,90,.18); display: flex; flex-direction: column; overflow: hidden; }
.dash-web.right { right: 16px; bottom: 16px; width: 300px; height: 220px; }
.dash-web.bottom { right: 16px; left: 16px; bottom: 16px; height: 180px; }
.web-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: #f3f6fa; border-bottom: 1px solid var(--amos-border); font-size: 12px; color: #2c486a; }
.web-pos-btns { display: flex; gap: 4px; }
.web-frame { flex: 1; border: none; width: 100%; }
.ctx-menu { position: fixed; z-index: 50; min-width: 120px; background: #fff; border: 1px solid var(--amos-border); border-radius: 6px; box-shadow: 0 4px 16px rgba(20,50,90,.2); overflow: hidden; }
.ctx-item { padding: 7px 12px; font-size: 12.5px; cursor: pointer; }
.ctx-item:hover { background: var(--amos-blue-soft); color: var(--amos-blue); }
</style>
