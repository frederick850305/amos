<template>
  <Modal title="Filter" width="580px" @close="$emit('cancel')">
    <div class="tab-row" style="border-radius:6px 6px 0 0">
      <div class="tab" :class="{ active: tab === 'basic' }" @click="tab = 'basic'">Basic</div>
      <div class="tab" :class="{ active: tab === 'advanced' }" @click="tab = 'advanced'">Advanced</div>
      <div v-if="globalEnabled" class="tab" :class="{ active: tab === 'departments' }" @click="tab = 'departments'">Departments</div>
    </div>

    <!-- 手册 P21-22：Global Search 复选框（位于过滤器右侧） -->
    <label class="gs-check" :class="{ on: model._globalSearch }">
      <input type="checkbox" v-model="model._globalSearch" />
      <span class="gs-label">Global Search</span>
      <span class="gs-hint" v-if="model._globalSearch">跨 Installation / Department 搜索</span>
    </label>

    <div style="padding:14px 4px 0">
      <!-- Basic / Advanced 标签页 -->
      <template v-if="tab !== 'departments'">
        <div v-for="f in currentFields" :key="f.key" class="amos-field">
          <label>{{ f.label }}</label>
          <div class="ctrl">
            <select v-if="f.type === 'select'" v-model="model[f.key]" class="amos-select">
              <option value="">（全部）</option>
              <option v-for="o in filterOptions(f)" :key="o" :value="o">{{ o }}</option>
            </select>
            <input v-else-if="f.type === 'date'" type="date" v-model="model[f.key]" class="amos-input" />
            <label v-else-if="f.type === 'checkbox'" class="row" style="gap:6px">
              <input type="checkbox" v-model="model[f.key]" /> <span class="muted">{{ f.hint || '启用' }}</span>
            </label>
            <input v-else type="text" v-model="model[f.key]" class="amos-input" :placeholder="f.placeholder || ''" />
          </div>
        </div>
        <p v-if="!currentFields.length" class="muted" style="padding:6px 0">该标签页暂无过滤条件。</p>
      </template>

      <!-- 手册 P22-23：Departments 标签页（Installation → Department 多选树） -->
      <template v-else>
        <p class="muted" style="margin-bottom:8px;font-size:12px">选择要搜索的 Installation / Department。点击 Installation 可全选其下全部部门。</p>
        <div v-for="inst in deptTree" :key="inst.code" class="dept-group">
          <label class="dept-inst" :class="{ checked: isInstChecked(inst) }" @click="toggleInst(inst)">
            <span class="chk" />{{ inst.name }}（{{ inst.code }}）
          </label>
          <div class="dept-children">
            <label v-for="d in inst.depts" :key="d.code" class="dept-item" :class="{ checked: model._globalDepts?.includes(d.code) }" @click.stop="toggleDept(d.code)">
              <input type="checkbox" :checked="model._globalDepts?.includes(d.code)" @change="toggleDept(d.code)" />
              {{ d.name }}（{{ d.code }}）
            </label>
          </div>
        </div>
        <div class="row" style="gap:6px;margin-top:8px">
          <button class="amos-btn xs" @click="selectAllDepts">Select All</button>
          <button class="amos-btn xs" @click="deselectAllDepts">Deselect All</button>
          <button class="amos-btn xs" @click="invertDepts">Invert</button>
        </div>
        <p class="muted" style="margin-top:8px;font-size:11.5px">已选 {{ selectedDeptCount }} 个 Department。</p>
      </template>
    </div>
    <template #footer>
      <button class="amos-btn sm" @click="selectAll">Select All</button>
      <button class="amos-btn sm" @click="clearAll">Clear</button>
      <span class="spacer" />
      <button class="amos-btn" @click="$emit('cancel')">Cancel</button>
      <button class="amos-btn primary" @click="ok">OK</button>
    </template>
  </Modal>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import Modal from './Modal.vue'
import { departments, DEPARTMENTS_BY_INSTALLATION, installations } from '../data/amosData.js'
import { lookups } from '../mock/index.js'

const props = defineProps({
  basic: { type: Array, default: () => [] },
  advanced: { type: Array, default: () => [] },
})
const emit = defineEmits(['ok', 'cancel'])

