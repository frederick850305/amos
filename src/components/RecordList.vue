<template>
  <div class="record-list">
    <div class="rl-toolbar">
      <input v-model="q" class="amos-input" style="max-width:280px" placeholder="在列表中搜索…" />
      <span class="spacer" />
      <span v-if="selectable" class="muted">已选 {{ checkedList.length }} 条</span>
      <span class="muted">{{ filtered.length }} / {{ rows.length }} 条</span>
    </div>
    <div class="rl-scroll">
      <table class="amos-grid">
        <thead>
          <tr>
            <th v-if="selectable" class="col-check">
              <input type="checkbox" :checked="allChecked" @change="toggleAll" title="全选" />
            </th>
            <th
              v-for="c in columns"
              :key="c.key"
              :style="colStyle(c)"
              @click="sortBy(c.key)"
            >
              {{ c.label }}
              <span v-if="sortKey === c.key" class="sort-caret">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
              <span class="col-resize" @mousedown.stop.prevent="startResize($event, c.key)"></span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="grp in grouped" :key="grp.key || 'all'">
            <tr v-if="grp.label" class="grp-header">
              <td :colspan="groupColspan">
                <span class="grp-title">{{ grp.label }}</span>
                <span class="grp-count">{{ grp.rows.length }}</span>
              </td>
            </tr>
            <tr
              v-for="row in grp.rows"
              :key="rowId(row)"
              :class="{ selected: rowId(row) === selectedId }"
              @click="select(row)"
              @dblclick="$emit('open', row)"
            >
              <td v-if="selectable" class="col-check" @click.stop>
                <input type="checkbox" :checked="checkedSet.has(rowId(row))" @change="toggle(row)" />
              </td>
              <td
                v-for="c in columns"
                :key="c.key"
                :style="colStyle(c)"
                :class="{ num: c.align === 'right' }"
              >
                <slot :name="'cell-' + c.key" :row="row" :value="row[c.key]">
                  <span v-if="c.tag" :class="['tag', tagClass(row[c.key])]">{{ row[c.key] }}</span>
                  <span v-else>{{ row[c.key] }}</span>
                </slot>
              </td>
            </tr>
          </template>
          <tr v-if="!filtered.length">
            <td :colspan="groupColspan" class="muted" style="text-align:center;padding:18px">无记录（点击 New 或调整 Filter）</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { installations } from '../data/amosData.js'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  selectable: { type: Boolean, default: false },
  checked: { type: Array, default: () => [] },
  preselectId: { type: String, default: '' },
  // 手册 Fleet 场景：按某字段（如 installation = 船）对列表分组，每组前插入不可选中的分组标题行
  groupBy: { type: String, default: '' },
})
const emit = defineEmits(['select', 'open', 'update:checked'])

// 业务主键可能为空（如 New 产生的临时记录 jobNo=''），此时退回到 row.id 保证 key 唯一，避免 v-for 渲染异常
function rowId(row) {
  return String(row[props.rowKey] || row.id)
}

const q = ref('')
const sortKey = ref('')
const sortDir = ref('asc')
const selectedId = ref('')
const checkedSet = ref(new Set(props.checked))

// ===== 列宽拖拽调整 =====
const colWidths = ref({})
const resizing = ref(null) // { key, startX, startW }

function colStyle(c) {
  const w = colWidths.value[c.key] || c.width
  return w ? { width: w } : null
}

function startResize(e, key) {
  const th = e.target.parentElement
  const rect = th.getBoundingClientRect()
  resizing.value = { key, startX: e.clientX, startW: rect.width }
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e) {
  const r = resizing.value
  if (!r) return
  const diff = e.clientX - r.startX
  const newW = Math.max(60, r.startW + diff)
  colWidths.value[r.key] = newW + 'px'
}

function onResizeEnd() {
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  resizing.value = null
}

watch(() => props.checked, (v) => { checkedSet.value = new Set(v) })

// 外部指令性预选中：当父组件传入 preselectId 时同步到内部选中状态（用于回跳上下文恢复等场景）
import { watch as watchPreselect } from 'vue'
watchPreselect(() => props.preselectId, (id) => {
  if (id) selectedId.value = id
})

const filtered = computed(() => {
  let list = props.rows
  const s = q.value.trim().toLowerCase()
  if (s) {
    list = list.filter((r) => props.columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(s)))
  }
  if (sortKey.value) {
    list = [...list].sort((a, b) => {
      const av = a[sortKey.value]
      const bv = b[sortKey.value]
      if (av == null) return 1
      if (bv == null) return -1
      const r = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir.value === 'asc' ? r : -r
    })
  }
  return list
})

