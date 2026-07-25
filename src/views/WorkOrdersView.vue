<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Work Orders</h2>
      <span v-if="globalMode" class="scope-badge global-badge" title="手册 P21-23：Global 模式 — 跨 Department 搜索">🌐 Global：{{ globalDepts.length }} Dept</span>
      <span v-else class="scope-badge" title="手册 P20：窗口仅显示当前 Department 范围内的记录">范围：{{ store.department }}</span>
      <div class="row" style="gap:6px">
        <button class="amos-btn sm" @click="reopenFilter">查找 / Filter</button>
        <button class="amos-btn sm primary" @click="doNew">New</button>
        <button class="amos-btn sm" @click="gen">Generate</button>
        <button class="amos-btn sm" @click="requisition">Requisition Work</button>
        <button class="amos-btn sm primary" @click="advance('next')">Issue / Advance</button>
        <button class="amos-btn sm" @click="openPrint">Print…</button>
        <button class="amos-btn sm primary" @click="doSave" :disabled="!selected">Save</button>
      </div>
    </div>

    <FilterDialog :basic="filterBasic" :advanced="filterAdvanced" @ok="applyFilter" @cancel="applyFilter" v-if="showFilter" />

    <!-- Open Record 对话框 -->
    <div v-if="showOpenDialog" class="open-dialog-overlay">
      <div class="open-dialog">
        <h3>Open Record — Work Orders</h3>
        <p class="muted">输入 WO No. 以定位并打开该工单。</p>
        <div class="amos-field"><label>WO No.</label><div class="ctrl"><input ref="openInputRef" class="amos-input" v-model="openKeyValue" @keydown.enter="confirmOpen" placeholder="如 WO-2607" /></div></div>
        <div class="od-actions"><button class="amos-btn" @click="showOpenDialog = false">Cancel</button><button class="amos-btn primary" @click="confirmOpen">OK</button></div>
      </div>
    </div>

    <div v-else class="bw-body">
      <section class="bw-list">
        <RecordList :columns="columns" :rows="viewRows" row-key="id" :selectable="true" v-model:checked="checkedIds" @select="onSelect" @open="onOpen" />
      </section>
      <section class="bw-detail" v-if="selected">
        <div class="bd-head">
          <strong>{{ selected.workOrderNo }}</strong>
          <span class="tag" :class="statusClass(selected.status)">{{ selected.status }}</span>
          <span class="tag violet">{{ selected.priority }}</span>
        </div>

        <!-- 状态流步骤条 -->
        <div class="stepper">
          <div v-for="(s, i) in flow" :key="s" class="step" :class="{ done: flowIdx(selected.status) >= i, current: selected.status === s }" @click="setStatus(s)">
            <span class="step-dot">{{ i + 1 }}</span>
            <span class="step-label">{{ s }}</span>
          </div>
        </div>

        <RecordDetail :tabs="tabs" :model="selected" />
      </section>
      <section v-else class="bw-detail empty"><p class="muted">双击列表行查看工单明细与状态流。</p></section>
    </div>

    <!-- 手册 4.1：打印预览（Output format + Sort + 打印）-->
    <Modal v-if="printOpen" title="Print Preview — Work Orders" width="640px" @close="printOpen = false">
      <div class="row" style="gap:14px;margin-bottom:10px;flex-wrap:wrap">
        <label class="pp-field">Output format
          <select v-model="printFormat" class="amos-select">
            <option>List</option><option>Extended list</option><option>Work order</option><option>Default (List)</option>
          </select>
        </label>
        <label class="pp-field">Sort Output by
          <select v-model="printSort" class="amos-select">
            <option value="workOrderNo">WO No.</option><option value="dueDate">Due Date</option><option value="componentId">Component</option><option value="status">Status</option>
          </select>
        </label>
        <span class="muted">已选 {{ printRows.length }} 张工单{{ checkedIds.length ? '' : '（未勾选则打印全部）' }}</span>
      </div>
      <div class="pp-preview">
        <div v-for="w in printRows" :key="w.id" class="pp-wo">
          <div class="pp-wo-h"><strong>{{ w.workOrderNo }}</strong> — {{ w.description }} <span class="muted">[{{ w.status }}]</span></div>
          <div v-if="printFormat !== 'Extended list'" class="pp-wo-d">责任人 / 功能：{{ w.functionNo || '—' }} ｜ 到期：{{ w.dueDate }} ｜ 优先级：{{ w.priority }}</div>
          <div v-if="printFormat === 'Work order'" class="pp-wo-d">组件：{{ w.componentId }} ｜ 计划方法：{{ w.jobId ? '关联作业 ' + w.jobId : '—' }}</div>
        </div>
        <p v-if="!printRows.length" class="muted">无工单可打印。</p>
      </div>
      <template #footer>
        <button class="amos-btn" @click="printOpen = false">Close</button>
        <button class="amos-btn primary" @click="doPrint">Print</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import FilterDialog from '../components/FilterDialog.vue'
