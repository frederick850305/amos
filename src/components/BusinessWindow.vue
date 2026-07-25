<template>
  <div class="biz-win" v-if="config">
    <!-- 窗口标题条 -->
    <div class="bw-head">
      <h2>{{ config.windowTitle }}</h2>
      <div class="row" style="gap:6px">
        <span class="muted">{{ dbRows.length }} 条记录</span>
        <button class="amos-btn sm" @click="reopenFilter">查找 / Filter</button>
        <button class="amos-btn sm primary" @click="doNew">New</button>
        <button class="amos-btn sm" @click="doSave" :disabled="!selected">Save</button>
        <button class="amos-btn sm" @click="doDelete" :disabled="!selected">Delete</button>
        <!-- 手册 P40/P41：Functions 窗口工具栏 Install / Remove 按钮（无组件时 Install 可用、Remove 灰显；反之相反） -->
        <template v-if="config.dataKey === 'functions'">
          <button class="amos-btn sm" @click="openInstall" :disabled="!selected || !!selected.installedComponentId">Install</button>
          <button class="amos-btn sm" @click="openRemove" :disabled="!selected || !selected.installedComponentId">Remove</button>
        </template>
        <div class="bw-options">
          <button class="amos-btn sm" @click="optionsOpen = !optionsOpen" :disabled="!config.options?.length">Options ▾</button>
          <div v-if="optionsOpen" class="bw-options-menu" @mouseleave="optionsOpen = false">
            <button v-for="o in optionItems" :key="o.action" @click="runOption(o)" :class="{ checked: o.checked }" :disabled="o.disabled">{{ o.label }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 过滤器门禁：所有业务窗口先弹 Filter -->
    <FilterDialog
      v-if="showFilter"
      :basic="config.filterBasic || []"
      :advanced="config.filterAdvanced || []"
      @ok="applyFilter"
      @cancel="applyFilter"
    />

    <!-- 手册：Open 按钮弹出的"打开记录"对话框（按编号精确定位单条记录） -->
    <div v-if="showOpenDialog" class="open-dialog-overlay">
      <div class="open-dialog">
        <h3>Open Record — {{ config.windowTitle }}</h3>
        <p class="muted">输入{{ openKeyLabel }}以定位并打开该记录。</p>
        <div class="amos-field">
          <label>{{ openKeyLabel }}</label>
          <div class="ctrl"><input ref="openInputRef" class="amos-input" v-model="openKeyValue" @keydown.enter="confirmOpen" :placeholder="'如 ' + openKeyExample" /></div>
        </div>
        <div class="od-actions">
          <button class="amos-btn" @click="showOpenDialog = false">Cancel</button>
          <button class="amos-btn primary" @click="confirmOpen">OK</button>
        </div>
      </div>
    </div>

    <!-- Register as Component 对话框（手册 2 / P30） -->
    <div v-if="regDialog" class="open-dialog-overlay">
      <div class="open-dialog reg">
        <h3>Register as Component — {{ selected?.typeNumber }}</h3>
        <p class="muted">将所选部件类型注册为实际部件，继承全部类型信息（作业 / 计数器 / 测点）。按住 Ctrl 可多选安装地点。</p>
        <div class="reg-depts">
          <div v-for="grp in deptGroups" :key="grp.installation" class="reg-grp">
            <div class="reg-grp-h">{{ grp.installation }}</div>
            <label v-for="d in grp.items" :key="d.code" class="row" style="gap:6px">
              <input type="checkbox" :value="d.code" v-model="regSelected" /> {{ d.name }} <span class="muted">({{ d.code }})</span>
            </label>
          </div>
        </div>
        <label class="row" style="gap:6px;margin-top:8px"><input type="checkbox" v-model="regAutoStock" /> Auto-Register Stock Items（同时登记关联备件）</label>
        <div class="od-actions">
          <button class="amos-btn" @click="regDialog = false">Cancel</button>
          <button class="amos-btn primary" @click="confirmRegister">OK</button>
        </div>
      </div>
    </div>

    <!-- Install Component 对话框（手册 Component Locations：Functions 窗口 Options > Install Component） -->
    <div v-if="installDialog" class="open-dialog-overlay">
      <div class="open-dialog reg">
        <h3>Install Component — {{ selected?.functionNo }}</h3>
        <p class="muted">选择要安装到该功能位置的组件（当前未安装其他功能位置的组件）。</p>
        <div class="reg-depts">
          <label v-for="c in installCandidates" :key="c.id" class="row" style="gap:6px">
            <input type="radio" :value="c.number" v-model="installSelected" /> {{ c.number }} — {{ c.name }} <span class="muted">({{ c.status }})</span>
          </label>
        </div>
        <!-- 手册 P40：New Component Location 与功能位置的 location 相同 -->
        <div class="amos-field" style="margin-top:8px">
          <label>New Component Location</label>
          <div class="ctrl"><input class="amos-input" :value="selected?.location" readonly /></div>
        </div>
        <!-- 手册 P40 step 4：Add any Details -->
        <div class="amos-field">
          <label>Details</label>
          <div class="ctrl"><textarea class="amos-textarea" v-model="installDetails" placeholder="安装评论（可选）" /></div>
        </div>
        <div class="od-actions">
          <button class="amos-btn" @click="installDialog = false">Cancel</button>
          <button class="amos-btn primary" @click="confirmInstall">OK</button>
        </div>
      </div>
    </div>

    <!-- Remove Component 对话框（手册 P42 Removing a Component from a Function） -->
    <div v-if="removeDialog" class="open-dialog-overlay">
      <div class="open-dialog reg">
        <h3>Remove Component — {{ selected?.functionNo }}</h3>
        <p class="muted">从该功能位置拆卸组件 <b>{{ selected?.installedComponentId }}</b>。</p>
        <div class="amos-field">
          <label>New Location</label>
          <div class="ctrl" style="display:flex;gap:6px;align-items:center">
            <select class="amos-select" v-model="removeState.newLocation" style="flex:1">
              <option value="">（不更新 Location）</option>
              <option v-for="o in locationOptions" :key="o.code" :value="o.code">{{ o.label }}</option>
            </select>
            <button class="amos-btn sm" type="button" @click="openNewLocation" title="新增 Location 主数据">+</button>
          </div>
        </div>
        <div class="amos-field">
          <label>Status</label>
          <div class="ctrl">
            <select class="amos-select" v-model="removeState.status">
              <option value="">（保持当前状态）</option>
              <option>Scrapped</option>
              <option>Transferred</option>
              <option>Available</option>
            </select>
          </div>
        </div>
        <div class="amos-field">
          <label>Details</label>
          <div class="ctrl"><textarea class="amos-textarea" v-model="removeState.details" placeholder="拆卸评论（可选）" /></div>
        </div>
        <label class="row" style="gap:6px;margin-top:8px" :class="{ disabled: !hasSubFunctions }">
          <input type="checkbox" v-model="removeState.cascadeSubFunctions" :disabled="!hasSubFunctions" />
          Remove components from sub-functions also
        </label>
        <p v-if="!hasSubFunctions" class="muted" style="margin:4px 0 0;font-size:12px">所选功能位置没有子功能位置。</p>
        <div class="od-actions">
          <button class="amos-btn" @click="removeDialog = false">Cancel</button>
          <button class="amos-btn primary" @click="confirmRemove">OK</button>
        </div>
      </div>
    </div>

    <!-- 新增 Location 主数据（手册 Working with Functions：Location lookup 可扩展） -->
    <div v-if="newLocationDialog" class="open-dialog-overlay">
      <div class="open-dialog reg">
        <h3>New Location</h3>
        <p class="muted">新增一个标准 Location，保存后可用于 New Location / Function Location 等下拉。</p>
        <div class="amos-field">
          <label>Code</label>
          <div class="ctrl"><input class="amos-input" v-model="newLocationForm.code" placeholder="如 STORE-A" @keyup.enter="confirmNewLocation" /></div>
        </div>
        <div class="amos-field">
          <label>Description</label>
          <div class="ctrl"><input class="amos-input" v-model="newLocationForm.description" placeholder="如 Store Room A（可选）" @keyup.enter="confirmNewLocation" /></div>
        </div>
        <p v-if="newLocationError" class="muted" style="color:#c0392b;margin:4px 0 0">{{ newLocationError }}</p>
        <div class="od-actions">
          <button class="amos-btn" @click="newLocationDialog = false">Cancel</button>
          <button class="amos-btn primary" @click="confirmNewLocation">OK</button>
        </div>
      </div>
    </div>

    <!-- Rotation Log Notes 对话框（手册 P40：查看安装 / 拆卸时登记的 Details 评论） -->
    <div v-if="notesDialog" class="open-dialog-overlay">
      <div class="open-dialog reg">
        <h3>Notes — Rotation Log</h3>
        <div class="amos-field">
          <label>Details</label>
          <div class="ctrl"><textarea class="amos-textarea" :value="notesText" readonly /></div>
        </div>
        <div class="od-actions">
          <button class="amos-btn primary" @click="notesDialog = false">Close</button>
        </div>
      </div>
    </div>

    <!-- Copy Functions 对话框（手册 Copying Functions to Other Departments） -->
    <div v-if="copyFunctionsDialog" class="open-dialog-overlay copy-functions-overlay">
      <div class="open-dialog reg copy-functions">
        <h3>Copy Functions</h3>
        <p class="muted">Copy functions from the current department to another department.</p>
        <div class="amos-field">
          <label>To Department</label>
          <div class="ctrl">
            <select v-model="copyFunctionsState.toDepartment" class="amos-select">
              <option v-for="d in departmentOptions" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
        </div>
        <div class="copy-sections-row">
          <div class="copy-section">
            <div class="copy-section-title">Copy Functions with Status</div>
            <div class="copy-col">
              <label><input type="radio" value="All" v-model="copyFunctionsState.statusFilter" /> All</label>
              <label><input type="radio" value="In Use" v-model="copyFunctionsState.statusFilter" /> In Use</label>
              <label><input type="radio" value="Scrapped" v-model="copyFunctionsState.statusFilter" /> Scrapped</label>
            </div>
          </div>
          <div class="copy-section">
            <div class="copy-section-title">Status of New Function</div>
            <div class="copy-col">
              <label><input type="radio" value="Same" v-model="copyFunctionsState.newStatus" /> Same</label>
              <label><input type="radio" value="In Use" v-model="copyFunctionsState.newStatus" /> In Use</label>
              <label><input type="radio" value="Scrapped" v-model="copyFunctionsState.newStatus" /> Scrapped</label>
            </div>
          </div>
          <div class="copy-section">
            <div class="copy-section-title">Duplicates</div>
            <div class="copy-col">
              <label><input type="radio" value="Copy All" v-model="copyFunctionsState.duplicates" /> Copy All</label>
              <label><input type="radio" value="Skip" v-model="copyFunctionsState.duplicates" /> Skip</label>
            </div>
          </div>
        </div>
        <div class="copy-section">
          <div class="copy-section-title">Fields to Copy</div>
          <div class="copy-grid">
            <label><input type="checkbox" checked disabled /> Description</label>
            <label><input type="checkbox" v-model="copyFunctionsState.fields.reference" /> Reference</label>
            <label><input type="checkbox" v-model="copyFunctionsState.fields.criticality" /> Criticality</label>
            <label><input type="checkbox" v-model="copyFunctionsState.fields.location" /> Location</label>
            <label><input type="checkbox" v-model="copyFunctionsState.fields.details" /> Details</label>
            <label><input type="checkbox" v-model="copyFunctionsState.fields.maintenanceBudget" /> Maintenance Budget</label>
            <label><input type="checkbox" v-model="copyFunctionsState.fields.stockBudget" /> Stock Budget</label>
          </div>
        </div>
        <div class="copy-section">
          <div class="copy-section-title">Related Functions</div>
          <div class="copy-grid">
            <label :class="{ disabled: copyFunctionsState.duplicates === 'Skip' }"><input type="checkbox" v-model="copyFunctionsState.related.childFunctions" :disabled="copyFunctionsState.duplicates === 'Skip'" /> Child Functions</label>
            <label :class="{ disabled: copyFunctionsState.duplicates === 'Skip' }"><input type="checkbox" v-model="copyFunctionsState.related.parentFunction" :disabled="copyFunctionsState.duplicates === 'Skip'" /> Parent Function</label>
          </div>
        </div>
        <div class="od-actions">
          <button class="amos-btn" @click="copyFunctionsDialog = false">Cancel</button>
          <button class="amos-btn primary" @click="confirmCopyFunctions">OK</button>
        </div>
      </div>
    </div>

    <!-- Copy Functions 重复编号报告对话框（手册 Copying Functions - Handling Duplicate Function Numbers） -->
    <div v-if="duplicateReportDialog" class="open-dialog-overlay copy-functions-overlay">
      <div class="open-dialog reg duplicate-report">
        <h3>Copy Functions</h3>
        <div class="duplicate-report-body">
          <div class="duplicate-info-icon">i</div>
          <div class="duplicate-report-text">
            <p>Functions have been copied.</p>
            <p>There are now duplicate function numbers that need to be corrected:</p>
            <ul class="duplicate-list">
              <li v-for="num in duplicateReportNumbers" :key="num">{{ num }}</li>
            </ul>
          </div>
        </div>
        <div class="od-actions">
          <button class="amos-btn primary" @click="confirmDuplicateReport">OK</button>
        </div>
      </div>
    </div>

    <!-- Change Function Status 对话框（手册 2 / P38-39 Changing Function Status） -->
    <div v-if="changeStatusDialog" class="open-dialog-overlay copy-functions-overlay">
      <div class="open-dialog reg change-function-status">
        <h3>Change Function Status — {{ selected?.functionNo }}</h3>
        <p class="muted">当前状态：<b>{{ selected?.status }}</b></p>
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
        <div class="od-actions">
          <button class="amos-btn" @click="changeStatusDialog = false">Cancel</button>
          <button class="amos-btn primary" @click="confirmChangeFunctionStatus">OK</button>
        </div>
      </div>
    </div>

    <div v-else class="bw-body" @contextmenu.prevent="onCtxMenu($event)">
      <!-- 左：结果列表 -->
      <section class="bw-list">
        <RecordList
          ref="listRef"
          :columns="config.columns"
          :rows="viewRows"
          :row-key="rowKey"
          :preselect-id="listPreselectId"
          :group-by="config.groupBy || ''"
          @select="onSelect"
          @open="onOpen"
        >
          <!-- 手册 P44-46：Criticality 列以颜色编码指示器显示 -->
          <template #cell-criticality="{ row, value }">
            <span class="crit-indicator" :style="{ background: critColor(value) }" :title="'Criticality: ' + (value || '—')" />
            <span class="crit-text">{{ value || '—' }}</span>
          </template>
          <!-- 手册 P44-46：注册表 Indicator 列以颜色块显示 -->
          <template #cell-color="{ value }">
            <span class="crit-indicator" :style="{ background: value }" :title="value" />
            <span class="crit-text">{{ value }}</span>
          </template>
        </RecordList>
      </section>

      <!-- 右：明细标签页 -->
      <section class="bw-detail" v-if="selected">
        <div class="bd-head">
          <strong>{{ selected[detailTitleKey] || config.windowTitle }}</strong>
          <span class="tag" :class="statusClass">{{ selected[config.statusField] || '—' }}</span>
        </div>
        <RecordDetail :tabs="config.detailTabs" :model="selected" :preset-tab-id="detailPresetTab" :show-indicators="showIndicators && isJobWindow" :linkable-keys="LINKABLE_FIELDS" @change="onFieldChange" @subaction="onSubAction" @toggle-link="onToggleLink">
          <!-- 手册 2 / P30：部件类型窗口的 Components 标签，列出已注册的组件实例 -->
          <template #extra-components="scope">
            <p class="muted">由该类型注册的组件实例（手册 2 / P30）。</p>
            <table class="amos-grid sub" v-if="regComponentsList.length">
              <thead><tr><th>Number</th><th>Name</th><th>Location</th><th>Status</th><th></th></tr></thead>
              <tbody>
                <tr v-for="c in regComponentsList" :key="c.id" :class="{ 'highlight-row': highlightCompId.has(c.id) }">
                  <td>{{ c.number }}</td><td>{{ c.name }}</td><td>{{ c.location }}</td><td>{{ c.status }}</td>
                  <td><button class="amos-btn xs" @click="viewComponent(c)">View</button></td>
                </tr>
              </tbody>
            </table>
            <p v-else class="muted">尚未注册组件。点击 Options ▾ → Register as Component。</p>
          </template>
        </RecordDetail>
      </section>
      <section v-else class="bw-detail empty">
        <p class="muted">双击列表行查看明细，或点击 <b>New</b> 创建记录。</p>
      </section>
      <!-- 手册 P40/P41：右键菜单 Install / Remove Component -->
      <div v-if="ctxOpen" class="bw-options-menu ctx-menu" :style="{ left: ctxX + 'px', top: ctxY + 'px' }" @mouseleave="ctxOpen = false">
        <button :disabled="!selected || !!selected.installedComponentId" @click="openInstall">Install Component</button>
        <button :disabled="!selected || !selected.installedComponentId" @click="openRemove">Remove Component</button>
      </div>
    </div>

    <div v-if="!config" class="bw-empty muted">该窗口未配置。</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onActivated, onBeforeUnmount, nextTick } from 'vue'
