<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Functions Hierarchy</h2>
      <div class="row" style="gap:6px">
        <button class="amos-btn sm" :class="{ primary: showNumber }" @click="showNumber = !showNumber">
          Toggle number（显示 SFI 编码）
        </button>
        <button class="amos-btn sm" @click="expandAll(true)">Expand All</button>
        <button class="amos-btn sm" @click="expandAll(false)">Collapse All</button>
        <button class="amos-btn sm" @click="onFind">Find… (F3)</button>
        <button class="amos-btn sm primary" @click="openNew">New Function</button>
        <!-- 手册 P42：Functions Hierarchy 窗口同样提供 Install / Remove 按钮（无组件时 Install 可用、Remove 灰显；反之相反） -->
        <button class="amos-btn sm" @click="openInstall" :disabled="!selectedFunction || !!selectedFunction.installedComponentId">Install</button>
        <button class="amos-btn sm" @click="openRemove" :disabled="!selectedFunction || !selectedFunction.installedComponentId">Remove</button>
        <div class="bw-options">
          <button class="amos-btn sm" @click="optionsOpen = !optionsOpen" :disabled="!selected || selected.__type !== 'function'">Options ▾</button>
          <div v-if="optionsOpen" class="bw-options-menu" @mouseleave="optionsOpen = false">
            <button @click="openInstall" :disabled="!!selected?.installedComponentId">Install Component</button>
            <button @click="openRemove" :disabled="!selected?.installedComponentId">Remove Component</button>
            <button @click="openChangeStatus" :disabled="!!selected?.installedComponentId">Change Status</button>
            <!-- 手册 Function Counters：Functions Hierarchy > Options > Function Counters -->
            <button @click="openFuncCounters">Function Counters</button>
            <!-- 手册 P41 末尾：Function Hierarchy Options 菜单的 Component / History -->
            <button @click="openCompInfo" :disabled="!selected?.installedComponentId">Component</button>
            <button @click="openHistory" :disabled="!selected?.installedComponentId">History</button>
          </div>
        </div>
      </div>
    </div>

    <div class="hier-body">
      <div class="hier-tree">
        <TreeNode
          v-for="node in roots"
          :key="node.id"
          :node="node"
          :show-number="showNumber"
          :depth="0"
          :selected-id="selectedId"
          :expanded-ids="expandedIds"
          @select="onSelect"
          @open-component="openComponent"
          @toggle="onToggle"
          @contextmenu="onCtxMenu"
        />
      </div>
      <div class="hier-info" v-if="selected && selected.__type === 'function'">
        <h3>Function：{{ selected.functionNo }}</h3>
        <div class="amos-field"><label>Function No.</label><div class="ctrl"><input class="amos-input" :value="selected.functionNo" readonly /></div></div>
        <div class="amos-field"><label>Description</label><div class="ctrl"><input class="amos-input" v-model="selected.description" /></div></div>
        <div class="amos-field"><label>Reference</label><div class="ctrl"><input class="amos-input" v-model="selected.reference" /></div></div>
        <div class="amos-field"><label>Parent Function</label><div class="ctrl">
          <select class="amos-select" v-model="selected.parentFunctionNo">
            <option value="">（无）</option>
            <option v-for="o in parentOptions" :key="o.code" :value="o.code">{{ o.label }}</option>
          </select>
        </div></div>
        <div class="amos-field"><label>Location</label><div class="ctrl">
          <select class="amos-select" v-model="selected.location">
            <option v-for="o in locationOptions" :key="o.code" :value="o.code">{{ o.label }}</option>
          </select>
        </div></div>
        <div class="amos-field"><label>Criticality</label><div class="ctrl">
          <select class="amos-select" v-model="selected.criticality">
            <option v-for="c in criticalityOptions" :key="c.code" :value="c.code">{{ c.label }}</option>
          </select>
        </div></div>
        <div class="amos-field"><label>Status</label><div class="ctrl"><input class="amos-input" :value="selected.status" readonly /></div></div>
        <div class="amos-field"><label>Installed Component</label><div class="ctrl"><input class="amos-input" :value="selected.installedComponentId" readonly /></div></div>
        <button class="amos-btn sm primary" @click="saveSelected">Save</button>
      </div>
      <div class="hier-info" v-else-if="selected && selected.__type === 'component'">
        <h3>Component：{{ selected.number }}</h3>
        <div class="amos-field" v-for="f in infoFields" :key="f.k">
          <label>{{ f.k }}</label>
          <div class="ctrl"><input class="amos-input" :value="f.v" readonly /></div>
        </div>
        <button class="amos-btn sm primary" @click="openComponent(selected.number)">打开 Components 窗口</button>
      </div>
      <div class="hier-info empty" v-else>
        <p class="muted">Function（功能位置）是固定的，部件可在不同功能位置间轮换（手册 2.5）。点击 Toggle number 显示 / 隐藏 SFI 编码。选中功能位置可编辑并保存，或点击 New Function 创建。</p>
      </div>
    </div>

    <Modal v-if="findOpen" title="Find Function" width="460px" @close="findOpen = false">
      <div class="amos-field">
        <label>Search（编码或名称片段）</label>
        <div class="ctrl"><input class="amos-input" v-model="findText" placeholder="如 ENG 或 Boiler" @keyup.enter="doFind" /></div>
      </div>
      <div v-if="findHits.length" class="find-hits">
        <button v-for="h in findHits" :key="h.id" class="hit" @click="jumpTo(h)">{{ h.no }} — {{ h.label }}</button>
      </div>
      <p v-else-if="findText" class="muted">无匹配项。</p>
      <template #footer>
        <button class="amos-btn" @click="findOpen = false">Close</button>
        <button class="amos-btn primary" @click="doFind">Find</button>
      </template>
    </Modal>

    <!-- 手册 Working with Functions：在 Functions Hierarchy 窗口创建新功能位置 -->
    <Modal v-if="newOpen" title="New Function" width="480px" @close="newOpen = false">
      <div class="amos-field"><label>Function No.</label><div class="ctrl"><input class="amos-input" v-model="newForm.functionNo" placeholder="如 FN-AUX-01" /></div></div>
      <div class="amos-field"><label>Description</label><div class="ctrl"><input class="amos-input" v-model="newForm.description" /></div></div>
      <div class="amos-field"><label>Reference</label><div class="ctrl"><input class="amos-input" v-model="newForm.reference" /></div></div>
      <div class="amos-field"><label>Parent Function</label><div class="ctrl">
        <select class="amos-select" v-model="newForm.parentFunctionNo">
          <option value="">（无）</option>
          <option v-for="o in allFunctionOptions" :key="o.code" :value="o.code">{{ o.label }}</option>
        </select>
      </div></div>
      <div class="amos-field"><label>Location</label><div class="ctrl">
        <select class="amos-select" v-model="newForm.location">
          <option v-for="o in locationOptions" :key="o.code" :value="o.code">{{ o.label }}</option>
        </select>
      </div></div>
      <div class="amos-field"><label>Criticality</label><div class="ctrl">
        <select class="amos-select" v-model="newForm.criticality">
          <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
      </div></div>
      <div class="amos-field"><label>Status</label><div class="ctrl">
        <input class="amos-input" value="In Use" readonly />
      </div></div>
      <template #footer>
        <button class="amos-btn" @click="newOpen = false">Cancel</button>
        <button class="amos-btn primary" @click="createFunction">OK</button>
      </template>
    </Modal>

    <!-- Change Function Status 对话框（手册 2 / P38-39 Changing Function Status） -->
    <Modal v-if="changeStatusOpen" title="Change Function Status" width="460px" @close="changeStatusOpen = false">
      <p class="muted">功能位置：<b>{{ selected?.functionNo }}</b>　当前状态：<b>{{ selected?.status }}</b></p>
      <div class="amos-field">
        <label>New Status</label>
        <div class="ctrl">
          <select class="amos-select" v-model="changeStatusTarget">
            <option v-for="s in functionStatusOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>
      <label class="row" style="gap:6px;margin-top:8px" :class="{ disabled: !hasSubFunctions }">
        <input type="checkbox" v-model="changeStatusCascade" :disabled="!hasSubFunctions" />
        Change status of sub-functions also
      </label>
      <p v-if="!hasSubFunctions" class="muted" style="margin:4px 0 0;font-size:12px">所选功能位置没有子功能位置。</p>
      <template #footer>
        <button class="amos-btn" @click="changeStatusOpen = false">Cancel</button>
        <button class="amos-btn primary" @click="confirmChangeStatus">OK</button>
      </template>
    </Modal>

    <!-- Install Component 对话框（手册 P40） -->
    <Modal v-if="installOpen" title="Install Component" width="460px" @close="installOpen = false">
      <p class="muted">功能位置：<b>{{ selected?.functionNo }}</b>　Location：<b>{{ selected?.location }}</b></p>
      <div class="amos-field"><label>Component</label><div class="ctrl">
        <select class="amos-select" v-model="installSelected">
          <option v-for="c in installCandidates" :key="c.id" :value="c.number">{{ c.number }} — {{ c.name }}</option>
        </select>
      </div></div>
      <!-- 手册 P40：New Component Location 与功能位置的 location 相同 -->
      <div class="amos-field"><label>New Component Location</label><div class="ctrl"><input class="amos-input" :value="selected?.location" readonly /></div></div>
      <div class="amos-field"><label>Details</label><div class="ctrl"><textarea class="amos-textarea" v-model="installDetails" placeholder="安装评论（可选）" /></div></div>
      <template #footer>
        <button class="amos-btn" @click="installOpen = false">Cancel</button>
        <button class="amos-btn primary" @click="confirmInstall">OK</button>
      </template>
    </Modal>

    <!-- Remove Component 对话框（手册 P42） -->
    <Modal v-if="removeOpen" title="Remove Component" width="480px" @close="removeOpen = false">
      <p class="muted">从功能位置 <b>{{ selected?.functionNo }}</b> 拆卸组件 <b>{{ selected?.installedComponentId }}</b>。</p>
      <div class="amos-field"><label>New Location</label><div class="ctrl" style="display:flex;gap:6px;align-items:center">
        <select class="amos-select" v-model="removeState.newLocation" style="flex:1">
          <option value="">（不更新 Location）</option>
          <option v-for="o in locationOptions" :key="o.code" :value="o.code">{{ o.label }}</option>
        </select>
        <button class="amos-btn sm" type="button" @click="openNewLocation" title="新增 Location 主数据">+</button>
      </div></div>
      <div class="amos-field"><label>Status</label><div class="ctrl">
        <select class="amos-select" v-model="removeState.status">
          <option value="">（保持当前状态）</option>
          <option>Scrapped</option>
          <option>Transferred</option>
          <option>Available</option>
        </select>
      </div></div>
      <div class="amos-field"><label>Details</label><div class="ctrl"><textarea class="amos-textarea" v-model="removeState.details" placeholder="拆卸评论（可选）" /></div></div>
      <label class="row" style="gap:6px;margin-top:8px" :class="{ disabled: !hasSubFunctions }">
        <input type="checkbox" v-model="removeState.cascadeSubFunctions" :disabled="!hasSubFunctions" />
        Remove components from sub-functions also
      </label>
      <p v-if="!hasSubFunctions" class="muted" style="margin:4px 0 0;font-size:12px">所选功能位置没有子功能位置。</p>
      <template #footer>
        <button class="amos-btn" @click="removeOpen = false">Cancel</button>
        <button class="amos-btn primary" @click="confirmRemove">OK</button>
      </template>
    </Modal>

    <!-- 新增 Location 主数据（手册 Working with Functions：Location lookup 可扩展） -->
    <Modal v-if="newLocationOpen" title="New Location" width="440px" @close="newLocationOpen = false">
      <p class="muted">新增一个标准 Location，保存后可用于 New Location / Function Location 等下拉。</p>
      <div class="amos-field"><label>Code</label><div class="ctrl"><input class="amos-input" v-model="newLocationForm.code" placeholder="如 STORE-A" @keyup.enter="confirmNewLocation" /></div></div>
      <div class="amos-field"><label>Description</label><div class="ctrl"><input class="amos-input" v-model="newLocationForm.description" placeholder="如 Store Room A（可选）" @keyup.enter="confirmNewLocation" /></div></div>
      <p v-if="newLocationError" class="muted" style="color:#c0392b;margin:4px 0 0">{{ newLocationError }}</p>
      <template #footer>
        <button class="amos-btn" @click="newLocationOpen = false">Cancel</button>
        <button class="amos-btn primary" @click="confirmNewLocation">OK</button>
      </template>
    </Modal>

    <!-- Component 信息对话框（手册 P41 末尾 Options > Component） -->
    <Modal v-if="compInfoOpen" title="Component" width="460px" @close="compInfoOpen = false">
      <div v-if="installedComp" class="amos-field" v-for="f in compInfoFields" :key="f.k">
        <label>{{ f.k }}</label>
        <div class="ctrl"><input class="amos-input" :value="f.v" readonly /></div>
      </div>
      <p v-else class="muted">（未安装组件）</p>
      <template #footer>
        <button class="amos-btn primary" @click="compInfoOpen = false">Close</button>
      </template>
    </Modal>

    <!-- History 对话框（手册 P41 末尾 Options > History：Rotation Log） -->
    <Modal v-if="historyOpen" title="History" width="720px" @close="historyOpen = false">
      <div class="subgrid-bar" style="margin-bottom:8px">
        <button class="amos-btn xs" @click="openHistoryNotes">Notes</button>
        <span class="muted">{{ historyCycles.length }} 条记录</span>
      </div>
      <table class="amos-grid sub" v-if="historyCycles.length">
        <thead><tr><th>Component No.</th><th>Component Name</th><th>Installed</th><th>Installed By</th><th>Removed</th><th>Removed By</th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in historyCycles" :key="i" :class="{ 'history-sel': selectedHistoryRow === r }" @click="selectedHistoryRow = r">
            <td>{{ r.componentNo }}</td><td>{{ r.componentName }}</td><td>{{ r.installedAt }}</td><td>{{ r.installedBy }}</td><td>{{ r.removedAt }}</td><td>{{ r.removedBy }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">（无安装 / 拆卸历史）</p>
      <template #footer>
        <button class="amos-btn primary" @click="historyOpen = false">Close</button>
      </template>
    </Modal>

    <!-- History Notes 对话框 -->
    <Modal v-if="historyNotesOpen" title="Notes — History" width="460px" @close="historyNotesOpen = false">
      <div class="amos-field">
        <label>Details</label>
        <div class="ctrl"><textarea class="amos-textarea" :value="historyNotesText" readonly /></div>
      </div>
      <template #footer>
        <button class="amos-btn primary" @click="historyNotesOpen = false">Close</button>
      </template>
    </Modal>

    <!-- Function Counters 对话框（手册 Function Counters：Functions Hierarchy > Options > Function Counters） -->
    <Modal v-if="funcCountersOpen" title="Function Counters" width="560px" @close="funcCountersOpen = false">
      <p class="muted">功能位置：<b>{{ selected?.functionNo }}</b>　可在此维护该功能位置的计数器（累计读数）。</p>
      <div class="subgrid-bar" style="margin:8px 0">
        <button class="amos-btn xs primary" @click="addFuncCounter">New</button>
        <span class="muted">{{ funcCounterRows.length }} 条记录</span>
      </div>
      <table class="amos-grid sub" v-if="funcCounterRows.length">
        <thead><tr><th>Code</th><th>Description</th><th>Unit</th><th>Last Reading</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in funcCounterRows" :key="i">
            <td><input class="amos-input sm" v-model="r.code" /></td>
            <td><input class="amos-input sm" v-model="r.description" /></td>
            <td><input class="amos-input sm" v-model="r.unit" style="width:60px" /></td>
            <td><input class="amos-input sm" type="number" v-model.number="r.lastValue" style="width:90px" /></td>
            <td><button class="amos-btn xs" @click="funcCounterRows.splice(i, 1)">Del</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">（暂无计数器，点击 New 添加）</p>
      <template #footer>
        <button class="amos-btn" @click="funcCountersOpen = false">Cancel</button>
        <button class="amos-btn primary" @click="saveFuncCounters">OK</button>
      </template>
    </Modal>

    <!-- 手册 P42：Functions Hierarchy 窗口右键菜单 Install / Remove Component（与 Functions 窗口一致） -->
    <div v-if="ctxOpen" class="bw-options-menu ctx-menu" :style="{ left: ctxX + 'px', top: ctxY + 'px' }" @mouseleave="ctxOpen = false">
      <button :disabled="!ctxFunction || !!ctxFunction.installedComponentId" @click="ctxInstall">Install Component</button>
      <button :disabled="!ctxFunction || !ctxFunction.installedComponentId" @click="ctxRemove">Remove Component</button>
      <button :disabled="!ctxFunction || !ctxFunction.installedComponentId" @click="ctxComponent">Component</button>
      <button :disabled="!ctxFunction || !ctxFunction.installedComponentId" @click="ctxHistory">History</button>
      <button :disabled="!ctxFunction" @click="ctxFuncCounters">Function Counters</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import Modal from '../components/Modal.vue'
import TreeNode from '../components/TreeNode.vue'
import { componentService } from '../services/componentService.js'
import { functionService } from '../services/functionService.js'
import { locationService } from '../services/locationService.js'
import { lookups } from '../mock/index.js'
import { db } from '../mock/index.js'
import { store, openWindow, setPresetFilter, showToast } from '../store.js'

const showNumber = ref(true)
const selected = ref(null)
const selectedId = ref('')
const findOpen = ref(false)
const findText = ref('')
const findHits = ref([])
const newOpen = ref(false)
const newForm = ref(blankForm())
// 展开/折叠状态独立于树结构
const expandedIds = ref(new Set())
// 手册 2 / P38-39：Options > Change Status
const optionsOpen = ref(false)
const changeStatusOpen = ref(false)
const changeStatusTarget = ref('In Use')
const changeStatusCascade = ref(false)
const functionStatusOptions = ['In Use', 'Scrapped']
const hasSubFunctions = computed(() => selected.value && selected.value.__type === 'function' && db.functions.some((f) => f.parentFunctionNo === selected.value.functionNo))
// 仅当选中的是功能位置（function）时才暴露给工具栏按钮 / 右键菜单
const selectedFunction = computed(() => (selected.value && selected.value.__type === 'function') ? selected.value : null)

// 手册 P42：Functions Hierarchy 窗口右键菜单 Install / Remove Component（与 Functions 窗口一致）
const ctxOpen = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const ctxFunction = ref(null)
function onCtxMenu({ node, event }) {
  if (!node || node.type !== 'function') { ctxOpen.value = false; return }
  // 右键即选中该功能位置，使后续操作作用于它
  onSelect(node)
  ctxFunction.value = selectedFunction.value
  ctxX.value = event.clientX
  ctxY.value = event.clientY
  ctxOpen.value = true
}
function ctxInstall() { ctxOpen.value = false; openInstall() }
function ctxRemove() { ctxOpen.value = false; openRemove() }
function ctxComponent() { ctxOpen.value = false; openCompInfo() }
function ctxHistory() { ctxOpen.value = false; openHistory() }
function ctxFuncCounters() { ctxOpen.value = false; openFuncCounters() }

const compByNo = computed(() => componentService.byNo())
const funcByNo = computed(() => functionService.byNo())

const locationOptions = computed(() => lookups.locations())
const allFunctionOptions = computed(() => lookups.functions())
const parentOptions = computed(() => lookups.functions().filter((o) => o.code !== (selected.value && selected.value.functionNo)))
// 手册 P44-46：Criticality 下拉选项来自 FunctionCriticality 注册表
const criticalityOptions = computed(() => lookups.criticalities())

function blankForm() {
  return { functionNo: '', description: '', reference: '', parentFunctionNo: '', location: 'Engine Room', criticality: 'Medium', status: 'In Use' }
}

// 手册 P20：切换安装地点时清除选中（树数据由 roots computed 自动响应 store.installation）
watch(() => store.installation, () => { selected.value = null })

// ===== 功能位置树：按 parentFunctionNo 嵌套；已安装部件作为叶子 =====
// 仅展示当前船（store.installation）的功能位置
const roots = computed(() => {
  const list = functionService.list().filter((f) => f.installation === store.installation)
  const nodes = {}
  list.forEach((f) => {
    nodes[f.functionNo] = { id: 'fn:' + f.functionNo, type: 'function', no: f.functionNo, label: f.description, status: f.status, criticality: f.criticality, children: [] }
  })
  list.forEach((f) => {
    const node = nodes[f.functionNo]
    if (f.installedComponentId && compByNo.value[f.installedComponentId]) {
      const c = compByNo.value[f.installedComponentId]
      node.children.push({ id: 'co:' + c.number, type: 'component', no: c.number, label: c.name + '（已安装）', status: c.status, children: [] })
    }
    if (f.parentFunctionNo && nodes[f.parentFunctionNo]) nodes[f.parentFunctionNo].children.push(node)
  })
  return list.filter((f) => !f.parentFunctionNo).map((f) => nodes[f.functionNo])
})

const infoFields = computed(() => {
  const s = selected.value
  if (!s || s.__type !== 'component') return []
  return [
    { k: 'Number', v: s.number }, { k: 'Name', v: s.name }, { k: 'Type No.', v: s.typeNumber },
    { k: 'Function (SFI)', v: s.functionNo }, { k: 'Status', v: s.status },
  ]
})

function onSelect(node) {
  selectedId.value = node.id
  if (node.type === 'function') {
    // 取 db 对象引用，编辑直接作用于内存数据，Save 时持久化
    selected.value = functionService.get(node.no)
    if (selected.value) selected.value.__type = 'function'
  } else {
    const c = compByNo.value[node.no]
    if (c) { c.__type = 'component'; selected.value = c }
    else selected.value = null
  }
}
function onToggle(id) {
  const s = new Set(expandedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedIds.value = s
}
function openComponent(no) { setPresetFilter({ number: no }); openWindow('components') }
function expandAll(v) {
  const s = v ? new Set(roots.value.flatMap(collectIds)) : new Set()
  expandedIds.value = s
}
function collectIds(n) {
  const ids = [n.id]
  if (n.children) n.children.forEach((c) => ids.push(...collectIds(c)))
  return ids
}
function onFind() { findText.value = ''; findHits.value = []; findOpen.value = true }
function doFind() {
  const s = findText.value.trim().toLowerCase()
  if (!s) { findHits.value = []; return }
  findHits.value = functionService.search(s)
    .map((f) => ({ id: 'fn:' + f.functionNo, no: f.functionNo, label: f.description, type: 'function' }))
}
function jumpTo(h) { onSelect(h); findOpen.value = false; showToast('已定位：' + h.no, 'info') }

// 手册 Working with Functions：编辑后保存功能位置（Status 为只读指示，改状态统一走 Options > Change Status）
function saveSelected() {
  const s = selected.value
  if (!s || s.__type !== 'function') return
  const prev = functionService.get(s.functionNo)
  const oldLocation = prev ? prev.location : ''
  functionService.update(s.functionNo, {
    description: s.description,
    reference: s.reference,
    parentFunctionNo: s.parentFunctionNo,
    location: s.location,
    criticality: s.criticality,
  })
  // 手册 P40：function location 改变 → 级联更新已安装组件的 location
  if (oldLocation && oldLocation !== s.location) {
    functionService.updateLocation(s.functionNo, s.location)
    showToast('功能位置地点变更，已级联更新安装组件的 Location', 'info')
  }
  showToast('功能位置已保存：' + s.functionNo, 'ok')
}
// 手册 2 / P38-39 Changing Function Status：Options > Change Status
function openChangeStatus() {
  optionsOpen.value = false
  const s = selected.value
  if (!s || s.__type !== 'function') { showToast('请先选择功能位置', 'warn'); return }
  // 手册：不能对当前装有 component 的 function 更改 status
  if (s.installedComponentId) {
    showToast('该功能位置已安装组件，不能更改状态（请先 Remove Component）', 'warn')
    return
  }
  changeStatusTarget.value = s.status
  changeStatusCascade.value = false
  changeStatusOpen.value = true
}
function confirmChangeStatus() {
  const s = selected.value
  if (!s || s.__type !== 'function') return
  const res = functionService.changeStatus(s.functionNo, changeStatusTarget.value, { cascadeSubFunctions: changeStatusCascade.value })
  if (!res.ok) {
    if (res.reason === 'installed') showToast('该功能位置已安装组件，不能更改状态', 'warn')
    else showToast('状态修改失败', 'warn')
    return
  }
  changeStatusOpen.value = false
  // 同步 db 最新值回选中对象
  res.updatedIds.forEach((id) => {
    const f = db.functions.find((x) => x.id === id)
    if (f && selected.value && selected.value.id === id) {
      selected.value.status = f.status
    }
  })
  const extra = changeStatusCascade.value && res.updatedIds.length > 1 ? `（含 ${res.updatedIds.length - 1} 个子功能位置）` : ''
  showToast('功能位置状态已改为 ' + changeStatusTarget.value + extra, 'ok')
}

// ===== Install / Remove Component（手册 P40/P42，Functions Hierarchy 窗口 Options）=====
const installOpen = ref(false)
const installSelected = ref('')
const installDetails = ref('')
const installCandidates = computed(() => {
  if (!selected.value || selected.value.__type !== 'function') return []
  // 当前未安装到任何功能位置（或已安装到本 function）的组件可被选作安装
  return componentService.listSync().filter((c) => !c.functionNo || c.functionNo === selected.value.functionNo)
})
function openInstall() {
  optionsOpen.value = false
  const s = selected.value
  if (!s || s.__type !== 'function') { showToast('请先选择功能位置', 'warn'); return }
  if (s.installedComponentId) { showToast('该功能位置已安装组件，请先 Remove Component', 'warn'); return }
  installSelected.value = installCandidates.value[0]?.number || ''
  installDetails.value = ''
  installOpen.value = true
}
async function confirmInstall() {
  const s = selected.value
  if (!s || !installSelected.value) { showToast('请选择组件', 'warn'); return }
  await functionService.installComponent(s.functionNo, installSelected.value, installDetails.value)
  installOpen.value = false
  showToast(`已将 ${installSelected.value} 安装到 ${s.functionNo}`, 'ok')
}
const removeOpen = ref(false)
const removeState = reactive({ newLocation: '', status: '', details: '', cascadeSubFunctions: false })
// 手册 Working with Functions：Location 作为主数据，支持在 New Location 下拉旁新增
const newLocationOpen = ref(false)
const newLocationForm = reactive({ code: '', description: '' })
const newLocationError = ref('')
function openNewLocation() {
  newLocationForm.code = ''
  newLocationForm.description = ''
  newLocationError.value = ''
  newLocationOpen.value = true
}
function confirmNewLocation() {
  const res = locationService.create({ code: newLocationForm.code, description: newLocationForm.description })
  if (!res.ok) { newLocationError.value = res.error; return }
  newLocationOpen.value = false
  removeState.newLocation = res.record.code // 自动选中新建的 Location
  showToast(`已新增 Location：${res.record.code}`, 'ok')
}
function openRemove() {
  optionsOpen.value = false
  const s = selected.value
  if (!s || s.__type !== 'function') { showToast('请先选择功能位置', 'warn'); return }
  if (!s.installedComponentId) { showToast('该功能位置未安装组件', 'warn'); return }
  removeState.newLocation = ''
  removeState.status = ''
  removeState.details = ''
  removeState.cascadeSubFunctions = false
  removeOpen.value = true
}
async function confirmRemove() {
  const s = selected.value
  if (!s) return
  const res = await functionService.removeComponent(s.functionNo, {
    newLocation: removeState.newLocation,
    status: removeState.status,
    details: removeState.details,
    cascadeSubFunctions: removeState.cascadeSubFunctions,
  })
  removeOpen.value = false
  const extra = removeState.cascadeSubFunctions ? '（含子功能位置）' : ''
  let msg = `已从 ${s.functionNo} 拆卸组件${extra}`
  // 手册 P42：Scrapped / Transferred 时取消未开始工单；已 Started 的工单保留
  if (res?.cancelledWorkOrders?.length) {
    msg += `；已取消 ${res.cancelledWorkOrders.length} 张未开始工单（${res.cancelledWorkOrders.join(', ')}）`
  }
  // 手册 P42 Note：依赖该组件的轮次作业随拆卸停用
  if (res?.deactivatedRoundJobs?.length) {
    msg += `；${res.deactivatedRoundJobs.length} 个轮次作业已停用（${res.deactivatedRoundJobs.join(', ')}）`
  }
  showToast(msg, 'ok')
}

// 手册 P41 末尾 Options > Component：只读显示已安装组件信息
const compInfoOpen = ref(false)
const installedComp = computed(() => {
  const s = selected.value
  if (!s || s.__type !== 'function' || !s.installedComponentId) return null
  return compByNo.value[s.installedComponentId] || null
})
const compInfoFields = computed(() => {
  const c = installedComp.value
  if (!c) return []
  return [
    { k: 'Component No.', v: c.number }, { k: 'Name', v: c.name }, { k: 'Type No.', v: c.typeNumber },
    { k: 'Status', v: c.status }, { k: 'Location', v: c.location }, { k: 'Maker', v: c.maker }, { k: 'Serial No.', v: c.serialNo },
  ]
})
function openCompInfo() {
  optionsOpen.value = false
  if (!installedComp.value) { showToast('该功能位置未安装组件', 'warn'); return }
  compInfoOpen.value = true
}
// 手册 P41 末尾 Options > History：Rotation Log
const historyOpen = ref(false)
const selectedHistoryRow = ref(null)
const historyNotesOpen = ref(false)
const historyNotesText = ref('')
const historyCycles = computed(() => functionService.buildRotationCycles(selected.value?.rotationLog || []))
function openHistory() {
  optionsOpen.value = false
  const s = selected.value
  if (!s || s.__type !== 'function') { showToast('请先选择功能位置', 'warn'); return }
  selectedHistoryRow.value = null
  historyOpen.value = true
}
function openHistoryNotes() {
  if (!selectedHistoryRow.value) { showToast('请先在 History 中选择一行', 'warn'); return }
  historyNotesText.value = selectedHistoryRow.value.details || '（无评论）'
  historyNotesOpen.value = true
}
// 手册 Function Counters：Functions Hierarchy > Options > Function Counters —— 维护功能位置计数器
const funcCountersOpen = ref(false)
const funcCounterRows = ref([])
function openFuncCounters() {
  optionsOpen.value = false
  const s = selected.value
  if (!s || s.__type !== 'function') { showToast('请先选择功能位置', 'warn'); return }
  funcCounterRows.value = (s.functionCounters || []).map((x) => ({ ...x }))
  funcCountersOpen.value = true
}
function addFuncCounter() {
  funcCounterRows.value.push({ code: '', description: '', unit: '', lastValue: 0 })
}
function saveFuncCounters() {
  const s = selected.value
  if (!s) return
  s.functionCounters = funcCounterRows.value.map((r) => ({ ...r }))
  funcCountersOpen.value = false
  showToast('功能位置计数器已保存：' + s.functionNo, 'ok')
}
function openNew() { newForm.value = blankForm(); newOpen.value = true }
function createFunction() {
  const f = newForm.value
  if (!f.functionNo || !f.description) { showToast('请填写 Function No. 与 Description', 'warn'); return }
  if (functionService.get(f.functionNo)) { showToast('该 Function No. 已存在', 'warn'); return }
  // 新建功能位置归属当前船
  functionService.add({ ...f, installation: store.installation })
  newOpen.value = false
  expandedIds.value = new Set(functionService.list().filter((x) => x.installation === store.installation).map((x) => 'fn:' + x.functionNo))
  showToast('已创建功能位置：' + f.functionNo, 'ok')
}

// 手册 2.5：F3 打开查找窗口
function onKey(e) { if (e.key === 'F3') { e.preventDefault(); onFind() } }
onMounted(() => {
  // 初始化：当前船的 Function 节点默认展开
  expandedIds.value = new Set(functionService.list().filter((f) => f.installation === store.installation).map((f) => 'fn:' + f.functionNo))
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
.bw-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.hier-body { flex: 1; display: grid; grid-template-columns: 1.3fr 1fr; min-height: 0; }
.hier-tree { border-right: 1px solid var(--amos-border); padding: 10px; overflow: auto; }
.hier-info { padding: 14px; overflow: auto; }
.hier-info.empty { display: flex; align-items: center; }
.hier-info .amos-field { margin-bottom: 8px; }
.find-hits { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow: auto; }
.hit { text-align: left; border: 1px solid var(--amos-border); background: #fff; border-radius: 6px; padding: 6px 8px; cursor: pointer; font-size: 12.5px; }
.hit:hover { background: #eef3fb; border-color: var(--amos-blue); }
.bw-options { position: relative; }
.bw-options-menu { position: absolute; right: 0; top: 30px; background: #fff; border: 1px solid var(--amos-border-strong); border-radius: 6px; box-shadow: var(--amos-shadow); z-index: 50; min-width: 200px; padding: 4px; }
.bw-options-menu button { display: block; width: 100%; text-align: left; border: none; background: transparent; padding: 7px 10px; border-radius: 4px; cursor: pointer; font-size: 12.5px; }
.bw-options-menu button:hover { background: var(--amos-blue-soft); }
/* 右键菜单：相对视口绝对定位到鼠标坐标 */
.bw-options-menu.ctx-menu { position: fixed; top: auto; right: auto; z-index: 200; }
.bw-options-menu.ctx-menu button:disabled { color: #b3bcc8; cursor: default; }
.row.disabled { opacity: 0.5; cursor: not-allowed; }
.row.disabled input { cursor: not-allowed; }
.subgrid-bar { display: flex; align-items: center; gap: 8px; }
.history-sel { background: #e8f2fb !important; }
@media (max-width: 980px) { .hier-body { grid-template-columns: 1fr; } .hier-tree { border-right: none; border-bottom: 1px solid var(--amos-border); } }
</style>
