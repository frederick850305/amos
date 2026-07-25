<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Quotation Comparison</h2>
      <div class="row" style="gap:6px">
        <select v-model="selForm" class="amos-select sm">
          <option v-for="q in forms" :key="q.formNo" :value="q.formNo">{{ q.formNo }}</option>
        </select>
        <button class="amos-btn sm" @click="bestPrice">Best Price</button>
        <button class="amos-btn sm" @click="bestDelivery">Best Delivery</button>
        <button class="amos-btn sm primary" @click="propose">Propose Scenario</button>
        <button class="amos-btn sm" @click="approve" :disabled="!approved">Approve Scenario</button>
        <button class="amos-btn sm primary" @click="selectCreatePO" :disabled="!selVendor">Select & Create PO</button>
      </div>
    </div>

    <div class="bw-body single">
      <section class="bw-list" style="padding:12px">
        <div class="matrix">
          <table class="amos-grid">
            <thead>
              <tr>
                <th>Vendor</th><th>Line Item</th><th class="num">Unit Price</th>
                <th class="num">Discount</th><th class="num">Add. Cost</th><th class="num">Delivery (d)</th><th>Currency</th>
                <th>Best</th><th>Select</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(q, i) in rows" :key="i" :class="{ selected: q.vendor === selVendor }">
                <td>{{ q.vendor }}</td>
                <td>{{ q.partNo }} · {{ q.description }}</td>
                <td class="num">{{ q.unitPrice }}</td>
                <td class="num">{{ q.discount }}%</td>
                <td class="num">{{ q.additionalCost || 0 }}</td>
                <td class="num">{{ q.deliveryDays }}</td>
                <td>{{ q.currency }}</td>
                <td>{{ q.best || '—' }}</td>
                <td><input type="radio" name="sel" :value="q.vendor" v-model="selVendor" /></td>
              </tr>
              <tr v-if="!rows.length"><td colspan="8" class="muted" style="text-align:center;padding:14px">该 Query 暂无报价</td></tr>
            </tbody>
          </table>
        </div>
        <div class="scenario">
          <span class="muted">当前场景：</span>
          <span class="tag" :class="scenarioTone">{{ scenarioLabel }}</span>
          <span v-if="approved" class="tag green">已批准</span>
        </div>
        <p class="hint">提示：Best Price / Best Delivery 自动标记最优供应商；Propose 生成方案后可 Approve，再 Select 应用到采购单。</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { purchaseFormService } from '../services/purchaseFormService.js'
import { showToast } from '../store.js'

const forms = purchaseFormService.list().filter((f) => f.type === 'Query')
const selForm = ref(forms[0]?.formNo || '')
const selVendor = ref('')
const approved = ref(false)

const rows = computed(() => {
  const form = purchaseFormService.quotations().filter((q) => q.formNo === selForm.value)
  const first = purchaseFormService.list().find((f) => f.formNo === selForm.value)
  return form.map((q) => ({
    vendor: q.vendor,
    partNo: first?.lineItems[0]?.partNo || '',
    description: first?.lineItems[0]?.description || '',
    unitPrice: q.unitPrice,
    discount: q.discount,
    additionalCost: q.additionalCost || 0,
    deliveryDays: q.deliveryDays,
    currency: q.currency,
    best: '',
  }))
})
const scenarioLabel = ref('未选择')
const scenarioTone = ref('gray')
// 指南（手册 4）：最优价格需综合单价、折扣与附加费用（Additional Cost）
function effCost(r) { return r.unitPrice * (1 - r.discount / 100) + (r.additionalCost || 0) }
function bestPrice() {
  if (!rows.value.length) return showToast('无报价', 'info')
  let best = rows.value[0]
  rows.value.forEach((r) => { if (effCost(r) < effCost(best)) best = r })
  rows.value.forEach((r) => (r.best = ''))
  best.best = '★ Price'
  selVendor.value = best.vendor
  scenarioLabel.value = '最低价：' + best.vendor
  scenarioTone.value = 'green'
  showToast('已标记最优价格供应商', 'ok')
}
function bestDelivery() {
  if (!rows.value.length) return showToast('无报价', 'info')
  let best = rows.value[0]
  rows.value.forEach((r) => { if (r.deliveryDays < best.deliveryDays) best = r })
  rows.value.forEach((r) => (r.best = ''))
  best.best = '★ Delivery'
  selVendor.value = best.vendor
  scenarioLabel.value = '最短交期：' + best.vendor
  scenarioTone.value = 'blue'
  showToast('已标记最优交期供应商', 'ok')
}
function propose() {
  if (!selVendor.value) return showToast('请先选择供应商', 'warn')
  scenarioLabel.value = '方案：' + selVendor.value
  scenarioTone.value = 'orange'
  showToast('已生成方案，可 Approve', 'info')
}
function approve() {
  approved.value = true
  showToast('方案已批准，可应用到采购单', 'ok')
}
// 指南（手册 4）：选定报价方案后生成采购单（Query → Purchase Order）
async function selectCreatePO() {
  if (!selVendor.value) return showToast('请先选择供应商', 'warn')
  const q = purchaseFormService.quotations().find((x) => x.formNo === selForm.value && x.vendor === selVendor.value)
  const po = await purchaseFormService.createPOFromQuery(selForm.value, selVendor.value, q?.unitPrice)
  if (!po) return showToast('未找到对应 Query', 'warn')
  scenarioLabel.value = '已生成采购单：' + po.formNo
  scenarioTone.value = 'green'
  showToast(`已按选定供应商生成采购单 ${po.formNo}`, 'ok')
}
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
.bw-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); gap: 8px; flex-wrap: wrap; }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.bw-body.single { flex: 1; overflow: auto; }
.bw-list { height: 100%; overflow: auto; }
.scenario { margin-top: 12px; display: flex; align-items: center; gap: 8px; }
.hint { font-size: 11.5px; color: var(--amos-text-soft); margin-top: 10px; }
</style>