import FilterDialog from './FilterDialog.vue'
import RecordList from './RecordList.vue'
import RecordDetail from './RecordDetail.vue'
import { store, showToast, openWindow, setPresetFilter, scopeByDepartment } from '../store.js'
import { db, uid, lookups } from '../mock/index.js'
import { componentService } from '../services/componentService.js'
import { jobService, LINKABLE_FIELDS } from '../services/jobService.js'
import { stockItemService } from '../services/stockItemService.js'
import { stockTypeService } from '../services/stockTypeService.js'
import { functionService } from '../services/functionService.js'
import { locationService } from '../services/locationService.js'
import { counterService } from '../services/counterService.js'
import { collectionService } from '../services/collectionService.js'
import { windowRegistry } from '../windows/registry.js'
import { matchRow, matchPlanning } from '../utils/filter.js'
import { departments } from '../data/amosData.js'

// 手册 P44-46：根据 criticality degree 在 FunctionCriticality 注册表中查对应颜色编码指示器
function critColor(val) {
  const list = lookups.criticalities()
  const found = list.find((c) => c.code === val)
  return found ? found.color : '#bdc3c7'
}

const config = computed(() => windowRegistry[store.activeKey] || null)

// Options 菜单项：对系统参数类开关（toggle）附上当前状态（✓）；
// 手册 P40/P41：Functions 窗口 Install/Remove 互斥可用（无组件时 Install 可用、Remove 灰显；反之相反）
const optionItems = computed(() => (config.value?.options || []).map((o) => {
  if (o.action === 'toggle-use-types') {
    return { ...o, checked: store.useComponentTypes, label: (store.useComponentTypes ? '✓ ' : '    ') + o.label }
  }
  if (config.value?.dataKey === 'functions' && (o.action === 'install-component' || o.action === 'remove-component')) {
    const hasComp = !!(selected.value && selected.value.installedComponentId)
    if (o.action === 'install-component') return { ...o, disabled: hasComp }
    if (o.action === 'remove-component') return { ...o, disabled: !hasComp }
  }
  return o
}))
const rowKey = computed(() => {
  const d = config.value?.dataKey
  if (d === 'jobs') return 'jobNo'
  if (d === 'workOrders') return 'workOrderNo'
  if (d === 'stockTypes') return 'stockTypeNo'
  if (d === 'stockItems') return 'stockItemNo'
  if (d === 'purchaseForms') return 'formNo'
  if (d === 'budgets') return 'code'
  if (d === 'vouchers') return 'voucherNo'
  return 'id'
})
const detailTitleKey = computed(() => {
  const d = config.value?.dataKey
  return { componentTypes: 'typeNumber', components: 'number', functions: 'functionNo', jobs: 'jobNo', workOrders: 'workOrderNo', stockTypes: 'stockTypeNo', stockItems: 'stockItemNo', purchaseForms: 'formNo', budgets: 'code', vouchers: 'voucherNo', functionCriticalities: 'code' }[d] || 'id'
})

