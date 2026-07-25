<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Stock Items</h2>
      <span v-if="globalMode" class="scope-badge global-badge" title="手册 P21-23：Global 模式 — 跨 Department 搜索">🌐 Global：{{ globalDepts.length }} Dept</span>
      <span v-else class="scope-badge" title="手册 P20：窗口仅显示当前 Department 范围内的记录">范围：{{ store.department }}</span>
      <div class="row" style="gap:6px">
        <button class="amos-btn sm" @click="reopenFilter">查找 / Find</button>
        <button class="amos-btn sm primary" @click="doNew">New</button>
        <button class="amos-btn sm" @click="doMove" :disabled="!selected">Move</button>
        <button class="amos-btn sm" @click="setStatus" :disabled="!selected">Set Status</button>
        <button class="amos-btn sm" @click="viewPH">View Purchase History</button>
        <button class="amos-btn sm primary" @click="doSave" :disabled="!selected">Save</button>
      </div>
    </div>

    <FilterDialog :basic="filterBasic" :advanced="filterAdvanced" @ok="applyFilter" @cancel="applyFilter" v-if="showFilter" />

    <!-- Open Record 对话框 -->
    <div v-if="showOpenDialog" class="open-dialog-overlay">
      <div class="open-dialog">
        <h3>Open Record — Stock Items</h3>
        <p class="muted">输入 Item No. (SFI) 以定位并打开该库存项。</p>
        <div class="amos-field"><label>Item No.</label><div class="ctrl"><input ref="openInputRef" class="amos-input" v-model="openKeyValue" @keydown.enter="confirmOpen" placeholder="如 SI-001" /></div></div>
        <div class="od-actions"><button class="amos-btn" @click="showOpenDialog = false">Cancel</button><button class="amos-btn primary" @click="confirmOpen">OK</button></div>
      </div>
    </div>

    <div v-else class="bw-body">
      <section class="bw-list"><RecordList :columns="columns" :rows="viewRows" row-key="id" @select="onSelect" @open="onOpen" /></section>
      <section class="bw-detail" v-if="selected">
        <div class="bd-head"><strong>{{ selected.stockItemNo }}</strong><span class="tag" :class="statusClass(selected.status)">{{ selected.status }}</span></div>
        <RecordDetail :tabs="tabs" :model="selected">
          <!-- 手册 2.3(6)：Outstanding Forms -->
          <template #extra-forms>
            <p class="muted">该材料仍处于采购 / 询价阶段的申请单或采购单。</p>
            <table class="amos-grid sub">
              <thead><tr><th>Form No.</th><th>Type</th><th>Status</th><th class="num">Qty</th><th>Vendor</th></tr></thead>
              <tbody>
                <tr v-for="f in relForms" :key="f.formNo + f.partNo">
                  <td>{{ f.formNo }}</td><td>{{ f.type }}</td><td>{{ f.status }}</td><td class="num">{{ f.quantity }}</td><td>{{ f.vendor }}</td>
                </tr>
                <tr v-if="!relForms.length"><td colspan="5" class="muted">无进行中的申请单 / 采购单。</td></tr>
              </tbody>
            </table>
          </template>
          <!-- 手册 2.3(7)：Stock Transactions -->
          <template #extra-tx>
            <table class="amos-grid sub">
              <thead><tr><th>TX No.</th><th>Type</th><th class="num">Qty</th><th>From</th><th>To</th><th>Date</th></tr></thead>
              <tbody>
                <tr v-for="t in relTx" :key="t.id">
                  <td>{{ t.transactionNo }}</td><td>{{ t.type }}</td><td class="num">{{ t.quantity }}</td><td>{{ t.fromLocation || '—' }}</td><td>{{ t.toLocation }}</td><td>{{ t.date }}</td>
                </tr>
                <tr v-if="!relTx.length"><td colspan="6" class="muted">无库存变更记录。</td></tr>
              </tbody>
            </table>
          </template>
          <!-- 手册 2.3(8)：Component -->
          <template #extra-component>
            <p class="muted">所选备件用于以下设备 / 部件（按功能位置匹配）。</p>
            <table class="amos-grid sub">
              <thead><tr><th>Number</th><th>Name</th><th>Function</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="c in relComponents" :key="c.id"><td>{{ c.number }}</td><td>{{ c.name }}</td><td>{{ c.functionNo }}</td><td>{{ c.status }}</td></tr>
                <tr v-if="!relComponents.length"><td colspan="4" class="muted">无关联设备。</td></tr>
              </tbody>
            </table>
          </template>
          <!-- 手册 2.3(9)：Attachments -->
          <template #extra-attachments>
            <div class="row" style="gap:6px;margin-bottom:8px">
              <button class="amos-btn sm" @click="showToast('已添加附件（原型演示）', 'ok')">New</button>
              <button class="amos-btn sm" @click="showToast('查看附件（原型演示）', 'info')">View</button>
            </div>
            <p class="muted">附件可为图片或 Word 文件等，用于补充材料描述。</p>
          </template>
          <!-- 手册 2.3(10)：Overview（过去 5 年存耗）-->
          <template #extra-overview>
            <p class="muted">过去 5 年所选材料的存耗概况（手册 2.3(10)）。</p>
            <table class="amos-grid sub">
              <thead><tr><th>Year</th><th class="num">Opening</th><th class="num">In</th><th class="num">Out</th><th class="num">Closing</th></tr></thead>
              <tbody>
                <tr v-for="o in overview" :key="o.year">
                  <td>{{ o.year }}</td><td class="num">{{ o.opening }}</td><td class="num">{{ o.in }}</td><td class="num">{{ o.out }}</td><td class="num">{{ o.closing }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </RecordDetail>
      </section>
      <section v-else class="bw-detail empty"><p class="muted">双击列表行查看库存项明细。</p></section>
    </div>

    <Modal v-if="moveOpen" title="Move Stock Item" width="420px" @close="moveOpen = false">
      <div class="amos-field"><label>Item</label><div class="ctrl"><input class="amos-input" :value="selected?.stockItemNo" readonly /></div></div>
      <div class="amos-field"><label>To Location</label><div class="ctrl"><input class="amos-input" v-model="moveTo" placeholder="目标库位" /></div></div>
      <div class="amos-field"><label>Quantity</label><div class="ctrl"><input class="amos-input" type="number" v-model.number="moveQty" /></div></div>
      <template #footer>
        <button class="amos-btn" @click="moveOpen = false">Cancel</button>
        <button class="amos-btn primary" @click="confirmMove">OK</button>
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
import { stockItemService } from '../services/stockItemService.js'
import { stockTypeService } from '../services/stockTypeService.js'
import { store, showToast, setPresetFilter, scopeByDepartment } from '../store.js'
import { matchRow } from '../utils/filter.js'

// 手册 2.3(2)：查找窗口——Number(SFI) / Name / Maker / Maker's Ref / Stock Class / Drawing No. / Location
const stockClassOptions = ['Gasket', 'Valve', 'Seal', 'Lubricant', 'Electrical', 'Consumable', 'Medical', 'Spare']
const filterBasic = [
  { key: 'stockItemNo', label: 'Number (SFI)', type: 'text', placeholder: '如 SI-00%' },
  { key: 'description', label: 'Name', type: 'text', placeholder: '如 %Gasket' },
  { key: 'maker', label: 'Maker', type: 'text' },
  { key: 'makerRef', label: "Maker's Ref.", type: 'text' },
  { key: 'stockClass', label: 'Stock Class', type: 'select', options: stockClassOptions },
  { key: 'drawingNo', label: 'Drawing No.', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
]
const filterAdvanced = [{ key: 'functionNo', label: 'Function (SFI)', type: 'text' }]
const columnsBase = [
  { key: 'stockItemNo', label: 'Item No.', width: '110px' },
  { key: 'description', label: 'Description' },
  { key: 'stockTypeNo', label: 'Stock Type', width: '110px' },
  { key: 'makerRef', label: "Maker's Ref.", width: '110px' },
  { key: 'stockClass', label: 'Class', width: '90px' },
  { key: 'quantity', label: 'Qty', align: 'right', width: '70px' },
  { key: 'location', label: 'Location', width: '110px' },
  { key: 'status', label: 'Status', width: '100px', tag: true },
  { key: 'unitCost', label: 'Unit Cost', align: 'right', width: '90px' },
]
// 手册 P23：Global 模式下新增 Inst/Dept 列
const columns = computed(() => {
  const base = [...columnsBase]
  if (globalMode.value) base.splice(1, 0, { key: '_instDept', label: 'Inst / Dept', width: '130px' })
  return base
})
const tabs = [
  { id: 'general', label: 'General', fields: [
    { key: 'stockItemNo', label: 'Item No.' },
    { key: 'stockTypeNo', label: 'Stock Type', type: 'lookup', lookupKey: 'stockTypes' },
    { key: 'description', label: 'Description' },
    { key: 'maker', label: 'Maker' },
    { key: 'makerRef', label: "Maker's Ref." },
    { key: 'drawingNo', label: 'Drawing No.' },
    { key: 'stockClass', label: 'Stock Class', type: 'select', options: stockClassOptions },
    { key: 'quantity', label: 'Quantity（ROB）', type: 'number' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'unitCost', label: 'Unit Cost', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Obsolete', 'Scrapped'] },
  ] },
  { id: 'type', label: 'Type Details', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '材料的详细描述（备件号 / 型号等特殊信息）。' }] },
  { id: 'vendors', label: 'Vendors', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '所选材料采购或报价相关的供应商历史（来自 Stock Type）。' }] },
  { id: 'forms', label: 'Outstanding Forms', fields: [] },
  { id: 'tx', label: 'Stock Transactions', fields: [] },
  { id: 'component', label: 'Component', fields: [] },
  { id: 'attachments', label: 'Attachments', fields: [] },
  { id: 'overview', label: 'Overview', fields: [] },
]

