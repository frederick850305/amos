<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Budget</h2>
      <div class="row" style="gap:6px">
        <button v-for="m in modes" :key="m.key" class="amos-btn sm" :class="{ primary: mode === m.key }" @click="mode = m.key">{{ m.label }}</button>
        <button class="amos-btn sm" @click="doNew" v-if="mode === 'specification'">New</button>
        <button class="amos-btn sm primary" @click="doSave" v-if="mode === 'specification'" :disabled="!sel">Save</button>
      </div>
    </div>

    <div class="bw-body single">
      <section class="bw-list" style="padding:12px">
        <!-- Overview -->
        <div v-if="mode === 'overview'">
          <div v-for="b in budgets" :key="b.id" class="budget-card" :class="{ sel: b.id === selId }" @click="selId = b.id">
            <div class="bc-head">
              <strong>{{ b.code }}</strong> — {{ b.title }}
              <span class="tag" :class="classClass(b.class)">{{ b.class }}</span>
              <span class="tag gray">{{ b.status }}</span>
            </div>
            <div class="bc-track">
              <div class="bc-fill paid" :style="{ width: pct(b.paid, b.limit) + '%' }" title="Paid"></div>
              <div class="bc-fill committed" :style="{ width: pct(b.committed, b.limit) + '%' }" title="Committed"></div>
              <div class="bc-fill forecast" :style="{ width: pct(b.forecast, b.limit) + '%' }" title="Forecast"></div>
            </div>
            <div class="bc-nums">
              <span>Paid <b>{{ money(b.paid) }}</b></span>
              <span>Committed <b>{{ money(b.committed) }}</b></span>
              <span>Forecast <b>{{ money(b.forecast) }}</b></span>
              <span>Limit <b>{{ money(b.limit) }}</b></span>
              <span :class="usage(b) > b.warning ? 'over' : ''">Usage {{ usage(b) }}% / Warn {{ b.warning }}%</span>
            </div>
          </div>
        </div>

        <!-- Specification -->
        <div v-else-if="mode === 'specification'">
          <div class="row" style="gap:8px;margin-bottom:10px">
            <select v-model="selId" class="amos-select">
              <option v-for="b in budgets" :key="b.id" :value="b.id">{{ b.code }} — {{ b.title }}</option>
            </select>
          </div>
          <div v-if="sel" class="spec">
            <div class="amos-field" v-for="f in specFields" :key="f.key">
              <label>{{ f.label }}</label>
              <div class="ctrl">
                <select v-if="f.type === 'select'" v-model="sel[f.key]" class="amos-select">
                  <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
                </select>
                <input v-else v-model="sel[f.key]" class="amos-input" :type="f.type === 'number' ? 'number' : 'text'" />
              </div>
            </div>
          </div>
        </div>

        <!-- Breakdown -->
        <div v-else-if="mode === 'breakdown'">
          <div v-for="b in budgets" :key="b.id" class="budget-card">
            <div class="bc-head"><strong>{{ b.code }}</strong> — {{ b.title }}<span class="tag gray">{{ b.status }}</span></div>
            <table class="amos-grid">
              <thead><tr><th>Voucher</th><th>Vendor</th><th class="num">Net</th><th class="num">VAT</th><th class="num">Total</th></tr></thead>
              <tbody>
                <tr v-for="v in vouchersOf(b.code)" :key="v.id">
                  <td>{{ v.voucherNo }}</td><td>{{ v.vendor }}</td><td class="num">{{ money(v.net) }}</td><td class="num">{{ money(v.vat) }}</td><td class="num">{{ money(v.total) }}</td>
                </tr>
                <tr v-if="!vouchersOf(b.code).length"><td colspan="5" class="muted" style="text-align:center;padding:10px">无关联凭证</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Prognosis -->
        <div v-else-if="mode === 'prognosis'">
          <table class="amos-grid">
            <thead><tr><th>Budget</th><th class="num">Limit</th><th class="num">Committed</th><th class="num">Forecast</th><th class="num">Estimated</th><th class="num">Remaining</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="b in budgets" :key="b.id">
                <td>{{ b.code }}</td>
                <td class="num">{{ money(b.limit) }}</td>
                <td class="num">{{ money(b.committed) }}</td>
                <td class="num">{{ money(b.forecast) }}</td>
                <td class="num"><b>{{ money(b.committed + b.forecast) }}</b></td>
                <td class="num" :class="(b.limit - b.committed - b.forecast) < 0 ? 'over' : ''">{{ money(b.limit - b.committed - b.forecast) }}</td>
                <td><span class="tag" :class="(b.limit - b.committed - b.forecast) < 0 ? 'red' : 'green'">{{ (b.limit - b.committed - b.forecast) < 0 ? 'Overrun' : 'Within' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Hierarchy -->
        <div v-else-if="mode === 'hierarchy'">
          <div v-for="g in groups" :key="g.code" class="budget-card">
            <div class="bc-head"><strong>Group {{ g.code }}</strong><span class="tag gray">Accumulated</span></div>
            <div class="bc-nums">
              <span>Committed <b>{{ money(g.committed) }}</b></span>
              <span>Paid <b>{{ money(g.paid) }}</b></span>
              <span>Limit <b>{{ money(g.limit) }}</b></span>
            </div>
            <ul class="tree">
              <li v-for="b in g.children" :key="b.id">{{ b.code }} — {{ b.title }} <span class="muted">({{ money(b.committed) }} / {{ money(b.limit) }})</span></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { budgetService } from '../services/budgetService.js'
import { showToast } from '../store.js'

const budgets = budgetService.list()
const modes = [
  { key: 'overview', label: 'Overview' },
  { key: 'specification', label: 'Specification' },
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'prognosis', label: 'Prognosis' },
  { key: 'hierarchy', label: 'Hierarchy' },
]
const mode = ref('overview')
const selId = ref(budgets[0]?.id || '')

const sel = computed(() => budgets.find((b) => b.id === selId.value) || null)
const specFields = [
  { key: 'code', label: 'Budget Code' },
  { key: 'title', label: 'Title' },
  { key: 'groupCode', label: 'Budget Group' },
  { key: 'class', label: 'Class', type: 'select', options: ['Purchase', 'Stock', 'Maintenance'] },
  { key: 'model', label: 'Model', type: 'select', options: ['Manual', 'System'] },
  { key: 'status', label: 'Status', type: 'select', options: ['Preliminary', 'Approved', 'Parked'] },
  { key: 'access', label: 'Access', type: 'select', options: ['Open', 'Restricted'] },
  { key: 'warning', label: 'Warning Limit %', type: 'number' },
  { key: 'limit', label: 'Limit', type: 'number' },
  { key: 'committed', label: 'Committed', type: 'number' },
  { key: 'paid', label: 'Paid', type: 'number' },
  { key: 'forecast', label: 'Forecast', type: 'number' },
]

function pct(v, limit) { return Math.min(100, (v / (limit || 1)) * 100) }
function usage(b) { return Math.round((b.committed / (b.limit || 1)) * 100) }
function money(v) { return '$' + Number(v).toLocaleString() }
function classClass(c) { return { Purchase: 'blue', Stock: 'orange', Maintenance: 'violet' }[c] || 'gray' }

function vouchersOf(code) { return budgetService.vouchersOf(code) }
const groups = computed(() => budgetService.accumulatedGroups())

async function doNew() {
  const rec = await budgetService.create({})
  selId.value = rec.id; showToast('已新建预算', 'ok')
}
function doSave() {
  if (!sel.value) return showToast('请先选择预算记录', 'warn')
  // 原型态：数据已通过 v-model 绑定到 service 内存对象，此处确认保存语义
  showToast('已保存预算：' + sel.value.code, 'ok')
}
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
.bw-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); gap: 8px; flex-wrap: wrap; }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.bw-body.single { flex: 1; overflow: auto; }
.bw-list { height: 100%; overflow: auto; }
.budget-card { background: #fff; border: 1px solid var(--amos-border); border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; cursor: pointer; }
.budget-card.sel { border-color: #1e6fd9; box-shadow: 0 0 0 2px rgba(30,111,217,.15); }
.bc-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.bc-track { height: 18px; background: #eef2f6; border-radius: 6px; overflow: hidden; position: relative; }
.bc-fill { height: 100%; position: absolute; left: 0; }
.bc-fill.paid { background: #1f9d63; z-index: 1; }
.bc-fill.committed { background: #1e6fd9; opacity: .75; z-index: 2; }
.bc-fill.forecast { background: #e8853a; opacity: .5; z-index: 3; }
.bc-nums { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; font-size: 12px; color: var(--amos-text-soft); }
.bc-nums b { color: #2b3a4d; }
.bc-nums .over { color: var(--amos-danger); font-weight: 700; }
.spec { max-width: 520px; }
.tree { margin: 8px 0 0 4px; padding-left: 16px; list-style: disc; }
.tree li { font-size: 12.5px; padding: 2px 0; }
.over { color: var(--amos-danger); font-weight: 700; }
</style>