const dbRows = computed(() => {
  const d = config.value?.dataKey
  const rows = d ? collectionService.collection(d) : []
  // 手册 P20（Installations and Departments）：按当前安装地点 + 部门过滤数据权限
  return scopeByDepartment(rows)
})
const viewRows = ref([])
const showFilter = ref(false)
const selected = ref(null)
const optionsOpen = ref(false)
const listRef = ref(null)

// 手册 P61-64：Component Jobs 窗口 Options > Show Indicators 开关（显示字段链接图标）
const showIndicators = ref(false)
const isJobWindow = computed(() => config.value?.dataKey === 'jobs')

// 手册 P61-64：点击字段链接图标 → 切换 model.linkedFields 中该字段的链接状态
function onToggleLink({ key }) {
  const m = selected.value
  if (!m) return
  m.linkedFields = m.linkedFields || []
  const i = m.linkedFields.indexOf(key)
  if (i >= 0) m.linkedFields.splice(i, 1)
  else m.linkedFields.push(key)
}

// 手册 P57-58：保存组件类型作业时，传播到继承作业（仅链接字段）+ 询问是否应用到全部组件
function handleJobSave() {
  const job = selected.value
  if (!job) return
  if (job.targetType === 'ComponentType') {
    jobService.propagateToInherited(job)
    if (window.confirm('是否将此类型作业应用到该类型的全部现有组件（创建 / 刷新继承作业）？')) {
      const n = jobService.applyTypeJobToAll(job)
      showToast(`已应用到 ${n} 个组件的继承作业`, 'ok')
    } else {
      showToast('已保存类型作业（未应用到组件）', 'ok')
    }
  } else {
    showToast('已保存作业（原型：内存态）', 'ok')
  }
}

// ===== Open Record 对话框状态 =====
const showOpenDialog = ref(false)
const openKeyValue = ref('')
const openInputRef = ref(null)

const statusClass = computed(() => {
  const v = (selected.value && selected.value[config.value?.statusField]) || ''
  const s = String(v).toLowerCase()
  if (/(completed|available|active|passed|posted|open|issued|received)/.test(s)) return 'green'
  if (/(requested|planned|quoted|approved|partly|submitted|in transit|stable)/.test(s)) return 'blue'
  if (/(overdue|critical|shortage|rejected|postponed|cancelled|draft|up)/.test(s)) return 'red'
  if (/(due|pending|warning)/.test(s)) return 'orange'
  return 'gray'
})

// 手册 P20：切换安装地点或部门时，自动刷新当前窗口数据（清除选中 + 重新过滤）
watch(() => store.installation, () => { selected.value = null; applyFilter({}) })
watch(() => store.department, () => { selected.value = null; applyFilter({}) })

// 不再于 activeKey 变化时硬重置（避免切回窗口丢失选中记录与过滤上下文）；改用 onActivated 仅在存在 presetFilter 时应用

