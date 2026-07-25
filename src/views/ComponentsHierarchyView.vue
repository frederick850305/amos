<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Components Hierarchy</h2>
      <div class="row" style="gap:6px">
        <button class="amos-btn sm" :class="{ primary: showNumber }" @click="showNumber = !showNumber">
          Toggle number（显示 SFI 编码）
        </button>
        <button class="amos-btn sm" @click="expandAll(true)">Expand All</button>
        <button class="amos-btn sm" @click="expandAll(false)">Collapse All</button>
        <button class="amos-btn sm" @click="onFind">Find… (F3)</button>
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
          :expanded-ids="expandedIds"
          @select="onSelect"
          @open-component="openComponent"
          @toggle="onToggle"
        />
      </div>
      <div class="hier-info" v-if="selected">
        <h3>{{ selected.type === 'function' ? 'Function' : 'Component' }}：{{ selected.no }}</h3>
        <div class="amos-field" v-for="f in infoFields" :key="f.k">
          <label>{{ f.k }}</label>
          <div class="ctrl"><input class="amos-input" :value="f.v" readonly /></div>
        </div>
        <button v-if="selected.type === 'component'" class="amos-btn sm primary" @click="openComponent(selected.no)">
          打开 Components 窗口
        </button>
      </div>
      <div class="hier-info empty" v-else>
        <p class="muted">选择左侧树中的设备或部件查看基础数据；点击 Toggle number 显示 / 隐藏 SFI 编码（手册 2.1 / 2.4）。</p>
      </div>
    </div>

    <!-- 查找窗口：按编码或名称片段定位 -->
    <Modal v-if="findOpen" title="Find Component / Function" width="460px" @close="findOpen = false">
      <div class="amos-field">
        <label>Search（编码或名称片段）</label>
        <div class="ctrl"><input class="amos-input" v-model="findText" placeholder="如 601 或 Engine" @keyup.enter="doFind" /></div>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import Modal from '../components/Modal.vue'
import TreeNode from '../components/TreeNode.vue'
import { componentService } from '../services/componentService.js'
import { functionService } from '../services/functionService.js'
import { store, openWindow, showToast, setPresetFilter } from '../store.js'

const showNumber = ref(true)
const selected = ref(null)
const findOpen = ref(false)
const findText = ref('')
const findHits = ref([])
// 展开/折叠状态独立于树结构，避免 computed 重建时丢失
const expandedIds = ref(new Set())

// 手册 P20：切换安装地点时清除选中（树数据由 roots computed 自动响应 store.installation）
watch(() => store.installation, () => { selected.value = null })

// ===== 构造树：Function 为父节点，Component 为子节点（按 functionNo 挂载）=====
// 仅展示当前船（store.installation）的设备与功能位置
const compByNo = computed(() => componentService.byNo())
const funcByNo = computed(() => functionService.byNo())

const roots = computed(() => {
  const inst = store.installation
  const funcs = functionService.list().filter((f) => f.installation === inst)
  const comps = componentService.listSync().filter((c) => c.installation === inst)
  const funcNodes = {}
  funcs.forEach((f) => {
    funcNodes[f.functionNo] = { id: 'fn:' + f.functionNo, type: 'function', no: f.functionNo, label: f.description, status: f.status, children: [] }
  })
  const compNodes = {}
  comps.forEach((c) => {
    compNodes[c.number] = { id: 'co:' + c.number, type: 'component', no: c.number, label: c.name, status: c.status, parent: c.parentComponent, fn: c.functionNo, children: [] }
  })
  const result = []
  // 部件按 parentComponent 嵌套
  comps.forEach((c) => {
    const node = compNodes[c.number]
    if (c.parentComponent && compNodes[c.parentComponent]) compNodes[c.parentComponent].children.push(node)
    else if (c.functionNo && funcNodes[c.functionNo]) funcNodes[c.functionNo].children.push(node)
    else result.push(node)
  })
  // 无部件的 Function 也展示
  Object.values(funcNodes).forEach((fn) => result.push(fn))
  return result
})

const infoFields = computed(() => {
  const s = selected.value
  if (!s) return []
  if (s.type === 'function') {
    const f = funcByNo.value[s.no] || {}
    return [
      { k: 'Function No.', v: f.functionNo }, { k: 'Description', v: f.description },
      { k: 'Parent', v: f.parentFunctionNo }, { k: 'Location', v: f.location },
      { k: 'Criticality', v: f.criticality }, { k: 'Installed Component', v: f.installedComponentId },
    ]
  }
  const c = compByNo.value[s.no] || {}
  return [
    { k: 'Number', v: c.number }, { k: 'Name', v: c.name }, { k: 'Type No.', v: c.typeNumber },
    { k: 'Maker', v: c.maker }, { k: 'Serial No.', v: c.serialNo }, { k: 'Location', v: c.location },
    { k: 'Function (SFI)', v: c.functionNo }, { k: 'Status', v: c.status },
  ]
})

function onSelect(node) { selected.value = node }
function onToggle(id) {
  const s = new Set(expandedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedIds.value = s
}
// 初始化：Function 节点默认展开
onMounted(() => {
  expandedIds.value = new Set(functionService.list().filter((f) => f.installation === store.installation).map((f) => 'fn:' + f.functionNo))
})
function openComponent(no) {
  setPresetFilter({ number: no })
  openWindow('components')
}
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
  const hits = []
  functionService.search(s).forEach((f) => hits.push({ id: 'fn:' + f.functionNo, no: f.functionNo, label: f.description, type: 'function' }))
  componentService.search(s).forEach((c) => hits.push({ id: 'co:' + c.number, no: c.number, label: c.name, type: 'component' }))
  findHits.value = hits
}
function jumpTo(h) {
  selected.value = h
  findOpen.value = false
  showToast('已定位：' + h.no, 'info')
}

// 手册 2.4：F3 打开查找窗口
function onKey(e) { if (e.key === 'F3') { e.preventDefault(); onFind() } }
onMounted(() => {
  // 初始化：Function 节点默认展开
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
.find-hits { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow: auto; }
.hit { text-align: left; border: 1px solid var(--amos-border); background: #fff; border-radius: 6px; padding: 6px 8px; cursor: pointer; font-size: 12.5px; }
.hit:hover { background: #eef3fb; border-color: var(--amos-blue); }
@media (max-width: 980px) { .hier-body { grid-template-columns: 1fr; } .hier-tree { border-right: none; border-bottom: 1px solid var(--amos-border); } }
</style>
