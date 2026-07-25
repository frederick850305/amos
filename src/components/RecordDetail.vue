<template>
  <div class="record-detail">
    <div class="tab-row">
      <div
        v-for="t in tabs"
        :key="t.id"
        class="tab"
        :class="{ active: active === t.id }"
        @click="switchTab(t.id)"
      >{{ t.label }}</div>
    </div>
    <div class="tab-body" style="border-top:none">
      <div v-for="t in tabs" v-show="active === t.id" :key="t.id">
        <!-- 手册 2 / P37-39：Jobs / Parts / Related 可编辑子表 -->
        <template v-if="t.type === 'subgrid'">
          <div class="subgrid-bar" v-if="!t.readonly">
            <button class="amos-btn xs" @click="addSubRow(t)">New</button>
            <button v-for="a in (t.subActions || [])" :key="a.id" class="amos-btn xs" @click="runSubAction(t, a)">{{ a.label }}</button>
            <span class="muted">{{ subRows(t).length }} 条记录</span>
          </div>
          <div class="table-wrap"><table class="amos-grid sub">
            <thead><tr>
              <th v-for="c in t.columns" :key="c.key" :style="subColStyle(t, c)">{{ c.label }}<span class="col-resize" @mousedown.stop.prevent="startSubResize($event, t, c.key)"></span></th>
              <th class="sub-actions"></th>
            </tr></thead>
            <tbody>
              <tr v-for="(row, ri) in subRows(t)" :key="rowKeyOf(row, ri)" :class="{ 'sub-sel': isSubSelected(row) }" @click="selectSubRow(row)">
                <td v-for="c in t.columns" :key="c.key" :style="subColStyle(t, c)">
                  <span v-if="c.readonly" class="cell-ro">{{ row[c.key] }}</span>
                  <template v-else-if="c.type === 'lookup'">
                    <span class="cell-lookup">
                      <input class="amos-input sm" :value="row[c.key]" readonly :placeholder="'选择…'" />
                      <button class="lookup-btn" type="button" @click="openSubLookup(t, c, row)">…</button>
                    </span>
                  </template>
                  <select v-else-if="c.type === 'select'" v-model="row[c.key]" class="amos-select sm">
                    <option v-for="o in c.options" :key="o" :value="o">{{ o }}</option>
                  </select>
                  <input v-else-if="c.type === 'number'" type="number" v-model.number="row[c.key]" class="amos-input sm" />
                  <input v-else-if="c.type === 'date'" type="date" v-model="row[c.key]" class="amos-input sm" />
                  <input v-else type="text" v-model="row[c.key]" class="amos-input sm" :placeholder="c.label" />
                </td>
                <td class="sub-actions"><button class="amos-btn xs danger" @click="delSubRow(t, row)">Del</button></td>
              </tr>
              <tr v-if="!subRows(t).length">
                <td :colspan="t.columns.length + 1" class="muted" style="text-align:center;padding:10px">（空）点击 New 添加</td>
              </tr>
          </tbody>
        </table></div>
      </template>
      <template v-else-if="t.type === 'agg-list'">
        <!-- 手册 P181/P184：Stock Types 只读聚合标签页（Used in Component Types / Available Stock / Purchase History） -->
        <div class="table-wrap"><table class="amos-grid sub">
          <thead><tr>
            <th v-for="c in t.columns" :key="c.key" :style="subColStyle(t, c)">{{ c.label }}</th>
          </tr></thead>
          <tbody>
            <tr v-for="(row, ri) in aggRows(t)" :key="ri">
              <td v-for="c in t.columns" :key="c.key" :style="subColStyle(t, c)">{{ row[c.key] }}</td>
            </tr>
            <tr v-if="!aggRows(t).length">
              <td :colspan="t.columns.length" class="muted" style="text-align:center;padding:10px">（无记录）</td>
            </tr>
          </tbody>
        </table></div>
      </template>
      <template v-else-if="t.type === 'rotation-log'">
          <div class="subgrid-bar">
            <button v-for="a in (t.subActions || [])" :key="a.id" class="amos-btn xs" @click="runRotationAction(t, a)">{{ a.label }}</button>
            <span class="muted">{{ rotationCycles(t).length }} 条记录</span>
          </div>
          <div class="table-wrap"><table class="amos-grid sub">
            <thead><tr>
              <th v-for="c in t.columns" :key="c.key" :style="subColStyle(t, c)">{{ c.label }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="(row, ri) in rotationCycles(t)" :key="ri" :class="{ 'sub-sel': isRotationSelected(row) }" @click="selectRotationRow(row)">
                <td v-for="c in t.columns" :key="c.key" :style="subColStyle(t, c)">{{ row[c.key] }}</td>
              </tr>
              <tr v-if="!rotationCycles(t).length">
                <td :colspan="t.columns.length" class="muted" style="text-align:center;padding:10px">（无安装 / 拆卸历史）</td>
              </tr>
            </tbody>
          </table></div>
        </template>
        <template v-else-if="t.type === 'installed-component'">
          <div v-if="installedComponentOf(t)" class="installed-comp">
            <div v-for="f in (t.fields || [])" :key="f.key" class="amos-field">
              <label>{{ f.label }}</label>
              <div class="ctrl"><input class="amos-input" :value="installedComponentOf(t)[f.key]" readonly /></div>
            </div>
          </div>
          <p v-else class="muted" style="padding:10px">（未安装组件）</p>
        </template>
        <template v-else-if="t.type === 'counter-list'">
          <!-- 手册 P82：Counters —— 组件已登记计数器列表（仅当组件 / 类型先列出计数器时才可选；此处只读展示） -->
          <div class="table-wrap"><table class="amos-grid sub">
            <thead><tr>
              <th v-for="c in t.columns" :key="c.key" :style="subColStyle(t, c)">{{ c.label }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="(row, ri) in counterList(t)" :key="ri">
                <td v-for="c in t.columns" :key="c.key" :style="subColStyle(t, c)">{{ row[c.key] }}</td>
              </tr>
              <tr v-if="!counterList(t).length">
                <td :colspan="t.columns.length" class="muted" style="text-align:center;padding:10px">（组件未登记计数器）</td>
              </tr>
            </tbody>
          </table></div>
        </template>
        <template v-else>
          <div v-for="f in visibleFields(t)" :key="f.key" class="amos-field">
            <p v-if="f.key === '_note'" class="rd-note">{{ f.value }}</p>
            <template v-else>
            <label>{{ f.label }}
              <button
                v-if="showIndicators && model.inheritedFrom && linkableKeys.includes(f.key)"
                type="button" class="link-ind" :class="isLinked(f.key) ? 'on' : 'off'"
                :title="isLinked(f.key) ? '已链接到类型作业（点击解除链接）' : '已解除链接（点击重新链接）'"
                @click.stop="toggleLink(f.key)"
              >{{ isLinked(f.key) ? '🔗' : '🔓' }}</button>
            </label>
            <div class="ctrl">
              <template v-if="f.type === 'lookup'">
                <input class="amos-input" :value="model[f.key]" readonly :placeholder="f.placeholder || '选择…'" />
                <button class="lookup-btn" type="button" @click="openLookup(f)">…</button>
              </template>
              <template v-else-if="f.type === 'lookup-with-name'">
                <div class="lookup-with-name-row">
                  <input class="amos-input" :value="model[f.key]" readonly :placeholder="f.placeholder || 'Code…'" />
                  <input class="amos-input" :value="lookupNameOf(f.lookupKey, model[f.key])" readonly :placeholder="f.namePlaceholder || 'Name…'" />
                  <button class="lookup-btn" type="button" @click="openLookup(f)">…</button>
                </div>
              </template>
              <template v-else-if="f.type === 'component-performing'">
                <div class="cpf-row">
                  <input class="amos-input" :value="model[f.key]" readonly :placeholder="'Component No.'" />
                  <input class="amos-input" :value="componentNameOf(model[f.key])" readonly :placeholder="'Component Name'" />
                </div>
              </template>
              <select v-else-if="f.type === 'select'" v-model="model[f.key]" class="amos-select" :disabled="f.readonly">
                <option v-for="o in selectOptions(f)" :key="o" :value="o">{{ o }}</option>
              </select>
              <input v-else-if="f.type === 'color'" type="color" v-model="model[f.key]" class="amos-color" :disabled="f.readonly" />
              <textarea v-else-if="f.type === 'textarea'" v-model="model[f.key]" class="amos-textarea" :readonly="f.readonly" />
              <input v-else-if="f.type === 'number'" type="number" v-model.number="model[f.key]" class="amos-input" :readonly="f.readonly" />
              <input v-else-if="f.type === 'date'" type="date" v-model="model[f.key]" class="amos-input" :readonly="f.readonly" />
              <label v-else-if="f.type === 'checkbox'" class="amos-check"><input type="checkbox" v-model="model[f.key]" :disabled="f.readonly" /> {{ f.checkLabel || '' }}</label>
              <input v-else-if="f.type === 'readonly'" type="text" class="amos-input" :value="model[f.key] !== undefined && model[f.key] !== '' ? model[f.key] : f.value" readonly />
              <input v-else type="text" v-model="model[f.key]" class="amos-input" :readonly="f.readonly" :placeholder="f.placeholder || ''" />
            </div>
            </template>
          </div>
          <!-- 手册 P60：Job Description 标签内嵌 JD 库子表（Code / Revision / Title / Frequency / Window） -->
          <div v-if="t.subgrid" class="rd-subsection">
            <h4 v-if="t.subgrid.title" class="rd-subtitle">{{ t.subgrid.title }}</h4>
            <div class="subgrid-bar" v-if="!t.subgrid.readonly">
              <button class="amos-btn xs" @click="addSubRow(t.subgrid)">New</button>
              <span class="muted">{{ subRows(t.subgrid).length }} 条记录</span>
            </div>
            <div class="table-wrap"><table class="amos-grid sub">
              <thead><tr>
                <th v-for="c in t.subgrid.columns" :key="c.key" :style="subColStyle(t.subgrid, c)">{{ c.label }}<span class="col-resize" @mousedown.stop.prevent="startSubResize($event, t.subgrid, c.key)"></span></th>
                <th class="sub-actions" v-if="!t.subgrid.readonly"></th>
              </tr></thead>
              <tbody>
                <tr v-for="(row, ri) in subRows(t.subgrid)" :key="rowKeyOf(row, ri)" :class="{ 'sub-sel': isSubSelected(row) }" @click="selectSubRow(row)">
                  <td v-for="c in t.subgrid.columns" :key="c.key" :style="subColStyle(t.subgrid, c)">
                    <span v-if="c.readonly" class="cell-ro">{{ row[c.key] }}</span>
                    <template v-else-if="c.type === 'lookup'">
                      <span class="cell-lookup">
                        <input class="amos-input sm" :value="row[c.key]" readonly :placeholder="'选择…'" />
                        <button class="lookup-btn" type="button" @click="openSubLookup(t.subgrid, c, row)">…</button>
                      </span>
                    </template>
                    <select v-else-if="c.type === 'select'" v-model="row[c.key]" class="amos-select sm">
                      <option v-for="o in c.options" :key="o" :value="o">{{ o }}</option>
                    </select>
                    <input v-else-if="c.type === 'number'" type="number" v-model.number="row[c.key]" class="amos-input sm" />
                    <input v-else-if="c.type === 'date'" type="date" v-model="row[c.key]" class="amos-input sm" />
                    <input v-else type="text" v-model="row[c.key]" class="amos-input sm" :placeholder="c.label" />
                  </td>
                  <td class="sub-actions" v-if="!t.subgrid.readonly"><button class="amos-btn xs danger" @click="delSubRow(t.subgrid, row)">Del</button></td>
                </tr>
                <tr v-if="!subRows(t.subgrid).length">
                  <td :colspan="t.subgrid.columns.length + (t.subgrid.readonly ? 0 : 1)" class="muted" style="text-align:center;padding:10px">（空）</td>
                </tr>
              </tbody>
            </table></div>
          </div>
        </template>
        <slot :name="'extra-' + t.id" :model="model" />
      </div>
    </div>

    <LookupDialog
      v-if="lookupField"
      :title="lookupField.label"
      :options="lookupOptions"
      @select="onLookupSelect"
      @cancel="lookupField = null"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import LookupDialog from './LookupDialog.vue'
import { lookups } from '../mock/index.js'
import { collectionService } from '../services/collectionService.js'
import { componentService } from '../services/componentService.js'
import { functionService } from '../services/functionService.js'

const props = defineProps({
  tabs: { type: Array, required: true },
  model: { type: Object, required: true },
  presetTabId: { type: String, default: '' }, // 外部指令：强制切换到指定 tab（如注册组件后跳转 Components）
  showIndicators: { type: Boolean, default: false }, // 手册 P61-64：Options > Show Indicators 时显示字段链接图标
  linkableKeys: { type: Array, default: () => [] }, // 可参与链接的字段 key 列表（作业 General 标签）
})
const emit = defineEmits(['change', 'subaction', 'toggle-link'])

// 手册 P61-64：字段是否已链接到 Component Type Job（仅继承作业有 linkedFields）
function isLinked(key) {
  return (props.model?.linkedFields || []).includes(key)
}
// 点击链接图标：切换该字段的链接状态（由父组件持久化到 model.linkedFields）
function toggleLink(key) {
  emit('toggle-link', { key })
}

// 手册 P30 导航体验优化：每个窗口的详情标签页状态持久化，
// 切换窗口再切回后保留用户之前所在的 tab（而非总是重置到 General）
// 使用模块级 Map 按 windowKey 缓存，RecordDetail 组件不感知外部 windowKey
// 由父组件 BusinessWindow 通过 detailTabKey prop 传入唯一标识
const _tabCache = new Map()

function getActive(key) {
  const cached = _tabCache.get(key)
  const valid = cached && props.tabs.some((t) => t.id === cached)
  return valid ? cached : props.tabs[0]?.id || ''
}

function setActive(key, val) {
  _tabCache.set(key, val)
}

const active = ref(getActive('default'))

// 手册 P40：Rotation Log 周期视图（Component No./Name/Installed/By/Removed/By）
// 注意：必须放在 watch(modelId) 之前，因为 immediate watch 会引用该变量。
const selectedRotation = ref(null)
function rotationCycles(t) {
  return functionService.buildRotationCycles(props.model?.[t.sourceKey || 'rotationLog'])
}
function selectRotationRow(row) { selectedRotation.value = row }
function isRotationSelected(row) { return selectedRotation.value === row }
function runRotationAction(t, a) {
  emit('subaction', { action: a.id, tabId: t.id, row: selectedRotation.value })
}

// 监听 model 变化（选中记录切换时）以决定是否使用缓存或默认
import { watch, toRef } from 'vue'
const modelId = computed(() => props.model?.id || props.model?.typeNumber || 'unknown')
watch(modelId, (newId) => {
  const cacheKey = newId
  // 切换记录时清空 Rotation Log 行选中，避免残留旧选中
  selectedRotation.value = null
  if (!_tabCache.has(cacheKey)) {
    // 首次打开该记录 → 默认首 tab
    active.value = props.tabs[0]?.id || ''
    _tabCache.set(cacheKey, active.value)
  } else {
    // 切回已缓存的记录 → 恢复之前的 tab
    active.value = getActive(cacheKey)
  }
}, { immediate: true })

// 监听 presetTabId：外部指令性切换 tab（如 Register as Component 后自动跳转 Components）
import { watch as watchPreset } from 'vue'
watchPreset(() => props.presetTabId, (id) => {
  if (id && props.tabs.some((t) => t.id === id)) {
    switchTab(id)
  }
})

function switchTab(id) {
  active.value = id
  setActive(modelId.value, id)
}
// 手册 P44：字段支持 showIf 条件显示（如 Jobs 中 Counter Code 仅当 Planning Method = Counter 出现）
// showIf 支持两种形式：{ key, value }（值相等时显示）或 { key, truthy: true }（该字段有值时显示）
function visibleFields(t) {
  return (t.fields || []).filter((f) => {
    if (!f.showIf) return true
    if (f.showIf.truthy) return !!props.model[f.showIf.key]
    return props.model[f.showIf.key] === f.showIf.value
  })
}
// 手册 P40 step 5：只读 Installed Component 标签 —— 查找当前执行该功能位置的组件
function installedComponentOf() {
  const no = props.model?.installedComponentId
  if (!no) return null
  return componentService.listSync().find((c) => c.number === no) || null
}
// 手册 P40：Component Performing the Function 双栏显示组件编号 + 名称
function componentNameOf(componentNo) {
  if (!componentNo) return ''
  const comp = componentService.listSync().find((c) => c.number === componentNo)
  return comp?.name || ''
}
// 通用 lookup 双栏：根据 lookupKey 返回当前 code 对应的名称（去掉 "code — " 前缀）
function lookupNameOf(lookupKey, code) {
  if (!code || !lookupKey) return ''
  const fn = lookups[lookupKey]
  const options = (fn ? fn(props.model) : []) || []
  const found = options.find((o) => o.code === code)
  if (!found) return ''
  const prefix = code + ' — '
  return found.label.startsWith(prefix) ? found.label.slice(prefix.length) : found.label
}
// 手册 P44-46：select 字段若带 lookupKey，则从对应 register（如 FunctionCriticality）读取选项
function selectOptions(f) {
  if (f.lookupKey) {
    const fn = lookups[f.lookupKey]
    const list = (fn ? fn(props.model) : []) || []
    return list.map((o) => o.code)
  }
  return f.options || []
}
const lookupField = ref(null)
const lookupOptions = ref([])

function openLookup(f) {
  lookupField.value = f
  const fn = lookups[f.lookupKey]
  lookupOptions.value = (fn ? fn(props.model) : []) || []
}
function onLookupSelect(code) {
  if (lookupField.value) {
    const f = lookupField.value
    if (f._row) f._row[f.key] = code
    else props.model[f.key] = code
    // 手册 P60：选择 Job Description 后自动带出 Revision / Title（alsoFill 声明需要联动填充的字段）
    if (f.alsoFill && f.lookupKey) {
      const fn = lookups[f.lookupKey]
      const opt = (fn ? fn(props.model) : []).find((o) => o.code === code)
      if (opt) {
        if (f.alsoFill.revision != null) props.model[f.alsoFill.revision] = opt.revision
        if (f.alsoFill.title != null) props.model[f.alsoFill.title] = opt.title
      }
    }
    emit('change', { key: f.key, value: code })
  }
  lookupField.value = null
}

// ===== 可编辑子表（手册 2 / P37-39：Jobs / Parts / Related）=====
function subRows(t) {
  if (t.subSource) {
    const src = collectionService.collection(t.subSource.dbKey)
    // 手册 P60：JD 库子表（如 Job Description 标签）无 filterKey → 展示全库
    if (!t.subSource.filterKey) return src
    return src.filter((r) => r[t.subSource.filterKey] === props.model[t.subSource.filterModelKey])
  }
  const key = t.subKey
  if (!props.model[key]) props.model[key] = []
  return props.model[key]
}
// 手册 P82：Counters 标签 —— 读取当前作业所属组件 / 类型已登记的计数器列表（只读）
function counterList(t) {
  const no = props.model?.targetId
  if (!no) return []
  const comp = componentService.listSync().find((c) => c.number === no)
  if (comp?.componentCounters?.length) {
    return comp.componentCounters.map((cc) => ({
      code: cc.code, description: cc.description, unit: cc.unit || '',
      currentValue: cc.currentValue != null ? cc.currentValue : '',
    }))
  }
  const cts = collectionService.collection('componentTypes')
  const ct = cts.find((x) => x.typeNumber === no)
  if (ct?.counters?.length) {
    return ct.counters.map((cc) => ({
      code: cc.code, description: cc.description, unit: cc.unit || '',
      currentValue: cc.currentValue != null ? cc.currentValue : '',
    }))
  }
  return []
}
// 手册 P181/P184：Stock Types 只读聚合标签页（Used in Component Types / Available Stock / Purchase History）
function aggRows(t) {
  const no = props.model?.stockTypeNo
  if (!no) return []
  // Used in Component Types：反查引用本 Stock Type 的组件类型
  if (t.aggKey === 'usedInComponentTypes') {
    return collectionService.collection('componentTypes')
      .filter((ct) => (ct.parts || []).some((p) => p.stockTypeNo === no))
      .map((ct) => ({ typeNumber: ct.typeNumber, name: ct.name, status: ct.status }))
  }
  // Available Stock：本 Stock Type 在各地点注册为 Stock Items 后的库存汇总
  if (t.aggKey === 'availableStock') {
    const items = collectionService.collection('stockItems').filter((s) => s.stockTypeNo === no)
    const map = {}
    items.forEach((s) => {
      const loc = s.location || s.department || '—'
      map[loc] = (map[loc] || 0) + (Number(s.quantity) || 0)
    })
    return Object.keys(map).map((loc) => ({ location: loc, quantity: map[loc] }))
  }
  // Purchase History：本 Stock Type 所有 Items 的采购交易历史（经 stockItems 映射 stockTypeNo）
  if (t.aggKey === 'purchaseHistory') {
    const siByNo = {}
    collectionService.collection('stockItems').forEach((s) => { siByNo[s.stockItemNo] = s.stockTypeNo })
    return collectionService.collection('transactions')
      .filter((tx) => siByNo[tx.stockItem] === no)
      .map((tx) => ({ transactionNo: tx.transactionNo, type: tx.type, stockItem: tx.stockItem, quantity: tx.quantity, date: tx.date, reference: tx.reference || '' }))
  }
  return []
}
function rowKeyOf(row, ri) {
  return row.id || row.jobNo || row.stockTypeNo || row.typeNumber || ('row_' + ri)
}
function addSubRow(t) {
  const row = {}
  ;(t.columns || []).forEach((c) => { row[c.key] = c.default !== undefined ? c.default : '' })
  if (t.subSource) {
    const base = { ...(t.newDefaults || {}) }
    base[t.subSource.filterKey] = props.model[t.subSource.filterModelKey]
    if (!row.id) row.id = 'new_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    Object.assign(row, base)
    collectionService.push(t.subSource.dbKey, row)
  } else {
    const key = t.subKey
    if (!props.model[key]) props.model[key] = []
    props.model[key].push(row)
  }
  emit('change', {})
}
function delSubRow(t, row) {
  if (t.subSource) {
    collectionService.removeBy(t.subSource.dbKey, (r) => r === row || r.id === row.id)
  } else {
    const arr = props.model[t.subKey] || []
    const i = arr.findIndex((r) => r === row)
    if (i >= 0) arr.splice(i, 1)
  }
  emit('change', {})
}
function openSubLookup(t, c, row) {
  lookupField.value = { ...c, _row: row }
  const fn = lookups[c.lookupKey]
  lookupOptions.value = (fn ? fn(props.model) : []) || []
}

// 子表行选中（供 Update / Set Start 等 subActions 操作指定行）
const selectedSub = ref(null)
function selectSubRow(row) { selectedSub.value = row }
function isSubSelected(row) { return selectedSub.value === row }
function runSubAction(t, a) {
  emit('subaction', { action: a.id, tabId: t.id, row: selectedSub.value })
}

// ===== 子表格列宽拖拽调整 =====
const subColWidths = ref({})
const subResizing = ref(null)

function _subWkey(t, key) { return t.id + '::' + key }

function subColStyle(t, c) {
  const w = subColWidths.value[_subWkey(t, c.key)] || c.width
  return w ? { width: w } : null
}

function startSubResize(e, t, key) {
  const th = e.target.parentElement
  const rect = th.getBoundingClientRect()
  subResizing.value = { t, key, startX: e.clientX, startW: rect.width }
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onSubResizeMove)
  document.addEventListener('mouseup', onSubResizeEnd)
}

function onSubResizeMove(e) {
  const r = subResizing.value
  if (!r) return
  const diff = e.clientX - r.startX
  const newW = Math.max(60, r.startW + diff)
  subColWidths.value[_subWkey(r.t, r.key)] = newW + 'px'
}

function onSubResizeEnd() {
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onSubResizeMove)
  document.removeEventListener('mouseup', onSubResizeEnd)
  subResizing.value = null
}
</script>