const stockTypeByNo = computed(() => stockTypeService.byNo())
const all = computed(() => stockItemService.list())
const viewRows = ref([])
const showFilter = ref(false)
const selected = ref(null)
const moveOpen = ref(false)
const moveTo = ref('')
const moveQty = ref(1)
// Open Record 对话框
const showOpenDialog = ref(false)
const openKeyValue = ref('')
const openInputRef = ref(null)
// 手册 P21-23：Global Search 状态
const globalMode = ref(false)
const globalDepts = ref([])

const relForms = computed(() => stockItemService.relatedForms(selected.value))
const relTx = computed(() => stockItemService.relatedTransactions(selected.value))
const relComponents = computed(() => stockItemService.relatedComponents(selected.value))
const overview = computed(() => {
  if (!selected.value) return []
  const now = new Date().getFullYear()
  let closing = selected.value.quantity
  const ins = relTx.value.filter((t) => t.type === 'In').reduce((s, t) => s + t.quantity, 0)
  const outs = relTx.value.filter((t) => t.type === 'Out').reduce((s, t) => s + t.quantity, 0)
  const rows = []
  for (let i = 0; i < 5; i++) {
    const year = now - i
    const out = i === 0 ? outs : Math.round(outs / 5)
    const inn = i === 0 ? ins : Math.round(ins / 5)
    const opening = closing - inn + out
    rows.unshift({ year, opening, in: inn, out, closing })
    closing = opening
  }
  return rows
})

