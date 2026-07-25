<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Stock Wanted</h2>
      <div class="row" style="gap:6px">
        <button class="amos-btn sm primary" @click="calc">Calculate Wanted Quantities</button>
        <button class="amos-btn sm" @click="genForms">Options ▾ Generate Forms</button>
        <button class="amos-btn sm" @click="purchase">Purchase</button>
      </div>
    </div>

    <div class="bw-body single">
      <section class="bw-list" style="padding:10px">
        <table class="amos-grid">
          <thead>
            <tr>
              <th>Stock Type</th><th>Description</th>
              <th class="num">Current</th><th class="num">Reorder Level</th><th class="num">Outstanding</th>
              <th class="num">Wanted</th><th>Vendor</th><th>Contract</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in wanted" :key="r.id" :class="{ selected: r.id === selId }" @click="selId = r.id">
              <td>{{ r.stockTypeNo }}</td><td>{{ r.description }}</td>
              <td class="num">{{ r.currentQty }}</td><td class="num">{{ r.reorderLevel }}</td><td class="num">{{ r.outstanding }}</td>
              <td class="num"><b :class="r.wantedQty > 0 ? 'need' : ''">{{ r.wantedQty }}</b></td>
              <td>{{ r.vendor }}</td><td>{{ r.contract }}</td>
            </tr>
          </tbody>
        </table>
        <p class="hint">提示：Wanted = Max(0, Reorder Level − Current − Outstanding)。点击 <b>Calculate</b> 重新计算，<b>Generate Forms</b> 由缺货项生成 Requisition。</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { stockWantedService } from '../services/stockWantedService.js'
import { showToast } from '../store.js'

const wanted = stockWantedService.list()
const selId = ref('')
async function calc() {
  // 指南（手册 3）：Wanted 依据 Reorder Level，并扣减已申请未到货（Outstanding）
  await stockWantedService.recalculate()
  showToast('已重新计算 Wanted Quantities', 'ok')
}
async function genForms() {
  const res = await stockWantedService.generateRequisitions()
  if (!res.ok) return showToast('无缺货物料', 'info')
  showToast(`已生成采购申请 ${res.formNo}（${res.count} 项）`, 'ok')
}
function purchase() { showToast('跳转至 Purchase Forms（原型演示）', 'info') }
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
.bw-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.bw-body.single { flex: 1; overflow: auto; }
.bw-list { height: 100%; overflow: auto; }
.hint { font-size: 11.5px; color: var(--amos-text-soft); margin-top: 10px; }
.need { color: var(--amos-danger); }
</style>