import RecordList from '../components/RecordList.vue'
import RecordDetail from '../components/RecordDetail.vue'
import Modal from '../components/Modal.vue'
import { workOrderService } from '../services/workOrderService.js'
import { functionService } from '../services/functionService.js'
import { store, showToast, setPresetFilter, scopeByDepartment } from '../store.js'
import { matchRow, matchPlanning } from '../utils/filter.js'

const flow = ['Requested', 'Planned', 'Issued', 'Completed']
const flowIdx = (s) => flow.indexOf(s)
const disciplines = ['Engine Room', 'Deck', 'Bridge', 'Cargo']
// 手册 1.3：Maintenance->Work Orders 过滤字段
const filterBasic = [
  { key: 'workOrderNo', label: 'Number', type: 'text', placeholder: '如 WO-2607%' },
  { key: 'description', label: 'Title', type: 'text', placeholder: '如 %Repair' },
  { key: 'componentId', label: 'Component (SFI)', type: 'text' },
  { key: 'discipline', label: 'Only Disciplines', type: 'select', options: disciplines },
  { key: 'planning', label: 'Planning', type: 'select', options: ['Due Now', 'Overdue', 'Due This Week', 'Due Next Week'] },
]
const filterAdvanced = [{ key: 'functionNo', label: 'Function', type: 'text' }]
const columnsBase = [
  { key: 'workOrderNo', label: 'WO No.', width: '120px' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status', width: '100px', tag: true },
  { key: 'priority', label: 'Priority', width: '90px', tag: true },
  { key: 'dueDate', label: 'Due', width: '110px' },
  { key: 'functionNo', label: 'Function', width: '110px' },
]
// 手册 P23：Global 模式下新增 Inst/Dept 列
const columns = computed(() => {
  const base = [...columnsBase]
  if (globalMode.value) base.splice(1, 0, { key: '_instDept', label: 'Inst / Dept', width: '130px' })
  return base
})
const tabs = [
  { id: 'general', label: 'General', fields: [
    { key: 'workOrderNo', label: 'WO No.' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status', type: 'select', options: ['Requested', 'Planned', 'Issued', 'Pending', 'Postponed', 'Cancelled', 'Completed', 'Controlled', 'Filed'] },
    { key: 'priority', label: 'Priority', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'functionNo', label: 'Function', type: 'lookup', lookupKey: 'functions' },
    { key: 'componentId', label: 'Component', type: 'lookup', lookupKey: 'components' },
  ] },
  { id: 'job', label: 'Job Details', fields: [{ key: 'jobId', label: 'Job No.' }] },
  { id: 'parts', label: 'Parts', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '所需备件与预留。' }] },
  { id: 'disciplines', label: 'Disciplines', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '所需工种。' }] },
  { id: 'failure', label: 'Failure Mode', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '受影响 Function 与严重度代码。' }] },
  { id: 'history', label: 'History', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '执行历史。' }] },
]

const funcLoc = computed(() => functionService.locationMap())

const all = computed(() => workOrderService.list())
const viewRows = ref([])
const showFilter = ref(false)
const selected = ref(null)
const checkedIds = ref([])
const printOpen = ref(false)
const printFormat = ref('List')
const printSort = ref('workOrderNo')
// 手册 P21-23：Global Search 状态
const globalMode = ref(false)
const globalDepts = ref([])
// Open Record 对话框
const showOpenDialog = ref(false)
const openKeyValue = ref('')
const openInputRef = ref(null)
const printRows = computed(() => {
  const src = checkedIds.value.length ? viewRows.value.filter((r) => checkedIds.value.includes(r.id)) : viewRows.value
  const key = printSort.value
  return [...src].sort((a, b) => (a[key] || '') < (b[key] || '') ? -1 : (a[key] || '') > (b[key] || '') ? 1 : 0)
})
watch(() => store.activeKey, () => { if (store.activeKey === 'work-orders') { selected.value = null; checkedIds.value = []; applyPreset() } })
watch(() => store.department, () => { if (store.activeKey === 'work-orders') { selected.value = null; checkedIds.value = []; applyPreset() } })

function applyPreset() {
  if (store.presetFilter) {
    applyFilter(store.presetFilter)
    setPresetFilter(null)
  } else {
    viewRows.value = scopeRows(all.value)
  }
}

