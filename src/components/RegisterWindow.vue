<template>
  <div class="biz-win" v-if="config">
    <div class="bw-head">
      <h2>{{ config.windowTitle }}</h2>
      <div class="bw-actions">
        <input
          v-model.trim="q"
          class="amos-input sm"
          style="max-width:200px"
          placeholder="搜索…"
          @keyup.enter="onSearch"
        />
        <button class="amos-btn sm" @click="onSearch">Search</button>
        <button class="amos-btn sm" @click="doNew">New</button>
        <button class="amos-btn sm primary" @click="doSave" :disabled="!selected">Save</button>
        <button class="amos-btn sm" @click="doDelete" :disabled="!selected || isNew(selected)">Delete</button>
        <button class="amos-btn sm" @click="doRefresh">Refresh</button>
      </div>
    </div>

    <!-- 分页条：后端分页（PR #8）驱动；总数 > 每页大小时出现翻页按钮 -->
    <div class="bw-pager">
      <span class="muted rec-count">{{ total }} 条记录</span>
      <button class="amos-btn xs" @click="goFirst" :disabled="page === 0 || loading">« 首页</button>
      <button class="amos-btn xs" @click="goPrev" :disabled="page === 0 || loading">‹ 上一页</button>
      <span class="muted">第 {{ page + 1 }} / {{ totalPages }} 页</span>
      <button class="amos-btn xs" @click="goNext" :disabled="page >= totalPages - 1 || loading">下一页 ›</button>
      <button class="amos-btn xs" @click="goLast" :disabled="page >= totalPages - 1 || loading">末页 »</button>
      <span class="spacer" />
      <label class="muted">每页
        <select class="amos-select xs" v-model.number="size" @change="onSizeChange">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </label>
      <span v-if="loading" class="muted">加载中…</span>
    </div>

    <div class="bw-body">
      <section class="bw-list">
        <RecordList
          ref="listRef"
          :columns="config.columns"
          :rows="rows"
          :searchable="false"
          row-key="id"
          :preselect-id="preselectId"
          @select="onSelect"
          @open="onSelect"
        >
          <template #cell-color="{ value }">
            <span class="crit-indicator" :style="{ background: value }" :title="value" />
            <span class="crit-text">{{ value }}</span>
          </template>
        </RecordList>
      </section>

      <section class="bw-detail" v-if="selected">
        <div class="bd-head">
          <strong>{{ selected[config.codeField] || config.windowTitle }}</strong>
          <span class="tag" :class="statusClass">{{ statusText }}</span>
        </div>
        <RecordDetail :tabs="detailTabs" :model="selected" />
      </section>
      <section v-else class="bw-detail empty">
        <p class="muted">双击列表行查看明细，或点击 <b>New</b> 创建记录。</p>
      </section>
    </div>

    <div v-if="!config" class="bw-empty muted">该窗口未配置。</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onActivated } from 'vue'
import RecordList from './RecordList.vue'
import RecordDetail from './RecordDetail.vue'
import { store, showToast } from '../store.js'
import { registerService } from '../services/registerService.js'
import { registerRegistry } from '../registerRegistry.js'
import { loadRegisterLookups } from '../store/session.js'

const config = computed(() => registerRegistry[store.activeKey] || null)

// RecordDetail 需要的 tabs 结构：单个 General 标签，字段来自 config.detailFields
const detailTabs = computed(() => (config.value
  ? [{ id: 'general', label: 'General', fields: config.value.detailFields }]
  : []))

const rows = ref([])
const selected = ref(null)
const preselectId = ref('')
const listRef = ref(null)

// ===== 分页 / 搜索状态（驱动后端 PR #8 分页增强）=====
const page = ref(0)
const size = ref(20)
const total = ref(0)
const totalPages = ref(1)
const sort = ref('')
const q = ref('')
const loading = ref(false)

const statusText = computed(() => {
  if (!selected.value || !config.value) return '—'
  const v = selected.value[config.value.statusField]
  if (config.value.statusKind === 'boolean') return v ? 'Active' : 'Inactive'
  return v || '—'
})
const statusClass = computed(() => {
  const v = String(statusText.value).toLowerCase()
  if (/(active|true)/.test(v)) return 'green'
  if (/(inactive|false)/.test(v)) return 'gray'
  return 'gray'
})

function isNew(row) {
  return !row || String(row.id).startsWith('new_')
}

async function load() {
  if (!config.value) return
  loading.value = true
  try {
    const data = await registerService.list(store.activeKey, {
      page: page.value,
      size: size.value,
      sort: sort.value,
      q: q.value || undefined,
    })
    // 后端返回 Spring Page 信封（带 page/size 时）或数组（兼容/演示回落）
    if (data && !Array.isArray(data) && Array.isArray(data.content)) {
      rows.value = data.content
      total.value = data.totalElements ?? data.content.length
      totalPages.value = data.totalPages ?? 1
      // 防止后端 totalPages 与实际不符时卡在越界页
      if (page.value > totalPages.value - 1) {
        page.value = Math.max(0, totalPages.value - 1)
      }
    } else {
      const arr = Array.isArray(data) ? data : []
      rows.value = arr
      total.value = arr.length
      totalPages.value = 1
      page.value = 0
    }
  } catch (e) {
    rows.value = []
    total.value = 0
    totalPages.value = 1
    showToast('加载失败：' + (e.message || '后端不可达'), 'warn')
  } finally {
    loading.value = false
  }
}