function applyFilter(criteria) {
  showFilter.value = false
  const c = criteria || {}
  const basic = config.value?.filterBasic || []
  viewRows.value = dbRows.value.filter((row) => {
    if (!matchRow(row, basic, c)) return false
    // 手册 1.5：Dashboard 告警带入的 Planning 预过滤（如 Overdue / Due This Week）
    if (c.planning && config.value?.dataKey === 'workOrders' && !matchPlanning(row, c.planning)) return false
    return true
  })
  // 手册 2：Component Types 列表的 Jobs 列显示该类型实际关联的作业数（动态计算，非硬编码）
  if (config.value?.dataKey === 'componentTypes') {
    viewRows.value = viewRows.value.map((r) => ({
      ...r,
      jobs: jobService.countForComponentType(r.typeNumber),
    }))
  }
}

function reopenFilter() {
  selected.value = null
  showFilter.value = true
}

function onSelect(row) {
  selected.value = row
  // 用户手动切换记录时，清除回跳高亮（避免残留旧组件行淡黄背景）
  highlightCompId.value.clear()
}
function onOpen(row) {
  selected.value = row
  highlightCompId.value.clear()
}

function blankRecord() {
  const d = config.value.dataKey
  const rec = {}
  const key = detailTitleKey.value
  if (key !== 'id') rec[key] = ''
  config.value.columns.forEach((c) => (rec[c.key] = ''))
  if (config.value.statusField && config.value.statusOptions?.length) rec[config.value.statusField] = config.value.statusOptions[0]
  rec.id = 'new_' + Date.now()
  return rec
}

function doNew() {
  if (showFilter.value) return
  const rec = blankRecord()
  collectionService.push(config.value.dataKey, rec)
  viewRows.value = [...viewRows.value, rec]
  selected.value = rec
  showToast('已新建记录，编辑后点击 Save', 'ok')
}
function doSave() {
  if (!selected.value) return showToast('请先选择或新建记录', 'warn')
  // 手册 3（Update Counters）：保存时把读数回写到组件计数器，并级联依赖组件
  if (config.value?.dataKey === 'counterLogs') {
    counterService.recordReading(selected.value)
    showToast('已记录读数并回写组件计数器（含依赖联动）', 'ok')
    return
  }
  // 手册 P57-58：作业保存（类型作业 → 传播 / 应用到全部组件）
  if (config.value?.dataKey === 'jobs') {
    handleJobSave()
    return
  }
  showToast('已保存（原型：内存态）', 'ok')
}
function doDelete() {
  if (!selected.value) return showToast('请先选择记录', 'warn')
  const key = rowKey.value
  const target = selected.value[key]
  // 手册 P61：删除组件类型作业 → 级联删除所有继承它的组件作业
  if (config.value?.dataKey === 'jobs' && selected.value.targetType === 'ComponentType') {
    jobService.remove(target)
    showToast('已删除类型作业（含级联的继承组件作业）', 'warn')
  } else {
    collectionService.removeBy(config.value.dataKey, (r) => r[key] === target)
    showToast('已删除记录', 'warn')
  }
  const j = viewRows.value.findIndex((r) => r[rowKey.value] === selected.value[rowKey.value])
  if (j >= 0) viewRows.value.splice(j, 1)
  selected.value = null
}
function doRefresh() {
  applyFilter({})
  showToast('已刷新', 'info')
}
// 手册 Component Locations：Functions 窗口字段变更时的级联同步
function onFieldChange(e) {
  if (!e || !e.key || !selected.value) return
  if (config.value?.dataKey === 'functions') {
    const fn = selected.value.functionNo
    if (e.key === 'location') {
      // 修改 function location → 级联更新已安装组件的 location
      functionService.updateLocation(fn, e.value)
      showToast('功能位置地点变更，已级联更新安装组件的 Location', 'info')
    } else if (e.key === 'installedComponentId') {
      // 手动改 function 的 installedComponentId → 双向同步组件的 functionNo
      if (e.value) {
        const comp = componentService.listSync().find((c) => c.number === e.value)
        if (comp) componentService.setFunction(comp.id, fn)
      }
      showToast('已同步组件的功能位置', 'info')
    }
  }
}

// ===== Open Record 对话框：主键字段标签与示例 =====
const openKeyLabel = computed(() => {
  const col = (config.value?.columns || []).find((c) => c.key === detailTitleKey.value)
  return (col && col.label) || detailTitleKey.value
})
const openKeyExample = computed(() => {
  // 取第一条记录的主键值作为示例（如 CT-1001 / WO-2607）
  if (!dbRows.value.length) return '…'
  return String(dbRows.value[0][detailTitleKey.value] || '')
})

function doOpen() {
  if (showFilter.value) return
  openKeyValue.value = ''
  showOpenDialog.value = true
}
function confirmOpen() {
  const val = openKeyValue.value.trim()
  if (!val) { showToast('请输入编号', 'warn'); return }
  const key = detailTitleKey.value
  const rec = dbRows.value.find((r) => String(r[key] || '').toLowerCase() === val.toLowerCase())
  if (!rec) {
    showToast(`未找到 ${openKeyLabel.value} 为「${val}」的记录`, 'warn')
    return
  }
  // 确保该记录在 viewRows 中可见（若当前被过滤掉了则加入）
  if (!viewRows.value.find((r) => r[key] === rec[key])) {
    viewRows.value = [...viewRows.value, rec]
  }
  selected.value = rec
  showOpenDialog.value = false
  showToast(`已打开：${rec[key]}`, 'ok')
}

function runOption(o) {
  optionsOpen.value = false
  // 手册 2 / P30：从部件类型窗口把类型注册为实际部件
  if (o.action === 'register-component') { openRegister(); return }
  // 手册 2 / P37：Options > View Job 打开 Component Type Jobs（预过滤到当前选中类型）
  if (o.action === 'view-job') { viewTypeJobs(); return }
  // 手册 2 / P38：Options > Add Part 快速添加备件到类型的 Parts 列表
  if (o.action === 'add-part') { addPart(); return }
  // 手册 2 / P37：Options > Copy 复制组件类型（选条目 + 新编号 + Save）
  if (o.action === 'copy-type') { copyComponentType(); return }
  // 手册 2 / P36 脚注：系统参数 Use Component Types 开关
  if (o.action === 'toggle-use-types') { store.useComponentTypes = !store.useComponentTypes; showToast(`Use Component Types = ${store.useComponentTypes ? 'TRUE' : 'FALSE'}（系统参数）`, 'info'); return }
  // 手册 Component Locations：Functions 窗口 Options > Install / Remove Component
  if (o.action === 'install-component') { openInstall(); return }
  if (o.action === 'remove-component') { openRemove(); return }
  // 手册 Copying Functions to Other Departments：Functions 窗口 Options > Copy Functions
  if (o.action === 'copy-functions') { openCopyFunctions(); return }
  // 手册 2 / P38-39 Changing Function Status：Functions 窗口 Options > Change Status
  if (o.action === 'change-status') { openChangeFunctionStatus(); return }
  // 手册 P61-64：Component Jobs 窗口 Options —— 字段链接例外
  if (o.action === 'show-indicators') {
    showIndicators.value = !showIndicators.value
    showToast(`Show Indicators = ${showIndicators.value ? 'ON（显示字段链接图标）' : 'OFF'}`, 'info')
    return
  }
  if (o.action === 'link-all' || o.action === 'remove-all-links' || o.action === 'copy-link') {
    const s = selected.value
    if (!s || s.targetType !== 'Component') { showToast('请在 Component Jobs 窗口选择一条组件作业', 'warn'); return }
    if (o.action === 'link-all') { jobService.linkAll(s.targetId); showToast('已将本组件全部继承作业的字段链接到类型作业', 'ok') }
    else if (o.action === 'remove-all-links') { jobService.removeAllLinks(s.targetId); showToast('已解除本组件全部继承作业的字段链接', 'ok') }
    else if (o.action === 'copy-link') { jobService.copyLink(s.jobNo); showToast('已将当前作业的链接配置复制到其他继承作业', 'ok') }
    return
  }
  showToast(`执行：${o.label}（原型演示）`, 'info')
}

