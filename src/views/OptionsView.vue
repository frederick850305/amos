<template>
  <div class="opt">
    <div class="opt-grid">
      <!-- Task bar -->
      <section class="opt-card">
        <h3>Task bar（工具栏）</h3>
        <label class="row" style="gap:6px"><input type="checkbox" v-model="opt.showShortcut" /> 显示左侧工具栏</label>
        <div class="row" style="gap:16px;margin-top:8px">
          <label class="row" style="gap:6px"><input type="radio" value="icon" v-model="opt.shortcutMode" /> Icon bar（图标栏）</label>
          <label class="row" style="gap:6px"><input type="radio" value="list" v-model="opt.shortcutMode" /> List bar（列表栏）</label>
        </div>
      </section>

      <!-- General -->
      <section class="opt-card">
        <h3>General（常规）</h3>
        <label class="row" style="gap:6px"><input type="checkbox" v-model="opt.confirmExit" /> Confirm on Exit（退出时确认）</label>
        <div class="amos-field" style="margin-top:10px">
          <label>Windowing Mode</label>
          <div class="ctrl"><select v-model="opt.windowingMode" class="amos-select"><option>Maximized</option><option>Cascade</option></select></div>
        </div>
        <div class="amos-field" style="margin-top:6px">
          <label>Mailbox/Dashboard Check Interval (sec)</label>
          <div class="ctrl"><input type="number" v-model.number="opt.checkInterval" class="amos-input" style="width:120px" /></div>
        </div>
      </section>

      <!-- Dashboard -->
      <section class="opt-card">
        <h3>Dashboard（信息窗）</h3>
        <label class="row" style="gap:6px"><input type="checkbox" v-model="opt.enableDashboard" /> Enable Dashboard（启用仪表盘）</label>
        <div class="sub">Select / Deselect Alerts</div>
        <div class="alert-pick">
          <label v-for="a in allAlerts" :key="a.name" class="row" style="gap:6px">
            <input type="checkbox" :value="a.name" v-model="opt.selectedAlerts" /> {{ a.group }} · {{ a.name }}
          </label>
        </div>
        <label class="row" style="gap:6px;margin-top:8px"><input type="checkbox" v-model="opt.showGauge" /> Show Gauge（显示告警表盘）</label>
        <label class="row" style="gap:6px;margin-top:6px"><input type="checkbox" v-model="opt.showWorkflowNotification" /> Show Workflow Notifications（显示通知区）</label>
        <div class="amos-field" style="margin-top:6px">
          <label>URL（右下角网页）</label><div class="ctrl"><input v-model="opt.dashboardUrl" class="amos-input" placeholder="https://" /></div>
        </div>
        <div class="amos-field" style="margin-top:6px">
          <label>Image（左上角图片）</label><div class="ctrl"><input v-model="opt.dashboardImage" class="amos-input" placeholder="图片地址" /></div>
        </div>
      </section>

      <!-- Theme -->
      <section class="opt-card">
        <h3>Theme（主题风格）</h3>
        <label class="row" style="gap:6px"><input type="checkbox" v-model="opt.themeEnabled" /> Enable Theme</label>
        <p class="muted warn-note">注意：建议不要修改主题风格（可能会导致使用速度慢）。</p>
      </section>

      <!-- Views -->
      <section class="opt-card wide">
        <h3>Views（自定义界面）</h3>
        <div class="row" style="gap:8px">
          <input v-model="newView" class="amos-input" placeholder="新视图名称" style="width:180px" />
          <button class="amos-btn sm primary" @click="addView">Private（新增）</button>
          <button class="amos-btn sm" @click="updateView">Update</button>
          <button class="amos-btn sm" @click="deleteView">Delete</button>
          <button class="amos-btn sm" @click="setDefault">Set Default</button>
          <label class="row" style="gap:6px;margin-left:8px"><input type="checkbox" v-model="opt.startupWithView" /> Startup using default view</label>
        </div>
        <div class="list-box">
          <div v-for="(v, i) in opt.views" :key="i" class="list-item" :class="{ active: selViewIdx === i }" @click="selViewIdx = i">
            <span>{{ v }}</span><span v-if="opt.defaultView === v" class="tag green">默认</span>
          </div>
          <p v-if="!opt.views.length" class="muted">暂无自定义视图。</p>
        </div>
      </section>

      <!-- Predefined Fields -->
      <section class="opt-card wide">
        <h3>Predefined Fields（自定义字段）</h3>
        <div class="row" style="gap:8px">
          <select v-model="pfScope" class="amos-select" style="width:110px"><option>System</option><option>Private</option></select>
          <input v-model="pfName" class="amos-input" placeholder="字段名" style="width:160px" />
          <button class="amos-btn sm primary" @click="addPf">新增</button>
          <button class="amos-btn sm" @click="deletePf">Delete</button>
        </div>
        <div class="list-box">
          <div v-for="(f, i) in opt.predefinedFields" :key="i" class="list-item"><span class="tag blue">{{ f.scope }}</span> {{ f.name }}</div>
          <p v-if="!opt.predefinedFields.length" class="muted">暂无自定义字段。</p>
        </div>
      </section>

      <!-- Predefined Filter -->
      <section class="opt-card wide">
        <h3>Predefined Filter（自定义过滤）</h3>
        <div class="row" style="gap:8px">
          <select v-model="flScope" class="amos-select" style="width:110px"><option>System</option><option>Private</option></select>
          <input v-model="flName" class="amos-input" placeholder="过滤器名" style="width:160px" />
          <button class="amos-btn sm primary" @click="addFl">新增</button>
          <button class="amos-btn sm" @click="deleteFl">Delete</button>
        </div>
        <div class="list-box">
          <div v-for="(f, i) in opt.predefinedFilters" :key="i" class="list-item"><span class="tag blue">{{ f.scope }}</span> {{ f.name }}</div>
          <p v-if="!opt.predefinedFilters.length" class="muted">暂无自定义过滤。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { store } from '../store.js'