// 手册 P21-23：Global 模式下按选中的 Dept 过滤（跨 Dept）；普通模式用 scopeByDepartment
function scopeRows(rows) {
  if (globalMode.value && globalDepts.value.length) {
    return rows.filter((r) => !r.department || globalDepts.value.includes(r.department))
  }
  return scopeByDepartment(rows)
}

let lastCrit = {}
function applyFilter(c) {
  showFilter.value = false
  const crit = c || {}
  lastCrit = crit
  // 提取 Global Search 状态
  globalMode.value = !!crit._globalSearch
  globalDepts.value = crit._globalDepts || []
  // 将 planning 从普通字段匹配中排除，由 matchPlanning 单独处理（避免 row 无 planning 字段导致全量被 matchRow 拦截）
  const plainCrit = { ...crit }
  delete plainCrit.planning
  viewRows.value = scopeRows(all.value.filter((r) => {
    if (!matchRow(r, filterBasic, plainCrit)) return false
    if (crit.discipline && (funcLoc.value[r.functionNo] || '') !== crit.discipline) return false
    if (crit.planning && !matchPlanning(r, crit.planning)) return false
    return true
  })).map((r) => ({
    ...r,
    _instDept: (r.department || store.department),
  }))
}
function reopenFilter() { selected.value = null; showFilter.value = true }
function onSelect(r) { selected.value = r }
function onOpen(r) { selected.value = r }
// 视图层同步：viewRows 在 applyFilter 时可能被浅拷贝，需把 service 返回的最新值反写回列表行
function syncRowsFromDb(ids) {
  ids.forEach((id) => {
    const svc = workOrderService.get(id)
    if (!svc) return
    const row = viewRows.value.find((r) => r.id === id)
    if (row) Object.assign(row, svc)
    if (selected.value && selected.value.id === id) Object.assign(selected.value, svc)
  })
}
async function setStatus(s) {
  if (!selected.value) return
  const updated = await workOrderService.setStatus(selected.value.id, s)
  if (updated) syncRowsFromDb([updated.id])
  showToast('状态更新为 ' + s, 'ok')
}
async function advance() {
  if (!selected.value) return showToast('请选择工单', 'warn')
  const updated = await workOrderService.advance(selected.value.id)
  if (updated) syncRowsFromDb([updated.id])
  showToast('状态已推进为 ' + (updated ? updated.status : ''), 'ok')
}
function gen() { showToast('按计划自动生成工单（原型演示）', 'info') }
function requisition() { showToast('打开 Requisition Work（原型演示）', 'info') }
function openPrint() { printOpen.value = true }
function doSave() {
  if (!selected.value) return showToast('请先选择工单', 'warn')
  // 原型态：RecordDetail 字段已通过 v-model 绑定到 selected（service 内存引用）
  showToast('已保存工单：' + selected.value.workOrderNo, 'ok')
}
// Open Record
function doOpen() {
  if (showFilter.value) return
  openKeyValue.value = ''
  showOpenDialog.value = true
}
function confirmOpen() {
  const val = openKeyValue.value.trim()
  if (!val) return showToast('请输入 WO No.', 'warn')
  const rec = all.value.find((r) => String(r.workOrderNo || '').toLowerCase() === val.toLowerCase())
  if (!rec) return showToast(`未找到 WO No. 为「${val}」的工单`, 'warn')
  if (!viewRows.value.find((r) => r.id === rec.id)) viewRows.value = [...viewRows.value, rec]
  selected.value = rec; showOpenDialog.value = false
  showToast(`已打开工单：${rec.workOrderNo}`, 'ok')
}
function doPrint() {
  if (!printRows.value.length) return showToast('无工单可打印', 'warn')
  printOpen.value = false
  showToast('正在打印 ' + printRows.value.length + ' 张工单（' + printFormat.value + '）', 'ok')
  window.print()
}
async function doNew() {
  const rec = await workOrderService.create({
    workOrderNo: 'WO-' + Math.floor(Math.random() * 9000 + 1000), description: '', status: 'Requested', priority: 'Medium', dueDate: '', department: store.department, functionNo: '', componentId: '', jobId: '',
  })
  viewRows.value = [...viewRows.value, rec]; selected.value = rec; showToast('已新建工单，编辑后点击 Save 保存', 'ok')
}
function onAction(e) {
  const a = e.detail?.action
  if (a === 'filter') reopenFilter()
  if (a === 'new') doNew()
  if (a === 'open') doOpen()
  if (a === 'delete') doDelete()
}
// 手册 4：Work Orders 删除限制 — 仅初始状态(Requested)可物理删除；
// Planned / Issued / Completed 等已进入流程或具审计价值的工单不允许删除，应走 Cancel 流程
async function doDelete() {
  // 优先使用勾选集合，否则针对当前选中记录
  const targets = checkedIds.value.length
    ? viewRows.value.filter((r) => checkedIds.value.includes(r.id))
    : (selected.value ? [selected.value] : [])
  if (!targets.length) return showToast('请先选择要删除的工单', 'warn')

  const blocked = targets.filter((r) => r.status !== 'Requested')
  if (blocked.length) {
    const nums = blocked.map((r) => r.workOrderNo).join('、')
    return showToast(`工单 ${nums} 状态为「${blocked[0].status}」，不可删除。请改用 Cancel 流程取消该工单。`, 'warn')
  }
  // 全部为可删状态，执行删除（逐条走 service，由 service 做最终状态校验）
  for (const r of targets) {
    const res = await workOrderService.remove(r.id)
    if (!res.ok && res.reason === 'status') {
      return showToast(`工单 ${r.workOrderNo} 状态为「${res.status}」，不可删除。请改用 Cancel 流程取消该工单。`, 'warn')
    }
  }
  checkedIds.value = []
  selected.value = null
  applyFilter(lastCrit) // 保留当前筛选 / Global 状态刷新列表
  showToast(`已删除 ${targets.length} 张工单`, 'warn')
}
onMounted(() => { window.addEventListener('amos-action', onAction); applyPreset() })
onBeforeUnmount(() => window.removeEventListener('amos-action', onAction))
watch(showOpenDialog, (v) => { if (v) nextTick(() => openInputRef.value?.focus()) })