// ===== Install / Remove Component（手册 Component Locations：Functions 窗口 Options / 按钮 / 右键）=====
const installDialog = ref(false)
const installSelected = ref('')
const installDetails = ref('') // 手册 P40 step 4：安装时登记的 Details 评论
const installCandidates = computed(() => {
  if (config.value?.dataKey !== 'functions' || !selected.value) return []
  // 当前未安装到任何功能位置（或已安装到本 function）且在当前 department 范围内的组件可被选作安装
  return scopeByDepartment(
    componentService.listSync().filter((c) => !c.functionNo || c.functionNo === selected.value.functionNo)
  )
})
function openInstall() {
  const fn = selected.value
  if (!fn) { showToast('请先选择功能位置', 'warn'); return }
  if (fn.installedComponentId) { showToast('该功能位置已安装组件，请先 Remove Component', 'warn'); return }
  installSelected.value = ''
  installDetails.value = ''
  installDialog.value = true
}
async function confirmInstall() {
  const fn = selected.value
  if (!fn || !installSelected.value) { showToast('请选择组件', 'warn'); return }
  await functionService.installComponent(fn.functionNo, installSelected.value, installDetails.value)
  installDialog.value = false
  showToast(`已将 ${installSelected.value} 安装到 ${fn.functionNo}`, 'ok')
  applyFilter({})
}

// 手册 P42 Removing a Component from a Function：New Location / Status / Details / sub-functions
// 手册 Working with Functions：Location 字段使用编码 + 描述的 lookup（与 Functions 窗口一致）
const locationOptions = computed(() => lookups.locations())
const removeDialog = ref(false)
const removeState = reactive({ newLocation: '', status: '', details: '', cascadeSubFunctions: false })
// 手册 Working with Functions：Location 作为主数据，支持在 New Location 下拉旁新增
const newLocationDialog = ref(false)
const newLocationForm = reactive({ code: '', description: '' })
const newLocationError = ref('')
function openNewLocation() {
  newLocationForm.code = ''
  newLocationForm.description = ''
  newLocationError.value = ''
  newLocationDialog.value = true
}
function confirmNewLocation() {
  const res = locationService.create({ code: newLocationForm.code, description: newLocationForm.description })
  if (!res.ok) { newLocationError.value = res.error; return }
  newLocationDialog.value = false
  removeState.newLocation = res.record.code // 自动选中新建的 Location
  showToast(`已新增 Location：${res.record.code}`, 'ok')
}
function openRemove() {
  const fn = selected.value
  if (!fn) { showToast('请先选择功能位置', 'warn'); return }
  if (!fn.installedComponentId) { showToast('该功能位置未安装组件', 'warn'); return }
  removeState.newLocation = ''
  removeState.status = ''
  removeState.details = ''
  removeState.cascadeSubFunctions = false
  removeDialog.value = true
}
async function confirmRemove() {
  const fn = selected.value
  if (!fn) return
  const res = await functionService.removeComponent(fn.functionNo, {
    newLocation: removeState.newLocation,
    status: removeState.status,
    details: removeState.details,
    cascadeSubFunctions: removeState.cascadeSubFunctions,
  })
  removeDialog.value = false
  const extra = removeState.cascadeSubFunctions ? '（含子功能位置）' : ''
  let msg = `已从 ${fn.functionNo} 拆卸组件${extra}`
  // 手册 P42：Scrapped / Transferred 时取消未开始工单；已 Started 的工单保留
  if (res?.cancelledWorkOrders?.length) {
    msg += `；已取消 ${res.cancelledWorkOrders.length} 张未开始工单（${res.cancelledWorkOrders.join(', ')}）`
  }
  // 手册 P42 Note：依赖该组件的轮次作业随拆卸停用
  if (res?.deactivatedRoundJobs?.length) {
    msg += `；${res.deactivatedRoundJobs.length} 个轮次作业已停用（${res.deactivatedRoundJobs.join(', ')}）`
  }
  showToast(msg, 'ok')
  applyFilter({})
}

// 手册 P40：Rotation Log 的 Notes 按钮查看安装 / 拆卸时登记的 Details 评论
const notesDialog = ref(false)
const notesText = ref('')
function onSubAction(e) {
  if (e.action === 'notes' && e.tabId === 'rotation') {
    if (!e.row) { showToast('请先在 Rotation Log 中选择一行', 'warn'); return }
    notesText.value = e.row.details || '（无评论）'
    notesDialog.value = true
  }
}

// 手册 P40/P41：右键菜单 Install / Remove Component
const ctxOpen = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
function onCtxMenu(e) {
  ctxX.value = e.clientX
  ctxY.value = e.clientY
  ctxOpen.value = true
}

// ===== Change Function Status（手册 2 / P38-39 Changing Function Status）=====
const changeStatusDialog = ref(false)
const changeStatusTarget = ref('In Use')
const changeStatusCascade = ref(false)
const functionStatusOptions = ['In Use', 'Scrapped']
const hasSubFunctions = computed(() => {
  if (config.value?.dataKey !== 'functions' || !selected.value) return false
  return dbRows.value.some((f) => f.parentFunctionNo === selected.value.functionNo)
})
function openChangeFunctionStatus() {
  const fn = selected.value
  if (!fn) { showToast('请先选择功能位置', 'warn'); return }
  // 手册：不能对当前装有 component 的 function 更改 status
  if (fn.installedComponentId) {
    showToast('该功能位置已安装组件，不能更改状态（请先 Remove Component）', 'warn')
    return
  }
  changeStatusTarget.value = fn.status
  changeStatusCascade.value = false
  changeStatusDialog.value = true
}
function confirmChangeFunctionStatus() {
  const fn = selected.value
  if (!fn) return
  const res = functionService.changeStatus(fn.functionNo, changeStatusTarget.value, { cascadeSubFunctions: changeStatusCascade.value })
  if (!res.ok) {
    if (res.reason === 'installed') showToast('该功能位置已安装组件，不能更改状态', 'warn')
    else showToast('状态修改失败', 'warn')
    return
  }
  changeStatusDialog.value = false
  // 把 db 中的最新值同步回列表与当前选中行
  res.updatedIds.forEach((id) => {
    const row = dbRows.value.find((r) => r.id === id)
    if (row) Object.assign(row, db.functions.find((f) => f.id === id))
    if (selected.value && selected.value.id === id) Object.assign(selected.value, db.functions.find((f) => f.id === id))
  })
  const extra = changeStatusCascade.value && res.updatedIds.length > 1 ? `（含 ${res.updatedIds.length - 1} 个子功能位置）` : ''
  showToast(`功能位置状态已改为 ${changeStatusTarget.value}${extra}`, 'ok')
}