import { dashboardAlerts } from '../mock/index.js'

const opt = store.options
const allAlerts = dashboardAlerts.value

// Views
const newView = ref('')
const selViewIdx = ref(-1)
function addView() {
  const n = newView.value.trim()
  if (!n) return
  opt.views.push(n)
  newView.value = ''
  selViewIdx.value = opt.views.length - 1
}
function updateView() {
  if (selViewIdx.value < 0) return
  const n = newView.value.trim()
  if (n) opt.views[selViewIdx.value] = n
}
function deleteView() {
  if (selViewIdx.value < 0) return
  const d = opt.views[selViewIdx.value]
  opt.views.splice(selViewIdx.value, 1)
  if (opt.defaultView === d) opt.defaultView = ''
  selViewIdx.value = -1
}
function setDefault() {
  if (selViewIdx.value < 0) return
  opt.defaultView = opt.views[selViewIdx.value]
}

// Predefined Fields
const pfScope = ref('Private')
const pfName = ref('')
function addPf() {
  if (pfName.value.trim()) { opt.predefinedFields.push({ scope: pfScope.value, name: pfName.value.trim() }); pfName.value = '' }
}
function deletePf() { if (opt.predefinedFields.length) opt.predefinedFields.pop() }

// Predefined Filter
const flScope = ref('Private')
const flName = ref('')
function addFl() {
  if (flName.value.trim()) { opt.predefinedFilters.push({ scope: flScope.value, name: flName.value.trim() }); flName.value = '' }
}
function deleteFl() { if (opt.predefinedFilters.length) opt.predefinedFilters.pop() }
</script>

<style scoped>
.opt { padding: 16px; height: 100%; overflow: auto; }
.opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
.opt-card { background: #fff; border: 1px solid var(--amos-border); border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(20,50,90,.05); }
.opt-card.wide { grid-column: 1 / -1; }
.opt-card h3 { margin: 0 0 10px; font-size: 13px; color: #2c486a; border-bottom: 1px solid var(--amos-border); padding-bottom: 6px; }
.sub { font-size: 12px; color: var(--amos-text-soft); margin: 8px 0 4px; }
.alert-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; max-height: 140px; overflow: auto; }
.warn-note { font-size: 11.5px; color: #b4232d; margin: 8px 0 0; }
.list-box { margin-top: 10px; border: 1px solid var(--amos-border); border-radius: 6px; padding: 6px; max-height: 160px; overflow: auto; }
.list-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12.5px; }
.list-item:hover { background: var(--amos-blue-soft); }
.list-item.active { background: var(--amos-blue-soft); color: var(--amos-blue); font-weight: 700; }
.row { display: flex; align-items: center; }
@media (max-width: 980px) { .opt-grid { grid-template-columns: 1fr; } }
</style>