watch(() => store.activeKey, () => { if (store.activeKey === 'stock-items') { selected.value = null; applyPreset() } })
watch(() => store.department, () => { if (store.activeKey === 'stock-items') { selected.value = null; applyPreset() } })

function applyPreset() {
  if (store.presetFilter) { applyFilter(store.presetFilter); setPresetFilter(null) }
  else viewRows.value = scopeRows(all.value)
}

// 手册 P21-23：Global 模式下按选中的 Dept 过滤（跨 Dept）；普通模式用 scopeByDepartment
function scopeRows(rows) {
  if (globalMode.value && globalDepts.value.length) {
    return rows.filter((r) => !r.department || globalDepts.value.includes(r.department))
  }
  return scopeByDepartment(rows)
}

function applyFilter(c) {
  showFilter.value = false
  const crit = c || {}
  // 提取 Global Search 状态
  globalMode.value = !!crit._globalSearch
  globalDepts.value = crit._globalDepts || []
  viewRows.value = scopeRows(all.value.filter((r) => {
    if (!matchRow(r, filterBasic, crit)) return false
    if (crit.maker) {
      const st = stockTypeByNo.value[r.stockTypeNo]
      if (!st || !String(st.maker ?? '').toLowerCase().includes(String(crit.maker).toLowerCase())) return false
    }
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
    const svc = stockItemService.get(id)
    if (!svc) return
    const row = viewRows.value.find((r) => r.id === id)
    if (row) Object.assign(row, svc)
    if (selected.value && selected.value.id === id) Object.assign(selected.value, svc)
  })
}
async function doNew() {
  const rec = await stockItemService.create({
    stockItemNo: 'SI-' + Math.floor(Math.random() * 900 + 100), description: '', stockTypeNo: '', maker: '', makerRef: '', drawingNo: '', stockClass: '', functionNo: '', quantity: 0, department: store.department, location: '', status: 'Active', unitCost: 0,
  })
  viewRows.value = [...viewRows.value, rec]; selected.value = rec; showToast('已新建库存项', 'ok')
}
function doMove() { moveTo.value = ''; moveQty.value = 1; moveOpen.value = true }
async function confirmMove() {
  if (selected.value && moveTo.value) {
    const updated = await stockItemService.move(selected.value.id, moveTo.value, moveQty.value)
    moveOpen.value = false
    if (updated) syncRowsFromDb([updated.id])
    showToast('已移动并生成 Transferred Out / In 交易', 'ok')
  }
}
async function setStatus() {
  if (!selected.value) return
  const opts = ['Active', 'Obsolete', 'Scrapped']
  const next = opts[(opts.indexOf(selected.value.status) + 1) % opts.length]
  const updated = await stockItemService.setStatus(selected.value.id, next)
  if (updated) syncRowsFromDb([updated.id])
  showToast('状态已设为 ' + next, 'ok')
}
function viewPH() { showToast('查看采购历史（原型演示）', 'info') }
function doSave() {
  if (!selected.value) return showToast('请先选择库存项', 'warn')
  // 原型态：RecordDetail 字段已通过 v-model 绑定到 selected（service 内存引用）
  showToast('已保存库存项：' + selected.value.stockItemNo, 'ok')
}
// Open Record
function doOpen() {
  if (showFilter.value) return
  openKeyValue.value = ''
  showOpenDialog.value = true
}
function confirmOpen() {
  const val = openKeyValue.value.trim()
  if (!val) return showToast('请输入 Item No.', 'warn')
  const rec = all.value.find((r) => String(r.stockItemNo || '').toLowerCase() === val.toLowerCase())
  if (!rec) return showToast(`未找到 Item No. 为「${val}」的库存项`, 'warn')
  if (!viewRows.value.find((r) => r.id === rec.id)) viewRows.value = [...viewRows.value, rec]
  selected.value = rec; showOpenDialog.value = false
  showToast(`已打开库存项：${rec.stockItemNo}`, 'ok')
}
function statusClass(v) {
  const s = String(v).toLowerCase()
  if (/(active)/.test(s)) return 'green'
  if (/(obsolete|scrapped)/.test(s)) return 'red'
  return 'gray'
}
function onAction(e) { const a = e.detail?.action; if (a === 'filter') reopenFilter(); if (a === 'new') doNew(); if (a === 'open') doOpen() }
onMounted(() => { window.addEventListener('amos-action', onAction); applyPreset() })
onBeforeUnmount(() => window.removeEventListener('amos-action', onAction))
watch(showOpenDialog, (v) => { if (v) nextTick(() => openInputRef.value?.focus()) })
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
.bd-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.sub { margin-top: 8px; }
@media (max-width: 980px) { .bw-body { grid-template-columns: 1fr; } .bw-list { border-right: none; border-bottom: 1px solid var(--amos-border); } }
/* Open Record 对话框 */
.open-dialog-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; z-index: 40; }
.open-dialog { background: #fff; border-radius: 10px; box-shadow: var(--amos-shadow); width: 420px; padding: 20px 24px; }
.open-dialog h3 { margin: 0 0 8px; font-size: 15px; color: #2c486a; }
.open-dialog .amos-field { margin-top: 12px; }
.od-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
</style>