// 选中行 → 复制为响应式对象，使明细编辑立即可见（保存时回写后端）
function onSelect(row) {
  selected.value = reactive({ ...row })
}

function blankRecord() {
  const c = config.value
  const rec = {}
  if (c.statusKind === 'boolean') rec[c.statusField] = true
  else rec[c.statusField] = 'ACTIVE'
  c.detailFields.forEach((f) => { if (rec[f.key] === undefined) rec[f.key] = '' })
  rec.id = 'new_' + Date.now()
  return rec
}
function doNew() {
  if (!config.value) return
  selected.value = reactive(blankRecord())
  preselectId.value = String(selected.value.id)
  showToast('已新建记录，编辑后点击 Save', 'ok')
}

async function doSave() {
  if (!selected.value) return showToast('请先选择或新建记录', 'warn')
  const c = config.value
  const row = selected.value
  const isNewRow = isNew(row)
  // 构建 payload（新建时去掉临时 id；其余字段原样回写）
  const payload = { ...row }
  delete payload.id
  try {
    let saved
    if (isNewRow) saved = await registerService.create(store.activeKey, payload)
    else saved = await registerService.update(store.activeKey, row.id, payload)
    await load()
    // 选中保存后的行（后端返回的 id），若不在当前页则回落清空
    const id = saved && saved.id != null ? saved.id : row.id
    const found = rows.value.find((r) => r.id === id)
    selected.value = found ? reactive({ ...found }) : null
    preselectId.value = found ? String(id) : ''
    await refreshCache()
    showToast(isNewRow ? '已创建记录' : '已保存记录', 'ok')
  } catch (e) {
    showToast('保存失败：' + (e.message || '后端错误'), 'warn')
  }
}

async function doDelete() {
  if (!selected.value) return showToast('请先选择记录', 'warn')
  if (isNew(selected.value)) { selected.value = null; return }
  const row = selected.value
  const deletedId = row.id
  try {
    await registerService.remove(store.activeKey, row.id)
    await load()
    // 区分物理删除（记录消失）与软删（仍残留在列表中、仅置为 Inactive）
    const stillThere = rows.value.some((r) => r.id === deletedId)
    selected.value = null
    await refreshCache()
    showToast(stillThere ? '已停用该记录' : '已删除该记录', stillThere ? 'warn' : 'ok')
  } catch (e) {
    showToast('删除失败：' + (e.message || '后端错误'), 'warn')
  }
}

async function doRefresh() {
  await load()
  showToast('已刷新', 'info')
}

// 分页 / 搜索动作
function onSearch() { page.value = 0; load() }
function onSizeChange() { page.value = 0; load() }
function goFirst() { if (page.value !== 0) { page.value = 0; load() } }
function goPrev() { if (page.value > 0) { page.value--; load() } }
function goNext() { if (page.value < totalPages.value - 1) { page.value++; load() } }
function goLast() { if (totalPages.value > 1 && page.value !== totalPages.value - 1) { page.value = totalPages.value - 1; load() } }

// 写回后端后刷新 session.registerCache，使各业务窗口的 lookup 即时更新
async function refreshCache() {
  try { await loadRegisterLookups() } catch (e) { /* 忽略缓存刷新失败 */ }
}

// 切换 register 页面 / 激活窗口时重新加载（重置到首页）
watch(() => store.activeKey, (k) => {
  if (k && registerRegistry[k]) {
    selected.value = null
    page.value = 0
    q.value = ''
    load()
  }
})
onMounted(load)
onActivated(load)
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
/* Function Criticality 列表 Indicator 列的颜色块 */
.crit-indicator { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; box-shadow: 0 0 0 1px rgba(0,0,0,0.08) inset; }
.crit-text { color: #2c3e50; }
.bw-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.bw-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; justify-content: flex-end; flex: 1; }
.bw-actions .amos-input { flex-shrink: 0; }
.bw-actions .amos-btn { flex-shrink: 0; }
/* 分页条 */
.bw-pager .rec-count { white-space: nowrap; }
.bw-pager { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-bottom: 1px solid var(--amos-border); background: #f7f9fc; font-size: 12px; }
.bw-pager .spacer { flex: 1; }
.bw-pager .amos-select.xs { padding: 2px 4px; font-size: 12px; }
.bw-body { flex: 1; display: grid; grid-template-columns: minmax(640px, 1.4fr) 1fr; min-height: 0; }
.bw-list { border-right: 1px solid var(--amos-border); padding: 8px; min-height: 0; min-width: 0; display: flex; }
.bw-list > * { flex: 1; }
.bw-detail { padding: 10px; overflow: auto; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.bw-detail.empty { display: flex; align-items: center; justify-content: center; }
.bd-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed var(--amos-border); }
.bw-empty { padding: 30px; text-align: center; }
@media (max-width: 980px) {
  .bw-body { grid-template-columns: 1fr; }
  .bw-list { border-right: none; border-bottom: 1px solid var(--amos-border); }
}
</style>