const tab = ref('basic')
const currentFields = computed(() => (tab.value === 'basic' ? props.basic : props.advanced))
const model = reactive({ _globalSearch: false, _globalDepts: [] })
// 是否启用 Global Search 功能（可由外部控制）
const globalEnabled = computed(() => props.enableGlobal !== false)

// 按 Installation 分组的部门树
const deptTree = computed(() =>
  installations.map((inst) => ({
    ...inst,
    depts: departments.filter((d) => d.installation === inst.code),
  }))
)

const selectedDeptCount = computed(() => (model._globalDepts || []).length)

// 手册 P44-46：select 过滤器若带 lookupKey，则从对应 register（如 FunctionCriticality）读取选项
function filterOptions(f) {
  if (f.lookupKey) {
    const fn = lookups[f.lookupKey]
    const list = (fn ? fn(model) : []) || []
    return list.map((o) => o.code)
  }
  return f.options || []
}

function isInstChecked(inst) {
  return inst.depts.every((d) => (model._globalDepts || []).includes(d.code))
}
function toggleInst(inst) {
  const allChecked = isInstChecked(inst)
  const codes = inst.depts.map((d) => d.code)
  if (!model._globalDepts) model._globalDepts = []
  if (allChecked) {
    model._globalDepts = model._globalDepts.filter((c) => !codes.includes(c))
  } else {
    codes.forEach((c) => { if (!model._globalDepts.includes(c)) model._globalDepts.push(c) })
  }
}
function toggleDept(code) {
  if (!model._globalDepts) model._globalDepts = []
  const i = model._globalDepts.indexOf(code)
  if (i >= 0) model._globalDepts.splice(i, 1)
  else model._globalDepts.push(code)
}
function selectAllDepts() {
  model._globalDepts = departments.map((d) => d.code)
}
function deselectAllDepts() {
  model._globalDepts = []
}
function invertDepts() {
  const all = departments.map((d) => d.code)
  const sel = new Set(model._globalDepts || [])
  model._globalDepts = all.filter((c) => !sel.has(c))
}

function ok() {
  emit('ok', { ...model })
}
function selectAll() {
  currentFields.value.forEach((f) => {
    if (f.type === 'checkbox') model[f.key] = true
    else if (f.type === 'select') model[f.key] = ''
    else model[f.key] = ''
  })
}
function clearAll() {
  Object.keys(model).forEach((k) => {
    if (k.startsWith('_')) return // 保留 Global Search 状态字段
    if (typeof model[k] === 'boolean') model[k] = false
    else model[k] = ''
  })
}
</script>

<style scoped>
.gs-check { display:flex; align-items:center; gap:8px; padding:8px 10px; margin:-4px -4px 8px; border-bottom:1px solid var(--amos-border); background:#fafbfd; border-radius:4px; cursor:pointer; user-select:none; }
.gs-check.on { background:#e8f4ea; border-color:#a8dba8; }
.gs-label { font-weight:600; font-size:13px; color:#2b3a4d; }
.gs-hint { font-size:11px; color:#6b7a8a; margin-left:auto; }
.dept-group { border:1px solid var(--amos-border); border-radius:6px; margin-bottom:8px; overflow:hidden; }
.dept-inst { display:flex; align-items:center; gap:6px; padding:8px 10px; background:#f0f4f9; font-weight:600; font-size:12.5px; color:#2c486a; cursor:pointer; user-select:none; }
.dept-inst.checked { background:#d6e8ff; color:#1558b0; }
.dept-inst .chk { width:15px;height:15px;border:2px solid #999;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0; }
.dept-inst.checked .chk::after { content:'✓'; font-size:11px;color:#fff;background:#1f6fb2;width:11px;height:11px;border-radius:2px;display:flex;align-items:center;justify-content:center; }
.dept-children { padding:6px 8px; background:#fff; display:flex; flex-direction:column; gap:3px; }
.dept-item { display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:4px; font-size:12px; cursor:pointer; user-select:none; }
.dept-item:hover { background:#f3f8ff; }
.dept-item.checked { background:#e0effb; color:#1558b0; }
.dept-item input[type=checkbox] { accent-color: #1f6fb2; }
</style>