// ===== Copy Functions（手册 Copying Functions to Other Departments）=====
const copyFunctionsDialog = ref(false)
const copyFunctionsState = reactive({
  toDepartment: '',
  statusFilter: 'All',
  newStatus: 'Same',
  duplicates: 'Copy All',
  fields: {
    description: true,
    reference: true,
    criticality: true,
    location: true,
    details: true,
    maintenanceBudget: false,
    stockBudget: false,
  },
  related: {
    childFunctions: true,
    parentFunction: true,
  },
})
const duplicateReportDialog = ref(false)
const duplicateReportNumbers = ref([])
const duplicateReportTarget = ref('')
const duplicateReportNewIds = ref([])
const departmentOptions = computed(() => departments.map((d) => d.code))
// 手册：选择 Skip duplicates 时，不能包含 referenced parent and child functions
watch(() => copyFunctionsState.duplicates, (v) => {
  if (v === 'Skip') {
    copyFunctionsState.related.childFunctions = false
    copyFunctionsState.related.parentFunction = false
  }
})
function openCopyFunctions() {
  copyFunctionsState.toDepartment = departmentOptions.value.find((d) => d !== store.department) || ''
  copyFunctionsState.statusFilter = 'All'
  copyFunctionsState.newStatus = 'Same'
  copyFunctionsState.duplicates = 'Copy All'
  copyFunctionsState.fields.description = true
  copyFunctionsState.fields.reference = true
  copyFunctionsState.fields.criticality = true
  copyFunctionsState.fields.location = true
  copyFunctionsState.fields.details = true
  copyFunctionsState.fields.maintenanceBudget = false
  copyFunctionsState.fields.stockBudget = false
  copyFunctionsState.related.childFunctions = true
  copyFunctionsState.related.parentFunction = true
  copyFunctionsDialog.value = true
}
function buildCopyFunction(fn, newNo, target) {
  const newFn = {
    id: uid('fn'),
    functionNo: newNo,
    department: target,
    description: copyFunctionsState.fields.description ? fn.description : '',
    reference: copyFunctionsState.fields.reference ? fn.reference : '',
    status: copyFunctionsState.newStatus === 'Same' ? fn.status : copyFunctionsState.newStatus,
    criticality: copyFunctionsState.fields.criticality ? fn.criticality : '',
    location: copyFunctionsState.fields.location ? fn.location : '',
    installedComponentId: '',
    counter: fn.counter || '',
    functionCounters: [],
    rotationLog: [],
    assetValue: 0,
    acquisitionDate: '',
    currency: 'USD',
    depreciation: 0,
  }
  if (copyFunctionsState.fields.details) {
    Object.assign(newFn, {
      sfiCode: fn.sfiCode || '',
      system: fn.system || '',
      subSystem: fn.subSystem || '',
      remarks: fn.remarks || '',
      serialNo: fn.serialNo || '',
      maker: fn.maker || '',
      model: fn.model || '',
      tagNo: fn.tagNo || '',
      functionCounters: (fn.functionCounters || []).map((x) => ({ ...x })),
      rotationLog: (fn.rotationLog || []).map((x) => ({ ...x })),
      assetValue: fn.assetValue || 0,
      acquisitionDate: fn.acquisitionDate || '',
      currency: fn.currency || 'USD',
      depreciation: fn.depreciation || 0,
    })
  }
  return newFn
}
function confirmCopyFunctions() {
  const target = copyFunctionsState.toDepartment
  if (!target) { showToast('请选择目标 Department', 'warn'); return }
  if (target === store.department) { showToast('目标部门不能与当前部门相同', 'warn'); return }

  // 源：当前部门的 functions
  let source = dbRows.value.filter((f) => f.department === store.department)
  if (copyFunctionsState.statusFilter !== 'All') {
    source = source.filter((f) => f.status === copyFunctionsState.statusFilter)
  }

  const toCopy = new Set(source)

  // 包含子功能位置
  if (copyFunctionsState.related.childFunctions) {
    source.forEach((f) => {
      dbRows.value.filter((c) => c.parentFunctionNo === f.functionNo).forEach((c) => {
        if (copyFunctionsState.statusFilter === 'All' || c.status === copyFunctionsState.statusFilter) {
          toCopy.add(c)
        }
      })
    })
  }

  // 包含父功能位置
  if (copyFunctionsState.related.parentFunction) {
    Array.from(toCopy).forEach((f) => {
      if (!f.parentFunctionNo) return
      const p = dbRows.value.find((x) => x.functionNo === f.parentFunctionNo)
      if (p && (copyFunctionsState.statusFilter === 'All' || p.status === copyFunctionsState.statusFilter)) {
        toCopy.add(p)
      }
    })
  }

  // 父先子后排序，便于映射 parentFunctionNo
  const ordered = Array.from(toCopy).sort((a, b) => {
    if (a.parentFunctionNo === b.functionNo) return 1
    if (b.parentFunctionNo === a.functionNo) return -1
    return 0
  })

  const copied = []
  const skipped = []
  const newFnIds = []
  const idMap = new Map() // 原 functionNo -> 新 functionNo

  ordered.forEach((fn) => {
    const existing = dbRows.value.find((f) => f.functionNo === fn.functionNo && f.department === target)
    if (existing && copyFunctionsState.duplicates === 'Skip') {
      skipped.push(fn.functionNo)
      return
    }

    // 手册：Copy All 保留原编号，允许产生重复编号，复制后统一提示
    const newNo = fn.functionNo

    const newFn = buildCopyFunction(fn, newNo, target)
    newFnIds.push(newFn.id)
    idMap.set(fn.functionNo, newNo)
    functionService.add(newFn)
    copied.push(newFn)
  })

  // 回写新功能位置的 parentFunctionNo
  copied.forEach((newFn) => {
    const original = ordered.find((f) => idMap.get(f.functionNo) === newFn.functionNo)
    if (!original) return
    if (original.parentFunctionNo && idMap.has(original.parentFunctionNo)) {
      newFn.parentFunctionNo = idMap.get(original.parentFunctionNo)
    } else {
      newFn.parentFunctionNo = ''
    }
  })

  copyFunctionsDialog.value = false

  // 手册：Copy All 导致目标部门出现重复编号时，弹出报告对话框并提示修正
  if (copyFunctionsState.duplicates === 'Copy All' && newFnIds.length) {
    const targetFns = dbRows.value.filter((f) => f.department === target)
    const counts = {}
    targetFns.forEach((f) => { counts[f.functionNo] = (counts[f.functionNo] || 0) + 1 })
    const duplicates = Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .map(([no]) => no)
      .sort()

    if (duplicates.length) {
      duplicateReportNumbers.value = duplicates
      duplicateReportTarget.value = target
      duplicateReportNewIds.value = newFnIds
      duplicateReportDialog.value = true
      applyFilter({})
      return
    }
  }

  applyFilter({})
  showToast(`已复制 ${copied.length} 个功能位置到 ${target}（跳过 ${skipped.length} 个）`, 'ok')
}

function confirmDuplicateReport() {
  const target = duplicateReportTarget.value
  const newIds = new Set(duplicateReportNewIds.value)

  duplicateReportNumbers.value.forEach((dupNo) => {
    const allDups = dbRows.value.filter((f) => f.department === target && f.functionNo === dupNo)
    const existing = allDups.find((f) => !newIds.has(f.id))
    const newOnes = allDups.filter((f) => newIds.has(f.id))

    newOnes.forEach((fn, idx) => {
      let n = idx + 1
      let candidate = `${dupNo}-CP${n}`
      while (dbRows.value.find((f) => f.functionNo === candidate && f.department === target)) {
        n++
        candidate = `${dupNo}-CP${n}`
      }
      fn.functionNo = candidate
    })

    // 同步 parentFunctionNo：如果父编号也被重命名，则保持关系
    if (existing && newOnes.length) {
      newOnes.forEach((fn) => {
        if (fn.parentFunctionNo === dupNo && existing.functionNo !== dupNo) {
          fn.parentFunctionNo = existing.functionNo
        }
      })
    }
  })

  duplicateReportDialog.value = false
  duplicateReportNumbers.value = []
  duplicateReportTarget.value = ''
  duplicateReportNewIds.value = []
  applyFilter({})
  showToast('已按手册要求修正重复的功能位置编号', 'ok')
}

// 手册 2 / P37：Options > View Job 打开 Component Type Jobs 并预过滤到当前选中类型
function viewTypeJobs() {
  const t = selected.value
  if (!t) { showToast('请先在列表中选择一个部件类型', 'warn'); return }
  setPresetFilter({ targetType: 'ComponentType', targetId: t.typeNumber })
  openWindow('component-type-jobs')
}

// 手册 2 / P38：Options > Add Part 快速添加备件行到当前类型的 Parts 子表
function addPart() {
  const t = selected.value
  if (!t) { showToast('请先在列表中选择一个部件类型', 'warn'); return }
  if (!t.parts) t.parts = []
  t.parts.push({ stockTypeNo: '', alternativeNo: '' })
  showToast('Part row added. Please select a Stock Type.', 'ok')
}