const checkedList = computed(() => props.rows.filter((r) => checkedSet.value.has(rowId(r))))
const allChecked = computed(() => filtered.value.length > 0 && filtered.value.every((r) => checkedSet.value.has(rowId(r))))

// ===== 按船（或其他字段）分组显示 =====
const installationName = (code) => (installations.find((i) => i.code === code)?.name) || code || '未分配船'
// 分组顺序跟随 installations 定义（Traveller → Voyager → Endeavour），未识别的船排在最后
const grouped = computed(() => {
  const list = filtered.value
  if (!props.groupBy) return [{ key: '', label: '', rows: list }]
  const order = installations.map((i) => i.code)
  const map = new Map()
  list.forEach((r) => {
    const k = r[props.groupBy] || ''
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  })
  const keys = [...map.keys()].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    if (ia < 0 && ib < 0) return String(a) < String(b) ? -1 : 1
    if (ia < 0) return 1
    if (ib < 0) return -1
    return ia - ib
  })
  return keys.map((k) => ({ key: k, label: installationName(k), rows: map.get(k) }))
})
const groupColspan = computed(() => props.columns.length + (props.selectable ? 1 : 0))

function emitChecked() { emit('update:checked', [...checkedSet.value]) }
function toggle(row) {
  const k = rowId(row)
  if (checkedSet.value.has(k)) checkedSet.value.delete(k)
  else checkedSet.value.add(k)
  checkedSet.value = new Set(checkedSet.value)
  emitChecked()
}
function toggleAll(e) {
  const on = e.target.checked
  filtered.value.forEach((r) => { const k = rowId(r); if (on) checkedSet.value.add(k); else checkedSet.value.delete(k) })
  checkedSet.value = new Set(checkedSet.value)
  emitChecked()
}

function sortBy(key) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
function select(row) {
  selectedId.value = rowId(row)
  emit('select', row)
}
function tagClass(val) {
  if (typeof val !== 'string') return 'gray'
  const v = val.toLowerCase()
  if (/(completed|available|active|passed|posted|open|issued|received)/.test(v)) return 'green'
  if (/(requested|planned|quoted|approved|partly|submitted|in transit|stable)/.test(v)) return 'blue'
  if (/(overdue|critical|shortage|rejected|postponed|cancelled|draft|up)/.test(v)) return 'red'
  if (/(due|pending|warning|orange)/.test(v)) return 'orange'
  return 'gray'
}
function clearSelection() {
  selectedId.value = ''
}
// 外部指令性强制选中某行（用于回跳上下文恢复 / presetFilter 定位）：
// 即使 preselectId 与当前值相同（keep-alive 复用实例时常见），也能重新高亮目标行。
function preselect(id) { if (id) selectedId.value = id }
defineExpose({ clearSelection, selectedId, preselect })
</script>

<style scoped>
.record-list { display: flex; flex-direction: column; height: 100%; }
.rl-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 4px; }
.rl-scroll { flex: 1; overflow: auto; border: 1px solid var(--amos-border); border-radius: 6px; background: #fff; }
.col-check { width: 34px; text-align: center; }
.sort-caret { font-size: 9px; color: var(--amos-blue); margin-left: 3px; }
/* 列表表格按列宽自然扩展，列宽总和超出容器时显示横向滚动条，避免固定宽度的列被压缩导致内容截断 */
.amos-grid { width: auto; min-width: 100%; }
/* 列宽调整手柄 */
.col-resize { position: absolute; right: 0; top: 4px; bottom: 4px; width: 5px; cursor: col-resize; }
.col-resize::after { content: ''; position: absolute; left: 2px; top: 0; bottom: 0; width: 1px; background: var(--amos-border); opacity: 0; transition: opacity .15s; }
.col-resize:hover::after, .col-resize.active::after { opacity: 1; background: var(--amos-blue); }
.amos-grid thead th { position: relative; }
/* 按船分组：分组标题行（不可选中），清晰区分不同 Installation */
.grp-header td { background: linear-gradient(180deg, #eaf1f9, #e1ebf5); border-top: 1px solid var(--amos-border); padding: 5px 10px; }
.grp-title { font-weight: 700; color: #2c486a; font-size: 12.5px; }
.grp-count { margin-left: 8px; font-size: 11px; color: #6b7c92; background: #fff; border: 1px solid var(--amos-border); border-radius: 999px; padding: 0 8px; }
</style>