function statusClass(v) {
  const s = String(v).toLowerCase()
  if (/(completed|available)/.test(s)) return 'green'
  if (/(requested|planned|issued)/.test(s)) return 'blue'
  if (/(pending)/.test(s)) return 'orange'
  if (/(overdue|postponed|cancelled)/.test(s)) return 'red'
  if (/(controlled|filed)/.test(s)) return 'gray'
  return 'gray'
}
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
.bw-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.scope-badge { font-size: 11.5px; color: #1f6fb2; background: #e8f2fb; border: 1px solid #b9d8f0; border-radius: 999px; padding: 2px 10px; }
.global-badge { color: #0e6a30; background: #e4f7e8; border-color: #95d5a9; }
.bw-body { flex: 1; display: grid; grid-template-columns: 1.4fr 1fr; min-height: 0; }
.bw-list { border-right: 1px solid var(--amos-border); padding: 8px; min-height: 0; min-width: 0; display: flex; }
.bw-list > * { flex: 1; }
.bw-detail { padding: 10px; overflow: auto; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.bw-detail.empty { display: flex; align-items: center; justify-content: center; }
.bd-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.stepper { display: flex; align-items: center; gap: 0; margin: 6px 0 14px; }
.step { display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--amos-text-soft); }
.step-dot { width: 22px; height: 22px; border-radius: 50%; background: #e3e8ef; color: #7b8aa0; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; }
.step-label { font-size: 12px; }
.step:not(:last-child)::after { content: ''; width: 36px; height: 2px; background: #e3e8ef; margin: 0 6px; }
.step.done .step-dot { background: var(--amos-ok); color: #fff; }
.step.current .step-dot { background: var(--amos-blue); color: #fff; box-shadow: 0 0 0 3px rgba(30,111,217,.2); }
.step.current .step-label { color: var(--amos-blue); font-weight: 700; }
@media (max-width: 980px) { .bw-body { grid-template-columns: 1fr; } .bw-list { border-right: none; border-bottom: 1px solid var(--amos-border); } }
/* Open Record 对话框 */
.open-dialog-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; z-index: 40; }
.open-dialog { background: #fff; border-radius: 10px; box-shadow: var(--amos-shadow); width: 420px; padding: 20px 24px; }
.open-dialog h3 { margin: 0 0 8px; font-size: 15px; color: #2c486a; }
.open-dialog .amos-field { margin-top: 12px; }
.od-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.pp-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--amos-text-soft); }
.pp-preview { max-height: 320px; overflow: auto; border: 1px solid var(--amos-border); border-radius: 6px; padding: 10px; background: #fbfcfe; }
.pp-wo { padding: 8px 0; border-bottom: 1px dashed var(--amos-border); }
.pp-wo:last-child { border-bottom: none; }
.pp-wo-h { font-size: 13px; }
.pp-wo-d { font-size: 12px; color: var(--amos-text-soft); margin-top: 3px; }
</style>