// 手册 2 / P37：复制组件类型
async function copyComponentType() {
  const t = selected.value
  if (!t) { showToast('请先在列表中选择要复制的部件类型', 'warn'); return }
  const base = { ...t }
  delete base.id
  delete base.regComponents
  // 深拷贝可编辑子表，避免复制后修改污染原类型
  base.counters = (t.counters || []).map((x) => ({ ...x }))
  base.parts = (t.parts || []).map((x) => ({ ...x }))
  base.relatedTypes = (t.relatedTypes || []).map((x) => ({ ...x }))
  // 手册要求输入新的 Component Type 编号；此处自动递增末位数字作为建议值
  const m = /^(.*?)(\d+)(\D*)$/.exec(base.typeNumber || '')
  base.typeNumber = m ? `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, '0')}${m[3]}` : `${base.typeNumber || 'CT'}_COPY`
  base.name = `${base.name || ''} (Copy)`
  base.status = 'Active'
  base.id = 'new_' + Date.now()
  await componentService.addComponentType(base)
  viewRows.value = [...viewRows.value, base]
  selected.value = base
  showToast('已复制部件类型：请修改编号 / 名称后 Save（手册 P37：Options > Copy）', 'ok')
}

// ===== Register as Component（手册 2 / P30）=====
const regDialog = ref(false)
const regSelected = ref([])
const regAutoStock = ref(false)
const detailPresetTab = ref('') // 指令性切换 RecordDetail 的 tab（如注册组件后自动跳转 Components）
const highlightCompId = ref(new Set()) // 高亮 Components 列表中的目标组件行（Set 支持多选）
const listPreselectId = ref('')  // 回跳时预选中左侧列表的某行（同步到 RecordList 内部 selectedId）
const deptGroups = computed(() => {
  const map = {}
  departments.forEach((d) => { (map[d.installation] = map[d.installation] || []).push(d) })
  return Object.entries(map).map(([installation, items]) => ({ installation, items }))
})
// 当前选中类型下已注册的组件实例（用于类型窗口 Components 标签）
const regComponentsList = computed(() => {
  const t = selected.value
  if (!t || !t.regComponents) return []
  return componentService.getByIds(t.regComponents)
})
function openRegister() {
  if (!selected.value) { showToast('请先在列表中选择一个部件类型', 'warn'); return }
  regSelected.value = [store.department]
  regAutoStock.value = false
  regDialog.value = true
}
async function confirmRegister() {
  const t = selected.value
  if (!t) return
  if (!regSelected.value.length) { showToast('请至少选择一个安装地点', 'warn'); return }
  const today = new Date().toISOString().slice(0, 10)
  // 手册 P30：使用 baseNo + 序号后缀，避免同一毫秒批量注册时编号全部重复
  const baseNo = String(Date.now() % 1000000)
  let count = 0
  const newIds = []
  for (let idx = 0; idx < regSelected.value.length; idx++) {
    const dept = regSelected.value[idx]
    // 注册逻辑统一交由 componentService：状态按手册自动推导（未安装 → Available）
    const comp = await componentService.register({
      typeNumber: t.typeNumber,
      name: t.name,
      maker: t.maker,
      model: t.model,
      location: dept,
      department: store.department,
      installDate: today,
    })
    // 注册到同一类型下的编号后缀，便于类型窗口 Components 标签区分
    comp.number = 'C-' + baseNo + '-' + String(idx + 1).padStart(2, '0')
    // 关联到类型，便于类型窗口 Components 标签展示（P30 第 5 步）
    ;(t.regComponents = t.regComponents || []).push(comp.id)
    newIds.push(comp.id)
    count++
    // 手册 P59：组件编号最终确定后，再继承所选类型的 TypeJobs（生成 Component 级继承副本，targetId 指向正确编号）
    jobService.inheritTypeJobs(t.typeNumber, comp.number)
    // Auto-Register Stock Items：把该类型关联的备件一并登记到所选安装地点
    if (regAutoStock.value && Array.isArray(t.parts)) {
      for (const p of t.parts) {
        const stNo = p.stockTypeNo
        const st = stockTypeService.get(stNo)
        if (!st) continue
        if (stockItemService.existsAt(stNo, dept)) continue
        await stockItemService.create({
          stockItemNo: 'SI-' + (Date.now() % 1000000), stockTypeNo: stNo,
          description: st.description, makerRef: '', drawingNo: '', stockClass: '',
          functionNo: '', quantity: 0, location: dept, expiryDate: '', perishable: false,
          status: 'Active', unitCost: st.bestPrice,
        })
      }
    }
  }
  regDialog.value = false
  // 注册成功后自动切换到 Components tab，并高亮所有新注册的组件实例
  highlightCompId.value = new Set(newIds)
  detailPresetTab.value = ''
  nextTick(() => { detailPresetTab.value = 'components' })
  showToast(`已注册 ${count} 个组件（来自类型 ${t.typeNumber}）`, 'ok')
}
function viewComponent(c) {
  // 手册 P30 第 5 步：编号 + location 双重定位，确保精确命中目标组件
  setPresetFilter({ number: c.number, location: c.location })
  // 保存回跳上下文：切回 Component Types 时恢复选中类型 + Components tab + 高亮目标行
  const t = selected.value
  store.returnContext = { sourceWindow: config.value?.windowKey, typeNumber: t?.typeNumber, targetId: c.id }
  openWindow('components')
}

// ===== 顶部工具栏事件（CustomEvent 解耦） =====
function onAction(e) {
  const a = e.detail?.action
  if (a === 'new') doNew()
  else if (a === 'save') doSave()
  else if (a === 'delete') doDelete()
  else if (a === 'view') selected.value = selected.value || viewRows.value[0] || null
  else if (a === 'refresh') doRefresh()
  else if (a === 'print') window.print()
  else if (a === 'options') optionsOpen.value = !optionsOpen.value
  else if (a === 'filter') reopenFilter()
  else if (a === 'open') doOpen()
}