<style scoped>
.record-detail { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
/* Perishable 等复选框字段：与其它字段的输入框高度对齐 */
.amos-check { display: flex; align-items: center; gap: 6px; min-height: 26px; font-size: 12px; color: var(--amos-text-soft); cursor: pointer; }
.amos-check input { cursor: pointer; }
/* tab-row：标签栏 — 过多时横向滚动，滚动条纤细且半透明不遮挡内容 */
.tab-row { display: flex; gap: 2px; flex-wrap: nowrap; overflow-x: auto; flex-shrink: 0; padding: 4px 6px 0; scrollbar-width: thin; scrollbar-color: rgba(160,180,200,0.4) transparent; }
.tab-row::-webkit-scrollbar { height: 5px; }
.tab-row::-webkit-scrollbar-track { background: transparent; }
.tab-row::-webkit-scrollbar-thumb { background: rgba(160,180,200,0.45); border-radius: 3px; }
.tab-row::-webkit-scrollbar-thumb:hover { background: rgba(140,165,190,0.65); }
.tab { padding: 5px 9px; cursor: pointer; border: 1px solid var(--amos-border); border-bottom: none; border-radius: 6px 6px 0 0; background: #f3f6fa; color: var(--amos-text-soft); font-size: 11.5px; white-space: nowrap; flex-shrink: 0; }
.tab:hover { background: #fff; }
.tab.active { background: #fff; color: var(--amos-blue); font-weight: 700; box-shadow: inset 0 -2px 0 var(--amos-blue); }
/* 核心：tab-body 是唯一的内容滚动容器 */
.tab-body { flex: 1; min-height: 0; min-width: 0; overflow: auto; padding: 12px; border: 1px solid var(--amos-border); border-radius: 0 0 6px 6px; }
.tab-body::-webkit-scrollbar { width: 8px; height: 8px; }
.tab-body::-webkit-scrollbar-track { background: #f5f7fa; }
.tab-body::-webkit-scrollbar-thumb { background: #c2d2e8; border-radius: 4px; }
.tab-body::-webkit-scrollbar-thumb:hover { background: #9bb6d8; }
.rd-note { margin: 0 0 10px; color: var(--amos-text-soft); font-size: 13px; line-height: 1.6; }
/* 手册 P61-64：Show Indicators 时的字段链接图标（🔗 已链接 / 🔓 已解除） */
.link-ind { border: none; background: transparent; cursor: pointer; font-size: 12px; margin-left: 6px; padding: 0 2px; vertical-align: middle; }
.link-ind.off { filter: grayscale(1); opacity: 0.55; }
/* 子表格包裹层 */
.table-wrap { overflow-x: auto; margin-top: 8px; }
.amos-grid.sub { border-collapse: collapse; font-size: 12.5px; width: 100%; }
.amos-grid.sub th, .amos-grid.sub td { border: 1px solid var(--amos-border); padding: 4px 6px; text-align: left; vertical-align: middle; }
.amos-grid.sub th { background: #f3f6fa; font-weight: 600; color: var(--amos-text-soft); }
.subgrid-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
/* 列宽调整手柄 */
.amos-grid.sub th { position: relative; }
.amos-grid.sub th .col-resize { position: absolute; right: 0; top: 4px; bottom: 4px; width: 5px; cursor: col-resize; }
.amos-grid.sub th .col-resize::after { content: ''; position: absolute; left: 2px; top: 0; bottom: 0; width: 1px; background: var(--amos-border); opacity: 0; transition: opacity .15s; }
.amos-grid.sub th .col-resize:hover::after { opacity: 1; background: var(--amos-blue); }
.sub-actions { text-align: center; width: 46px; }
.cell-lookup { display: flex; gap: 4px; align-items: center; }
/* 子表行选中高亮（Update / Set Start 操作指定行） */
.amos-grid.sub tbody tr { cursor: pointer; }
.amos-grid.sub tbody tr.sub-sel { background: #e8f2fb !important; }
.cell-ro { display: inline-block; padding: 2px 4px; color: var(--amos-text-soft); }
.cell-lookup .amos-input { flex: 1; min-width: 0; }
.amos-input.sm, .amos-select.sm { width: 100%; min-width: 60px; padding: 3px 5px; font-size: 12px; }
.amos-color { width: 48px; height: 28px; padding: 2px; border: 1px solid var(--amos-border); border-radius: 4px; background: #fff; cursor: pointer; }
.amos-btn.xs { padding: 3px 8px; font-size: 11.5px; }
.amos-btn.danger { color: #b3261e; }
.amos-btn.xs.danger:hover { background: #fdecea; }
/* Component Performing the Function：双栏只读展示 Component No. + Component Name */
.cpf-row { display: flex; gap: 8px; }
.cpf-row .amos-input { flex: 1; min-width: 0; }
/* lookup-with-name：双栏显示 Code + Name */
.lookup-with-name-row { display: flex; gap: 6px; align-items: center; }
.lookup-with-name-row .amos-input { flex: 1; min-width: 0; }
</style>