// 双击 Dashboard 告警带入的预过滤
function applyPreset() {
  if (store.presetFilter) {
    const pf = store.presetFilter
    // 手册 P58/P60/P62：从 Components 窗口 Jobs 标签 View / New 跳入时，打开 Component Jobs 窗口并定位该作业完整详情
    if (pf._focusJobNo) {
      let target = dbRows.value.find((r) => r.jobNo === pf._focusJobNo)
      store.presetFilter = null
      // 手册 P60：保留全部作业列表，仅高亮并选中目标作业
      viewRows.value = dbRows.value.slice()
      if (!target) {
        // New 创建的作业可能因 computed 时序尚未出现在已过滤 dbRows 中，
        // 回退到全量集合搜索（与 confirmOpen 容错逻辑一致），找到后注入视图列表。
        const raw = collectionService.collection(config.value?.dataKey)
        target = raw.find((r) => r.jobNo === pf._focusJobNo)
        if (target && !viewRows.value.includes(target)) viewRows.value.push(target)
      }
      if (target) {
        selected.value = target
        listPreselectId.value = pf._focusJobNo  // 同步到 RecordList 使左侧列表行高亮
        // 手册 P60：New 作业后直接定位到 Job Description 标签（查找 JD 的入口）
        if (pf._focusTab) detailPresetTab.value = pf._focusTab
        // 强制同步左侧高亮：keep-alive 复用实例时 listPreselectId 可能与上次相同，
        // RecordList 的 watch 不会因值不变而触发，故显式调用 preselect 确保目标行高亮。
        nextTick(() => listRef.value?.preselect(pf._focusJobNo))
      } else showToast('未找到作业：' + pf._focusJobNo, 'warn')
      return
    }
    // 手册 P38：从 Component Types > Parts tab View 跳入 Stock Types 窗口时，定位到对应 stock type
    if (pf._focusStockTypeNo) {
      let target = dbRows.value.find((r) => r.stockTypeNo === pf._focusStockTypeNo)
      store.presetFilter = null
      viewRows.value = dbRows.value.slice()
      if (!target) {
        const raw = collectionService.collection(config.value?.dataKey)
        target = raw.find((r) => r.stockTypeNo === pf._focusStockTypeNo)
        if (target && !viewRows.value.includes(target)) viewRows.value.push(target)
      }
      if (target) {
        selected.value = target
        listPreselectId.value = pf._focusStockTypeNo
        detailPresetTab.value = 'general'
        nextTick(() => listRef.value?.preselect(pf._focusStockTypeNo))
      } else showToast('未找到 Stock Type：' + pf._focusStockTypeNo, 'warn')
      return
    }
    applyFilter(pf)
    store.presetFilter = null
  } else {
    // 进入窗口默认显示全部记录（手册交互：先见列表，再用 Filter 收窄）
    viewRows.value = dbRows.value.slice()
  }
}
onMounted(() => {
  window.addEventListener('amos-action', onAction)
  applyPreset()
  // 手册 P44：Components 窗口 Counters 标签 Update 按钮 → 预填当前组件并定位到 General
  if (config.value?.dataKey === 'counterLogs' && store.presetCounterComponent) {
    const compNo = store.presetCounterComponent
    store.presetCounterComponent = ''
    const comp = componentService.listSync().find((c) => c.number === compNo)
    selected.value = {
      id: 'new_' + Date.now(),
      component: compNo,
      function: comp?.functionNo || '',
      counter: '',
      currentValue: 0,
      newValue: 0,
      unit: '',
      readingDate: new Date().toISOString().slice(0, 10),
    }
    detailPresetTab.value = 'general'
  }
})
// keep-alive 激活时：处理 presetFilter（Dashboard 告警带入）和 returnContext（从其他窗口 View 跳回的上下文恢复）
onActivated(() => {
  if (store.presetFilter) applyPreset()
  // 回跳上下文恢复：从 Component Types 的 Components tab View 跳出后，切回时还原选中类型 + 高亮目标组件行
  if (store.returnContext && store.returnContext.sourceWindow === config.value?.windowKey) {
    const ctx = store.returnContext
    store.returnContext = null // 一次性消费，避免重复触发
    if (ctx.typeNumber) {
      const row = dbRows.value.find((r) => r.typeNumber === ctx.typeNumber)
      if (row) {
        selected.value = row
        // 同步到 RecordList 内部 selectedId 使左侧列表高亮该行
        listPreselectId.value = row[rowKey.value] || ''
      }
    }
    // 切到 Components tab 并标记高亮目标行（淡黄色背景，持久保持直到用户切换记录）
    nextTick(() => {
      detailPresetTab.value = ''
      highlightCompId.value = ctx.targetId ? new Set([ctx.targetId]) : new Set()
      nextTick(() => { detailPresetTab.value = 'components' })
    })
  }
})
onBeforeUnmount(() => window.removeEventListener('amos-action', onAction))

watch(showOpenDialog, (v) => {
  if (v) nextTick(() => openInputRef.value?.focus())
})
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
/* 手册 P44-46：Functions 列表视图 Criticality 列的颜色编码指示器 */
.crit-indicator { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; box-shadow: 0 0 0 1px rgba(0,0,0,0.08) inset; }
.crit-text { color: #2c3e50; }
.bw-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.bw-body { flex: 1; display: grid; grid-template-columns: minmax(640px, 1.4fr) 1fr; min-height: 0; }
.bw-list { border-right: 1px solid var(--amos-border); padding: 8px; min-height: 0; min-width: 0; display: flex; }
.bw-list > * { flex: 1; }
.bw-detail { padding: 10px; overflow: auto; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.bw-detail.empty { display: flex; align-items: center; justify-content: center; }
.bd-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed var(--amos-border); }
.bw-options { position: relative; }
.bw-options-menu { position: absolute; right: 0; top: 30px; background: #fff; border: 1px solid var(--amos-border-strong); border-radius: 6px; box-shadow: var(--amos-shadow); z-index: 50; min-width: 200px; padding: 4px; }
.bw-options-menu button { display: block; width: 100%; text-align: left; border: none; background: transparent; padding: 7px 10px; border-radius: 4px; cursor: pointer; font-size: 12.5px; }
.bw-options-menu button:hover { background: var(--amos-blue-soft); }
.bw-options-menu button.checked { font-weight: 700; color: var(--amos-blue); }
/* 右键菜单：相对视口绝对定位到鼠标坐标 */
.bw-options-menu.ctx-menu { position: fixed; top: auto; right: auto; z-index: 200; }
.bw-empty { padding: 30px; text-align: center; }
/* 回跳高亮：从 Components View 跳出后切回时，目标组件行短暂高亮 */
.highlight-row { background: #fff3cd !important; animation: hl-pulse 2s ease-out; }
@keyframes hl-pulse { 0% { background: #ffe066; } 100% { background: #fff3cd; } }

/* Copy Functions 对话框 */
.copy-functions-overlay { position: fixed; align-items: flex-start; padding: 20px 0; }
.copy-functions { width: 520px; max-height: calc(100vh - 40px); overflow-y: auto; display: flex; flex-direction: column; }
.copy-functions .od-actions { position: sticky; bottom: 0; background: #fff; padding: 12px 0; margin-top: auto; border-top: 1px solid var(--amos-border); }
.copy-sections-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
.copy-section { margin-top: 10px; padding: 8px; border: 1px solid var(--amos-border); border-radius: 6px; }
.copy-sections-row .copy-section { margin-top: 0; }
.copy-section-title { font-size: 12px; font-weight: 700; color: var(--amos-text-soft); margin-bottom: 6px; }
.copy-row { display: flex; gap: 16px; }
.copy-col { display: flex; flex-direction: column; gap: 4px; }
.copy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.copy-section label { display: flex; align-items: center; gap: 4px; font-size: 12.5px; cursor: pointer; }
.copy-section label.disabled { opacity: 0.5; cursor: not-allowed; }
.copy-section label.disabled input { cursor: not-allowed; }
.copy-section input[type="checkbox"], .copy-section input[type="radio"] { cursor: pointer; }
.duplicate-report { width: 420px; }
.duplicate-report-body { display: flex; gap: 16px; align-items: flex-start; margin-top: 12px; padding: 12px; background: #f4f8fb; border: 1px solid var(--amos-border); border-radius: 6px; }
.duplicate-info-icon { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #4a90d9, #1e5aa8); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; flex-shrink: 0; }
.duplicate-report-text p { margin: 0 0 6px; font-size: 13px; }
.duplicate-list { margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: #2c486a; }
.duplicate-list li { margin-bottom: 2px; }
.open-dialog { background: #fff; border-radius: 10px; box-shadow: var(--amos-shadow); width: 420px; padding: 20px 24px; }
.open-dialog h3 { margin: 0 0 8px; font-size: 15px; color: #2c486a; }
.open-dialog .amos-field { margin-top: 12px; }
.open-dialog.reg { width: 460px; }
.reg-depts { max-height: 220px; overflow: auto; border: 1px solid var(--amos-border); border-radius: 6px; padding: 8px; margin-top: 8px; }
.reg-grp { margin-bottom: 6px; }
.reg-grp-h { font-size: 12px; font-weight: 700; color: var(--amos-text-soft); margin-bottom: 2px; }
.reg .amos-grid.sub { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 8px; }
.reg .amos-grid.sub th, .reg .amos-grid.sub td { border: 1px solid var(--amos-border); padding: 4px 6px; text-align: left; }
.od-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
@media (max-width: 980px) {
  .bw-body { grid-template-columns: 1fr; }
  .bw-list { border-right: none; border-bottom: 1px solid var(--amos-border); }
}
</style>
