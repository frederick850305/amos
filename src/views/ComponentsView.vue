<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Components</h2>
      <span v-if="globalMode" class="scope-badge global-badge" title="手册 P21-23：Global 模式 — 跨 Department 搜索">🌐 Global：{{ globalDepts.length }} Dept</span>
      <span v-else class="scope-badge" title="按当前 Installation（船）和 Department 过滤，结果按船分组显示">范围：{{ store.department }} / {{ store.installation }}（按船分组）</span>
      <div class="row" style="gap:6px">
        <button class="amos-btn sm" @click="reopenFilter">查找 / Find</button>
        <button class="amos-btn sm primary" @click="doNew">New</button>
        <button class="amos-btn sm" @click="doSave" :disabled="!selected">Save</button>
        <button class="amos-btn sm danger" @click="doDelete" :disabled="!selected">Delete</button>
        <div class="bw-options" ref="optionsRef">
          <button class="amos-btn sm" @click="toggleOptions">Options ▾</button>
          <Teleport to="body">
            <div v-if="optionsOpen && optionsRect" class="bw-options-popup" :style="optionsPopupStyle" @mouseleave="optionsOpen = false">
              <button @click="copyComponent">Copy</button>
              <button @click="openChangeStatus">Change Status</button>
              <button @click="openStatusLog">Component Status Log</button>
              <button @click="archiveSubOpen = !archiveSubOpen">Archive ▸</button>
              <template v-if="archiveSubOpen">
                <button @click="openArchive('component')">Component Archive</button>
                <button @click="openArchive('transfer')">Component Transfer Archive</button>
                <button @click="openArchive('status')">Component Status Archive</button>
              </template>
            </div>
          </Teleport>
        </div>
      </div>
    </div>

    <FilterDialog :basic="filterBasic" :advanced="filterAdvanced" @ok="applyFilter" @cancel="applyFilter" v-if="showFilter" />

    <!-- Open Record 对话框 -->
    <div v-if="showOpenDialog" class="open-dialog-overlay">
      <div class="open-dialog">
        <h3>Open Record — Components</h3>
        <p class="muted">输入 Number（编码）以定位并打开该组件。</p>
        <div class="amos-field"><label>Number</label><div class="ctrl"><input ref="openInputRef" class="amos-input" v-model="openKeyValue" @keydown.enter="confirmOpen" placeholder="如 C-10001" /></div></div>
        <div class="od-actions"><button class="amos-btn" @click="showOpenDialog = false">Cancel</button><button class="amos-btn primary" @click="confirmOpen">OK</button></div>
      </div>
    </div>

    <!-- Change Status 对话框（手册 Component Status：Options > Change Status） -->
    <div v-if="statusDialog" class="open-dialog-overlay">
      <div class="open-dialog reg">
        <h3>Change Status — {{ selected?.number }}</h3>
        <p class="muted">当前状态：<b>{{ selected?.status }}</b></p>
        <div class="amos-field">
          <label>New Status</label>
          <div class="ctrl">
            <select class="amos-select" v-model="statusTarget">
              <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
        <label class="row" style="gap:6px;margin-top:8px">
          <input type="checkbox" v-model="statusCascade" />
          Change status of sub-components also（级联修改 parentComponent = 本组件的子组件）
        </label>
        <div class="od-actions">
          <button class="amos-btn" @click="statusDialog = false">Cancel</button>
          <button class="amos-btn primary" @click="confirmChangeStatus">OK</button>
        </div>
      </div>
    </div>

    <!-- Transferred → Stock Wanted 交互对话框（手册：改为 Transferred 且 Stock Wanted 存在引用时） -->
    <div v-if="transferredDialog" class="open-dialog-overlay">
      <div class="open-dialog reg">
        <h3>Component Transferred — Stock Wanted</h3>
        <p class="muted">该组件在 Stock Wanted 中仍被以下条目引用。请选择处理方式：</p>
        <table class="amos-grid sub" style="margin:8px 0">
          <thead><tr><th>Stock Type</th><th>Description</th><th class="num">Wanted Qty</th><th>Reference</th></tr></thead>
          <tbody>
            <tr v-for="w in transferredItems" :key="w.id">
              <td>{{ w.stockTypeNo }}</td><td>{{ w.description }}</td><td class="num">{{ w.wantedQty }}</td><td>{{ w.forComponent }}</td>
            </tr>
          </tbody>
        </table>
        <label class="row" style="gap:6px;margin-top:4px">
          <input type="checkbox" v-model="transferredClear" />
          Clear required quantity（清空需求数量；不勾选则保留数量，仅移除引用）
        </label>
        <div class="od-actions">
          <button class="amos-btn primary" @click="confirmTransferred">OK</button>
        </div>
      </div>
    </div>

    <!-- Component Status Log 对话框（手册：Options > Component Status Log） -->
    <div v-if="statusLogDialog" class="open-dialog-overlay">
      <div class="open-dialog reg">
        <h3>Component Status Log — {{ selected?.number }}</h3>
        <div class="table-wrap" style="max-height:240px;overflow:auto">
          <table class="amos-grid sub">
            <thead><tr><th>Date</th><th>Old</th><th>New</th><th>By</th><th>Reason</th></tr></thead>
            <tbody>
              <tr v-for="l in statusLogRows" :key="l.id">
                <td>{{ l.changedAt }}</td><td>{{ l.oldStatus }}</td><td>{{ l.newStatus }}</td><td>{{ l.changedBy }}</td><td>{{ l.reason }}</td>
              </tr>
              <tr v-if="!statusLogRows.length"><td colspan="5" class="muted">暂无状态变更记录。</td></tr>
            </tbody>
          </table>
        </div>
        <div class="od-actions">
          <button class="amos-btn" @click="statusLogDialog = false">Close</button>
        </div>
      </div>
    </div>

    <div v-else class="bw-body">
      <section class="bw-list">
        <RecordList ref="listRef" :columns="columns" :rows="viewRows" row-key="id" group-by="installation" @select="onSelect" @open="onOpen">
          <!-- 手册 P23：Global 模式下 Co 列显示组件原属部门（_instDept） -->
          <template #cell-department="{ row }">
            {{ globalMode ? (row._instDept || row.department) : row.department }}
          </template>
        </RecordList>
      </section>
      <section class="bw-detail" v-if="selected">
        <div class="bd-head">
          <strong>{{ selected.number }} — {{ selected.name }}</strong>
          <span class="tag" :class="statusClass(selected.status)">{{ selected.status }}</span>
        </div>
        <RecordDetail :tabs="tabs" :model="selected" @change="onDetailChange" @subaction="onSubAction">
          <!-- 手册 2.2：Type Details 继承只读信息（来自 Component Type） -->
          <template #extra-type>
            <div class="inherited-box" v-if="inheritedType">
              <p class="muted">以下信息继承自 Component Type（只读参考）：</p>
              <div class="amos-field"><label>Type Name</label><div class="ctrl"><input class="amos-input" :value="inheritedType.name" readonly /></div></div>
              <div class="amos-field"><label>Class Code</label><div class="ctrl"><input class="amos-input" :value="inheritedType.classCode || '—'" readonly /></div></div>
              <div class="amos-field"><label>Preferred Vendor</label><div class="ctrl"><input class="amos-input" :value="inheritedType.preferredVendor || '—'" readonly /></div></div>
            </div>
          </template>
          <!-- 手册 Component Locations：Functions Performed 标签页 -->
          <template #extra-functions-performed>
            <p class="muted">组件安装 / 拆卸历史（手册 Component Locations）。</p>
            <div class="table-wrap"><table class="amos-grid sub">
              <thead><tr><th>Function</th><th>Description</th><th>Location</th><th>Action</th><th>Date</th><th>By</th></tr></thead>
              <tbody>
                <tr v-for="h in relFunctionHistory" :key="h.id">
                  <td>{{ h.functionNo }}</td><td>{{ h.functionDescription }}</td><td>{{ h.location }}</td><td>{{ h.action }}</td><td>{{ h.performedAt }}</td><td>{{ h.performedBy }}</td>
                </tr>
                <tr v-if="!relFunctionHistory.length"><td colspan="6" class="muted">暂无安装 / 拆卸记录。</td></tr>
              </tbody>
            </table></div>
          </template>
          <!-- 手册 Component Locations：Function Performing 标签页（只读） -->
          <template #extra-function-performing>
            <p class="muted" v-if="!currentFunction">该组件当前未安装到任何功能位置。</p>
            <div v-else class="inherited-box">
              <p class="muted">当前安装功能位置字段（只读，手册 Component Locations）：</p>
              <div class="amos-field"><label>Function No.</label><div class="ctrl"><input class="amos-input" :value="currentFunction.functionNo" readonly /></div></div>
              <div class="amos-field"><label>Description</label><div class="ctrl"><input class="amos-input" :value="currentFunction.description" readonly /></div></div>
              <div class="amos-field"><label>Location</label><div class="ctrl"><input class="amos-input" :value="currentFunction.location" readonly /></div></div>
              <div class="amos-field"><label>Department</label><div class="ctrl"><input class="amos-input" :value="currentFunction.department" readonly /></div></div>
              <div class="amos-field"><label>Criticality</label><div class="ctrl"><input class="amos-input" :value="currentFunction.criticality" readonly /></div></div>
              <div class="amos-field"><label>Status</label><div class="ctrl"><input class="amos-input" :value="currentFunction.status" readonly /></div></div>
            </div>
          </template>
          <!-- 手册 P60：Jobs 标签页 —— 展示该组件已关联的作业（以 JD 视角：Code / Revision / Title / Frequency） -->
          <!-- 顶部 New / Delete / View / Details 全局按钮作用于「选中的作业」（先点选一行） -->
          <!-- View → 跳转 Component Jobs 完整编辑窗口；Details → 本窗口内只读展示该作业的 Job Description（JD）内容 -->
          <template #extra-jobs>
            <div class="subgrid-bar" style="margin-bottom:8px">
              <button class="amos-btn xs primary" @click="newJob">New</button>
              <button class="amos-btn xs" :disabled="!selectedJob" @click="deleteJob(selectedJob)">Delete</button>
              <button class="amos-btn xs" :disabled="!selectedJob" @click="viewJob(selectedJob)">View</button>
              <button class="amos-btn xs" :disabled="!selectedJob" @click="detailsJob(selectedJob)">Details</button>
              <span class="muted">{{ relJobs.length }} 条作业</span>
            </div>
            <div class="table-wrap"><table class="amos-grid sub">
              <thead><tr><th>Code</th><th>Revision</th><th>Title</th><th>Frequency</th></tr></thead>
              <tbody>
                <tr v-for="j in relJobs" :key="j.id" @click="selectedJob = j"
                    :class="{ selected: selectedJob && selectedJob.id === j.id }" style="cursor:pointer">
                  <td>{{ j.jdCode || j.jobNo || '—' }}</td>
                  <td>{{ (j.jdRevision !== '' && j.jdRevision != null) ? j.jdRevision : '—' }}</td>
                  <td>{{ j.jdTitle || j.description || '—' }}</td>
                  <td>{{ j.frequency || '—' }}</td>
                </tr>
                <tr v-if="!relJobs.length"><td colspan="4" class="muted">该部件无关联作业。点击 New 创建组件级作业（先在 Job Description 标签查找 JD）。</td></tr>
              </tbody>
            </table></div>
            <!-- 手册 P60：Details → see the job description for the selected job（只读展示 JD 主数据，不进入编辑窗口） -->
            <Teleport to="body">
              <div v-if="jobDetailsOpen" class="jd-mask" @click.self="jobDetailsOpen = false">
                <div class="jd-modal">
                  <div class="jd-head">
                    <strong>Job Description — {{ jobDetailsJD?.code }}</strong>
                    <button class="amos-btn xs" @click="jobDetailsOpen = false">✕</button>
                  </div>
                  <div class="jd-body" v-if="jobDetailsJD">
                    <p class="muted">该作业（{{ jobDetailsJobNo }}）关联的 Job Description 主数据（只读参考）：</p>
                    <div class="amos-field"><label>Job Description Code</label><div class="ctrl"><input class="amos-input" :value="jobDetailsJD.code" readonly /></div></div>
                    <div class="amos-field"><label>Revision</label><div class="ctrl"><input class="amos-input" :value="jobDetailsJD.revision" readonly /></div></div>
                    <div class="amos-field"><label>Title</label><div class="ctrl"><input class="amos-input" :value="jobDetailsJD.title" readonly /></div></div>
                    <div class="amos-field"><label>Frequency</label><div class="ctrl"><input class="amos-input" :value="jobDetailsJD.frequency || '—'" readonly /></div></div>
                    <div class="amos-field"><label>Window</label><div class="ctrl"><input class="amos-input" :value="jobDetailsJD.window != null ? jobDetailsJD.window : '—'" readonly /></div></div>
                  </div>
                  <div class="jd-foot">
                    <button class="amos-btn sm primary" @click="jobDetailsOpen = false">关闭</button>
                  </div>
                </div>
              </div>
            </Teleport>
          </template>
          <!-- 手册 2.2(15)：Parts 标签页（View 打开 Stock Items）-->
          <template #extra-parts>
            <p class="muted">关联备件（按所属功能位置匹配）。点击 View 打开 Stock Items 窗口。</p>
            <div class="table-wrap"><table class="amos-grid sub">
              <thead><tr><th>Item No.</th><th>Description</th><th>Stock Class</th><th>Qty</th><th>Location</th><th>Alt. No.</th><th></th></tr></thead>
              <tbody>
                <tr v-for="s in relParts" :key="s.id">
                  <td>{{ s.stockItemNo }}</td><td>{{ s.description }}</td><td>{{ s.stockClass }}</td><td class="num">{{ s.quantity }}</td><td>{{ s.location }}</td><td>{{ s.alternativeNo || '—' }}</td>
                  <td><button class="amos-btn xs" @click="viewStock(s)">View</button></td>
                </tr>
                <tr v-if="!relParts.length"><td colspan="7" class="muted">无关联备件。</td></tr>
              </tbody>
            </table></div>
          </template>
          <!-- 手册 2.2(17)：Counters 标签页（已改为 subgrid 可编辑，见 tabs 配置） -->
          <!-- 手册 2.2(19)：Work Order 标签页 -->
          <template #extra-workorder>
            <div class="subgrid-bar" style="margin-bottom:8px">
              <button class="amos-btn xs" @click="newWO">Requisition Work</button>
              <span class="muted">{{ relWO.length }} 条工单</span>
            </div>
            <div class="table-wrap"><table class="amos-grid sub">
              <thead><tr><th>WO No.</th><th>Title</th><th>Resp. Discipline</th><th>Due</th><th>Status</th><th></th></tr></thead>
              <tbody>
                <tr v-for="w in relWO" :key="w.id">
                  <td>{{ w.workOrderNo }}</td><td>{{ w.description }}</td><td>{{ w.functionNo || '—' }}</td><td>{{ w.dueDate }}</td><td>{{ w.status }}</td>
                  <td><button class="amos-btn xs" @click="viewWO(w)">View</button></td>
                </tr>
                <tr v-if="!relWO.length"><td colspan="6" class="muted">该部件无关联工单。点击 Requisition Work 创建工单。</td></tr>
              </tbody>
            </table></div>
          </template>
          <!-- 手册 2.2(18)：Attachments -->
          <template #extra-attachments>
            <div class="subgrid-bar" style="margin-bottom:8px">
              <button class="amos-btn xs" @click="addAttachment">New</button>
              <span class="muted">{{ relAttachments.length }} 个附件</span>
            </div>
            <div class="table-wrap"><table class="amos-grid sub">
              <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(a, i) in relAttachments" :key="i">
                  <td>{{ a.name }}</td><td>{{ a.type }}</td><td>{{ a.size }}</td><td>{{ a.date }}</td>
                  <td>
                    <button class="amos-btn xs" @click="viewAttachment(a)">View</button>
                    <button class="amos-btn xs danger" @click="delAttachment(i)">Del</button>
                  </td>
                </tr>
                <tr v-if="!relAttachments.length"><td colspan="5" class="muted">暂无附件。图纸、Word 或 PDF 等文件可点击 New 添加。</td></tr>
              </tbody>
            </table></div>
          </template>
          <!-- 手册 2.2(20)：History -->
          <template #extra-history>
            <div class="table-wrap"><table class="amos-grid sub">
              <thead><tr><th>WO No.</th><th>Description</th><th>Completed Due</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="w in relHistory" :key="w.id"><td>{{ w.workOrderNo }}</td><td>{{ w.description }}</td><td>{{ w.dueDate }}</td><td>{{ w.status }}</td></tr>
                <tr v-if="!relHistory.length"><td colspan="4" class="muted">暂无历史记录。</td></tr>
              </tbody>
            </table></div>
          </template>
          <!-- 手册 2.2(21)：Maintenance Log（独立日志条目，非复用 WO） -->
          <template #extra-maintlog>
            <div class="subgrid-bar" style="margin-bottom:8px">
              <button class="amos-btn xs" @click="addLog">New</button>
              <span class="muted">{{ relLog.length }} 条日志</span>
            </div>
            <div class="table-wrap"><table class="amos-grid sub">
              <thead><tr><th>Date</th><th>WO No.</th><th>Log Text</th><th>Status</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(l, i) in relLog" :key="i">
                  <td>{{ l.date }}</td><td>{{ l.wo }}</td><td>{{ l.desc }}</td><td>{{ l.status }}</td>
                  <td><button class="amos-btn xs danger" @click="delLog(i)">Del</button></td>
                </tr>
                <tr v-if="!relLog.length"><td colspan="5" class="muted">暂无维护日志。点击 New 添加维护记录。</td></tr>
              </tbody>
            </table></div>
          </template>
          <!-- 手册 P44-45 截图右下角齿轮按钮：Counter Setup —— 为组件实例从组件类型计数器定义中增删计数器 -->
          <template #extra-counters>
            <div class="counter-setup-bar">
              <button class="amos-btn xs" @click="openCounterSetup" title="手册 P44：Counter Setup — 为组件配置计数器">
                <span class="gear">⚙</span> Counter Setup
              </button>
            </div>
            <Teleport to="body">
              <div v-if="showCounterSetup" class="cs-mask" @click.self="showCounterSetup = false">
                <div class="cs-modal">
                  <div class="cs-head">
                    <strong>Counter Setup — {{ selected.number }}（{{ selected.name }}）</strong>
                    <button class="amos-btn xs" @click="showCounterSetup = false">✕</button>
                  </div>
                  <div class="cs-body">
                    <p class="muted">从组件类型 <b>{{ selected.typeNumber }}</b> 的计数器定义中选择，添加到本组件实例。已添加的计数器在 Counters 标签中可见并可编辑。</p>
                    <div class="table-wrap"><table class="amos-grid sub">
                      <thead><tr><th>Counter Code</th><th>Description</th><th>Unit</th><th>Depends On</th><th></th></tr></thead>
                      <tbody>
                        <tr v-for="d in counterDefs" :key="d.code">
                          <td>{{ d.code }}</td>
                          <td>{{ d.description }}</td>
                          <td>{{ d.unit || '—' }}</td>
                          <td>{{ d.dependsOn || '—' }}</td>
                          <td class="cs-action">
                            <button v-if="!isCounterAdded(d.code)" class="amos-btn xs primary" @click="addCounter(d)">Add</button>
                            <span v-else class="added-tag">已添加 <button class="amos-btn xs danger" @click="removeCounter(d.code)">移除</button></span>
                          </td>
                        </tr>
                        <tr v-if="!counterDefs.length"><td colspan="5" class="muted">该组件类型未定义计数器模板（可在 Component Types 中维护）。</td></tr>
                      </tbody>
                    </table></div>
                  </div>
                  <div class="cs-foot">
                    <button class="amos-btn sm" @click="showCounterSetup = false">关闭</button>
                  </div>
                </div>
              </div>
            </Teleport>
          </template>
        </RecordDetail>
      </section>
      <section v-else class="bw-detail empty"><p class="muted">双击列表行查看明细，或点击 New 创建组件。</p></section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated, onBeforeUnmount, nextTick } from 'vue'
import FilterDialog from '../components/FilterDialog.vue'
import RecordList from '../components/RecordList.vue'
import RecordDetail from '../components/RecordDetail.vue'
import { componentService, COMPONENT_STATUSES } from '../services/componentService.js'
import { jobService } from '../services/jobService.js'
import { useJobTab } from '../composables/useJobTab.js'
import { stockItemService } from '../services/stockItemService.js'
import { counterService } from '../services/counterService.js'
import { workOrderService } from '../services/workOrderService.js'
import { functionService } from '../services/functionService.js'
import { store, openWindow, showToast, setPresetFilter, scopeByDepartment } from '../store.js'
import { matchRow } from '../utils/filter.js'

// 手册 2.2(2-9)：查找窗口——Name / 编码 + Advanced（部件状态、位置、部件类型、Function Performing）
const filterBasic = [
  { key: 'number', label: 'Number（编码）', type: 'text', placeholder: '如 C-100%' },
  { key: 'name', label: 'Name', type: 'text', placeholder: '如 %Boiler' },
]
const filterAdvanced = [
  { key: 'status', label: 'Component Status', type: 'select', options: ['In Use', 'Available', 'Transferred', 'Scrapped'] },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'typeNumber', label: 'Component Type', type: 'text' },
  { key: 'functionNo', label: 'Function Performing', type: 'text' },
]
// 手册 P44-45 截图：Components 列表列对齐为 Number / Name / Type / Serial No. / Co
const columnsBase = [
  { key: 'number', label: 'Number', width: '120px' },
  { key: 'name', label: 'Name', width: '200px' },
  { key: 'type', label: 'Type', width: '100px' },
  { key: 'serialNo', label: 'Serial No.', width: '110px' },
  { key: 'department', label: 'Co', width: '110px' },
]
// 手册 P23：Global 模式下，Co 列改显示组件原属部门（_instDept），标识记录来源
const columns = computed(() => [...columnsBase])
const statusOptions = COMPONENT_STATUSES
const tabs = [
  { id: 'general', label: 'General', fields: [
    { key: 'number', label: 'Number' },
    { key: 'typeNumber', label: 'Type Number', type: 'lookup', lookupKey: 'componentTypes' },
    { key: 'name', label: 'Name' },
    { key: 'serialNo', label: 'Serial No.' },
    { key: 'maker', label: 'Maker' },
    { key: 'type', label: 'Type' },
    { key: 'functionNo', label: 'Function', type: 'lookup', lookupKey: 'functions' },
    // 手册（Component Status）：状态在 General tab 仅作指示，修改统一走 Options > Change Status
    { key: 'status', label: 'Status', type: 'readonly' },
  ] },
  { id: 'type', label: 'Type Details', fields: [
    { key: 'vendor', label: 'Vendor' },
    { key: 'location', label: 'Location' },
    { key: 'parentComponent', label: 'Parent Component' },
    { key: 'installDate', label: 'Install Date', type: 'date' },
    { key: 'componentTypeModel', label: 'Component Type Model' },
  ] },
  // 手册 Component Locations：Functions Performed —— 组件安装 / 拆卸历史
  { id: 'functions-performed', label: 'Functions Performed', fields: [] },
  // 手册 Component Locations：Function Performing —— 当前安装 function 的只读字段详情
  { id: 'function-performing', label: 'Function Performing', fields: [] },
  { id: 'jobs', label: 'Jobs', fields: [] },
  { id: 'parts', label: 'Parts', fields: [] },
  // 手册 2 / P44：Counters 标签（New/Delete、继承自组件类型、含 Depends On）
  // 字段集对照手册截图：Counter Code / Latest Zeroed Date / Total at Zeroed / Total Running / Average / Calculate / Depends On
  // 底部按钮：New / Delete（每行 Del）/ Update / Set Start（tab.subActions）
  {
    id: 'counters', label: 'Counters', type: 'subgrid',
    subKey: 'componentCounters',
    subActions: [
      { id: 'update', label: 'Update' },
      { id: 'setStart', label: 'Set Start' },
    ],
    columns: [
      { key: 'code', label: 'Counter Code', width: '120px', default: '' },
      { key: 'latestZeroedDate', label: 'Latest Zeroed Date', type: 'date', width: '130px', default: '' },
      { key: 'startValue', label: 'Total at Zeroed', type: 'number', width: '110px', default: 0 },
      { key: 'currentValue', label: 'Total Running', type: 'number', width: '110px', default: 0 },
      { key: 'average', label: 'Average', type: 'number', width: '90px', default: 0, readonly: true },
      { key: 'calculate', label: 'Calculate', type: 'select', options: ['Yes', 'No'], width: '90px', default: 'No' },
      { key: 'dependsOn', label: 'Depends On', type: 'lookup', lookupKey: 'components', width: '140px', default: '', placeholder: '依赖组件' },
    ],
  },
  // 手册 2 / P45：Measure Points 独立标签（New/Delete、继承自组件类型）
  {
    id: 'measurePoints', label: 'Measure Points', type: 'subgrid',
    subKey: 'componentMeasurePoints',
    columns: [
      { key: 'code', label: 'Point Code', width: '120px', default: '' },
      { key: 'description', label: 'Description', default: '' },
      { key: 'unit', label: 'Unit', width: '70px', default: '' },
      { key: 'trend', label: 'Trend', type: 'select', width: '90px', options: ['Up', 'Down', 'Stable'], default: 'Stable' },
      { key: 'value', label: 'Value', width: '80px', default: '', type: 'number' },
      { key: 'lastReadDate', label: 'Last Read', type: 'date', width: '110px', default: '' },
    ],
  },
  { id: 'workorder', label: 'Work Order', fields: [] },
  { id: 'attachments', label: 'Attachments', fields: [] },
  { id: 'history', label: 'History', fields: [] },
  { id: 'maintlog', label: 'Maintenance Log', fields: [] },
]

const all = computed(() => componentService.listSync())
const viewRows = ref([])
const showFilter = ref(false)
const selected = ref(null)
// Options 菜单状态（手册 P42-43：Copy / ChangeStatus）
const optionsOpen = ref(false)
const optionsRef = ref(null)
const optionsRect = ref(null)

function toggleOptions() {
  if (!optionsOpen.value && optionsRef.value) {
    const rect = optionsRef.value.getBoundingClientRect()
    optionsRect.value = { top: rect.bottom, left: rect.right }
  }
  optionsOpen.value = !optionsOpen.value
}

const optionsPopupStyle = computed(() => {
  if (!optionsRect.value) return {}
  return { position: 'fixed', top: optionsRect.value.top + 'px', left: (optionsRect.value.left - 180) + 'px' }
})
// 手册 Component Archives：Options > Archive > 三种档案窗口
const archiveSubOpen = ref(false)
function openArchive(kind) {
  optionsOpen.value = false
  archiveSubOpen.value = false
  const s = selected.value
  if (!s) { showToast('请先选择组件', 'warn'); return }
  store.archiveComponentNo = s.number
  store.archiveKind = kind
  openWindow('component-archive')
}
// 手册 P21-23：Global Search 状态
const globalMode = ref(false)
const globalDepts = ref([])
// Open Record 对话框
const showOpenDialog = ref(false)
const openKeyValue = ref('')
const openInputRef = ref(null)

// ===== Jobs 标签：复用 useJobTab composable（targetType = Component）=====
const jobTab = useJobTab({
  targetType: 'Component',
  getTargetId: () => selected.value?.number,
  getWindowKey: () => 'component-jobs',
  getDescriptionHint: () => (selected.value?.name || selected.value?.number || '') + ' — 维护作业',
})
// 向后兼容：保持模板中 relJobs / selectedJob 等变量名可访问
const relJobs = jobTab.relJobs
const selectedJob = jobTab.selectedJob

const relParts = computed(() => !selected.value ? [] : stockItemService.byFunction(selected.value.functionNo))
const relCounters = computed(() => !selected.value ? [] : counterService.byComponent(selected.value.number))
const relWO = computed(() => !selected.value ? [] : workOrderService.byComponent(selected.value.number))
const relHistory = computed(() => relWO.value.filter((w) => w.status === 'Completed'))
const relLog = computed(() => selected.value?.maintenanceLog || [])
const relAttachments = computed(() => selected.value?.attachments || [])
// 手册 Component Locations：Functions Performed 历史（安装 / 拆卸记录）
const relFunctionHistory = computed(() => !selected.value ? [] : componentService.getFunctionHistory(selected.value.id))
// 手册 Component Locations：Function Performing —— 当前安装 function 的只读字段
const currentFunction = computed(() => selected.value?.functionNo ? functionService.get(selected.value.functionNo) : null)
// 手册 2.2：Type Details 继承自 Component Type 的只读参考信息
const inheritedType = computed(() => {
  if (!selected.value?.typeNumber) return null
  return componentService.getComponentType(selected.value.typeNumber)
})
// 手册 P44-45 截图右下角齿轮按钮：Counter Setup —— 为组件实例从组件类型计数器定义中增删计数器
const showCounterSetup = ref(false)
const counterDefs = computed(() => inheritedType.value?.counters || [])
function isCounterAdded(code) {
  return (selected.value?.componentCounters || []).some((c) => c.code === code)
}
function openCounterSetup() {
  if (!selected.value) { showToast('请先选择组件', 'warn'); return }
  showCounterSetup.value = true
}
function addCounter(d) {
  if (!selected.value) return
  if (!selected.value.componentCounters) selected.value.componentCounters = []
  selected.value.componentCounters.push({
    code: d.code,
    description: d.description,
    unit: d.unit || '',
    startValue: 0,
    currentValue: 0,
    latestZeroedDate: '',
    average: 0,
    calculate: 'No',
    dependsOn: d.dependsOn || '',
  })
  onDetailChange()
  showToast(`已添加计数器 ${d.code}`, 'ok')
}
function removeCounter(code) {
  const arr = selected.value?.componentCounters || []
  const i = arr.findIndex((c) => c.code === code)
  if (i >= 0) { arr.splice(i, 1); onDetailChange(); showToast(`已移除计数器 ${code}`, 'warn') }
}

// 不再于 activeKey 变化时硬重置；改用 onActivated：仅当存在 presetFilter（View 跳转 / Dashboard 告警带入）时才应用，否则保留窗口上下文
watch(() => store.department, () => { selected.value = null; applyPreset() })
watch(() => store.installation, () => { selected.value = null; applyPreset() })

function applyPreset() {
  if (store.presetFilter) { applyFilter(store.presetFilter); setPresetFilter(null) }
  else viewRows.value = scopeRows(all.value)
  // 手册 2 / P30：从 Component Types 的 Components 标签 View 跳入时，
  // 预设过滤命中单条组件则自动选中并加载继承的 Counters / Measure Points
  if (selected.value === null && viewRows.value.length === 1) {
    onSelect(viewRows.value[0])
  }
}

// 普通模式：同时按当前 Installation（船）和 Department 过滤，
// 列表仍按 installation 分组显示（单船时仅显示该船分组）；Global 模式仍按选中 Dept 跨船过滤。
function scopeRows(rows) {
  if (globalMode.value && globalDepts.value.length) {
    return rows.filter((r) => !r.department || globalDepts.value.includes(r.department))
  }
  return scopeByDepartment(rows)
}

function applyFilter(c) {
  showFilter.value = false
  const crit = c || {}
  // 提取 Global Search 状态
  globalMode.value = !!crit._globalSearch
  globalDepts.value = crit._globalDepts || []
  const filtered = all.value.filter((r) => matchRow(r, [...filterBasic, ...filterAdvanced], crit))
  viewRows.value = scopeRows(filtered).map((r) => ({
    ...r,
    _instDept: (r.department || store.department), // Global 模式下的 Inst/Dept 列值
  }))
}
function reopenFilter() { selected.value = null; showFilter.value = true }
function onSelect(r) {
  selected.value = r
  // 手册 2 / P44-45：Counters / Measure Points 继承自组件类型（首次选择时从类型拷贝）
  const ct = componentService.getComponentType(r.typeNumber)
  if (!r.componentCounters && ct?.counters?.length) {
    r.componentCounters = ct.counters.map((c) => ({ ...c, startValue: 0, currentValue: 0, latestZeroedDate: '', average: 0, calculate: 'No' }))
  }
  if (!r.componentMeasurePoints && ct?.measurePointDefs?.length) {
    // 从组件类型的 Measure Points 标签定义继承为组件级可编辑子表
    r.componentMeasurePoints = ct.measurePointDefs.map((m) => ({ ...m, value: '', lastReadDate: '' }))
  }
}
function onOpen(r) { selected.value = r }
// 手册 2 / P42-43：General 选择 Type Number 后，自动从 Component Type 带出
// Maker / Type / Name 等基础信息并填充到 General 单元格（继承类型默认值的级联）
// 选择 Function（安装/拆卸）时，经 componentService.setFunction 自动推导状态并记录日志
async function onDetailChange(e) {
  if (!e || !selected.value) return
  if (e.key === 'typeNumber') {
    const ct = componentService.getComponentType(e.value)
    if (!ct) return
    selected.value.maker = ct.maker || ''
    selected.value.type = ct.type || ''
    if (!selected.value.name) selected.value.name = ct.name || ''
    // 手册 P44：切换类型时，若组件尚无 Counters，则继承类型的计数器模板（仅作用于当前组件）
    if (!selected.value.componentCounters && ct.counters?.length) {
      selected.value.componentCounters = ct.counters.map((c) => ({ ...c, startValue: 0, currentValue: 0, latestZeroedDate: '', average: 0, calculate: 'No' }))
    }
    // 手册 P45：切换类型时，若组件尚无 Measure Points，则继承类型的测点模板（仅作用于当前组件）
    if (!selected.value.componentMeasurePoints && ct.measurePointDefs?.length) {
      selected.value.componentMeasurePoints = ct.measurePointDefs.map((m) => ({ ...m, value: '', lastReadDate: '' }))
    }
  } else if (e.key === 'functionNo') {
    await componentService.setFunction(selected.value.id, e.value)
    showToast(`功能位置变更：状态自动推导为 ${selected.value.status}`, 'info')
  }
}
// 手册 P44：Counters 标签 Update / Set Start 按钮（RecordDetail 子表 subActions 触发）
function onSubAction(e) {
  const { action, tabId, row } = e
  const comp = selected.value
  if (!comp) return showToast('请先选择组件', 'warn')
  if (tabId !== 'counters') return
  if (!row) return showToast('请先在 Counters 标签选中一行计数器', 'warn')
  if (action === 'setStart') {
    counterService.setStart(comp.number, row.code)
    showToast(`已设置起点（归零）：${row.code} 的 Total at Zeroed = ${row.currentValue}`, 'ok')
  } else if (action === 'update') {
    // 手册 P44：Update 按钮 → 打开 Update Counters 并预填当前组件
    store.presetCounterComponent = comp.number
    openWindow('update-counters')
  }
}
// ===== Jobs 操作：复用 useJobTab composable =====
const viewJob = jobTab.viewJob
const detailsJob = jobTab.detailsJob
const deleteJob = jobTab.deleteJob
const newJob = jobTab.newJob
// 向后兼容：模板中引用的 JD 弹窗状态变量
const jobDetailsOpen = jobTab.jobDetailsOpen
const jobDetailsJD = jobTab.jobDetailsJD
const jobDetailsJobNo = jobTab.jobDetailsJobNo

function viewStock(s) { setPresetFilter({ stockItemNo: s.stockItemNo }); openWindow('stock-items') }
function viewWO(w) { setPresetFilter({ workOrderNo: w.workOrderNo }); openWindow('work-orders') }
// 手册 2.2(18)：附件管理——模拟新增 / 查看 / 删除
function addAttachment() {
  const t = selected.value
  if (!t) return showToast('请先选择组件', 'warn')
  const f = ['Pump_Drawing.dwg', 'Manual_v2.pdf', 'Inspection.docx', 'Photo.jpg'][Math.floor(Math.random()*4)]
  if (!t.attachments) t.attachments = []
  t.attachments.push({ name: f, type: f.split('.').pop().toUpperCase(), size: (Math.random()*5+0.5).toFixed(1)+' MB', date: new Date().toISOString().slice(0,10) })
  showToast('已添加附件（原型模拟）：' + f, 'ok')
}
function viewAttachment(a) { showToast('查看附件：' + a.name + '（原型演示）', 'info') }
function delAttachment(i) { selected.value.attachments.splice(i, 1); showToast('已删除附件', 'warn') }
// 手册 2.2(21)：Maintenance Log 独立日志条目（非复用 WO）
function addLog() {
  const t = selected.value
  if (!t) return showToast('请先选择组件', 'warn')
  if (!t.maintenanceLog) t.maintenanceLog = []
  t.maintenanceLog.push({ date: new Date().toISOString().slice(0,10), wo: 'WO-' + Math.floor(Math.random()*90000+10000), desc: '维护记录：' + (t.name || t.number), status: 'Completed' })
  showToast('已添加维护日志（原型模拟）', 'ok')
}
function delLog(i) { selected.value.maintenanceLog.splice(i, 1); showToast('已删除日志', 'warn') }
// 手册 2.2(19)：从 Components 窗口手工创建工单
async function newWO() {
  const t = selected.value
  if (!t) return showToast('请先选择组件', 'warn')
  const wo = await workOrderService.create({
    workOrderNo: 'WO-' + Math.floor(Math.random() * 90000 + 10000),
    description: '维修工单：' + (t.name || t.number),
    functionNo: t.functionNo || '—',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: 'Issued',
    componentId: t.number,
  })
  showToast('已创建工单：' + wo.workOrderNo + '（原型模拟）', 'ok')
}
function doNew() {
  // 新建组件尚未安装到 function，状态按手册推导为 Available
  const rec = { id: 'new_' + Date.now(), number: 'C-' + Math.floor(Math.random() * 90000 + 10000), name: '', typeNumber: '', status: 'Available', maker: '', type: '', serialNo: '', location: '', department: store.department, installation: store.installation, functionNo: '', vendor: '', parentComponent: '', installDate: '' }
  all.value.push(rec); viewRows.value = [...viewRows.value, rec]; selected.value = rec
  showToast('已新建组件，编辑后 Save', 'ok')
}
function doSave() { if (selected.value) showToast('已保存（内存态）', 'ok') }
function doDelete() {
  if (!selected.value) return
  const i = all.value.findIndex((r) => r.id === selected.value.id)
  if (i >= 0) all.value.splice(i, 1)
  selected.value = null; applyFilter({})
  showToast('已删除', 'warn')
}
function register() { showToast('Register as Component：选择 Installation / Department 后生成组件（原型演示）', 'info') }
// 手册 2 / P43：Options > Copy 复制组件（选条目 + 新编号 + Save）
function copyComponent() {
  optionsOpen.value = false
  const t = selected.value
  if (!t) { showToast('请先选择要复制的组件', 'warn'); return }
  const base = { ...t }
  delete base.id
  const m = /^(.*?)(\d+)(\D*)$/.exec(base.number || '')
  base.number = m ? `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, '0')}${m[3]}` : `${base.number || 'C'}_COPY`
  base.name = `${base.name || ''} (Copy)`
  base.status = 'Available'
  base.id = 'new_' + Date.now()
  // 深拷贝子表
  base.componentCounters = (t.componentCounters || []).map((x) => ({ ...x }))
  base.componentMeasurePoints = (t.componentMeasurePoints || []).map((x) => ({ ...x }))
  all.value.push(base)
  viewRows.value = [...viewRows.value, base]
  selected.value = base
  showToast('已复制组件：请修改 Number 后 Save（手册 P43：Options > Copy）', 'ok')
}
// ===== Options > Change Status（手册 Component Status）=====
const statusDialog = ref(false)
const statusTarget = ref('')
const statusCascade = ref(false)
const transferredDialog = ref(false)
const transferredItems = ref([])
const transferredClear = ref(false)
const statusLogDialog = ref(false)
const statusLogRows = ref([])

function openChangeStatus() {
  optionsOpen.value = false
  const s = selected.value
  if (!s) { showToast('请先选择组件', 'warn'); return }
  statusTarget.value = s.status
  statusCascade.value = false
  transferredItems.value = []
  statusDialog.value = true
}
// 视图层同步：viewRows 在 applyFilter 时可能被浅拷贝，需把 db 中的最新值反写回列表和当前选中行
function syncRowsFromDb(ids) {
  ids.forEach((id) => {
    const dbComp = componentService.listSync().find((c) => c.id === id)
    if (!dbComp) return
    const row = viewRows.value.find((r) => r.id === id)
    if (row) Object.assign(row, dbComp)
    if (selected.value && selected.value.id === id) Object.assign(selected.value, dbComp)
  })
}
async function confirmChangeStatus() {
  const s = selected.value
  if (!s) return
  const res = await componentService.changeStatus(s.id, statusTarget.value, { cascadeSubComponents: statusCascade.value })
  if (!res.ok) { showToast('状态修改失败', 'warn'); return }
  statusDialog.value = false
  syncRowsFromDb(res.updatedIds || [s.id])
  // 改为 Transferred 且 Stock Wanted 存在引用 → 二次确认
  if (res.affectedWanted && res.affectedWanted.length) {
    transferredItems.value = res.affectedWanted
    transferredDialog.value = true
    return
  }
  showToast(`状态已改为 ${statusTarget.value}`, 'ok')
}
async function confirmTransferred() {
  const s = selected.value
  if (!s) return
  await componentService.resolveTransferredStock(s.id, { clearQuantity: transferredClear.value })
  transferredDialog.value = false
  showToast(transferredClear.value ? '已清空需求数量并移除引用' : '已保留数量并移除引用', 'ok')
}
async function openStatusLog() {
  optionsOpen.value = false
  const s = selected.value
  if (!s) { showToast('请先选择组件', 'warn'); return }
  statusLogRows.value = await componentService.getStatusLog(s.id)
  statusLogDialog.value = true
}
// Open Record
function doOpen() {
  if (showFilter.value) return
  openKeyValue.value = ''
  showOpenDialog.value = true
}
function confirmOpen() {
  const val = openKeyValue.value.trim()
  if (!val) return showToast('请输入 Number', 'warn')
  const rec = all.value.find((r) => String(r.number || '').toLowerCase() === val.toLowerCase())
  if (!rec) return showToast(`未找到 Number 为「${val}」的组件`, 'warn')
  if (!viewRows.value.find((r) => r.id === rec.id)) viewRows.value = [...viewRows.value, rec]
  selected.value = rec; showOpenDialog.value = false
  showToast(`已打开组件：${rec.number}`, 'ok')
}
function onAction(e) { const a = e.detail?.action; if (a === 'filter') reopenFilter(); if (a === 'new') doNew(); if (a === 'open') doOpen() }
onMounted(() => { window.addEventListener('amos-action', onAction); applyPreset() })
// keep-alive 激活时：若带 presetFilter（来自 Component Types 的 View 跳转）则应用并自动选中目标组件，否则保留之前选中的上下文
onActivated(() => { if (store.presetFilter) applyPreset() })
onBeforeUnmount(() => window.removeEventListener('amos-action', onAction))
watch(showOpenDialog, (v) => { if (v) nextTick(() => openInputRef.value?.focus()) })
function statusClass(v) {
  const s = String(v).toLowerCase()
  if (/(in use|available|active)/.test(s)) return 'green'
  if (/(transferred)/.test(s)) return 'blue'
  if (/(scrapped|obsolete)/.test(s)) return 'red'
  return 'gray'
}
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
.bw-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); gap: 8px; }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; flex-shrink: 0; }
/* 按钮行：空间不足时可横向滚动，确保所有按钮始终可见 */
.bw-head .row { display: flex; gap: 6px; overflow-x: auto; flex-shrink: 1; min-width: 0; scrollbar-width: thin; }
.bw-head .row::-webkit-scrollbar { height: 4px; }
.bw-head .row::-webkit-scrollbar-thumb { background: #c2d2e8; border-radius: 2px; }
.scope-badge { font-size: 11.5px; color: #1f6fb2; background: #e8f2fb; border: 1px solid #b9d8f0; border-radius: 999px; padding: 2px 10px; }
.global-badge { color: #0e6a30; background: #e4f7e8; border-color: #95d5a9; }
.bw-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.bw-list { border-bottom: 1px solid var(--amos-border); padding: 8px; min-height: 0; max-height: 40%; overflow: hidden; }
.bw-list > * { height: 100%; min-height: 0; }
.bw-detail { padding: 10px; overflow-y: auto; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.bw-detail.empty { display: flex; align-items: center; justify-content: center; }
/* slot 内按钮栏与继承信息框（scoped 不继承 RecordDetail 样式，需本组件定义） */
.subgrid-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.inherited-box { border: 1px dashed var(--amos-border); border-radius: 6px; padding: 10px; margin-bottom: 10px; background: #fafcff; }
.inherited-box .amos-field { margin-top: 6px; }
/* Options 菜单（浮层 popup） */
.bw-options { position: relative; }
.bw-options-popup { background: #fff; border: 1px solid var(--amos-border-strong); border-radius: 6px; box-shadow: 0 6px 20px rgba(0,0,0,.18); z-index: 9999; min-width: 180px; padding: 4px; }
.bw-options-popup button { display: block; width: 100%; text-align: left; border: none; background: transparent; padding: 7px 10px; border-radius: 4px; cursor: pointer; font-size: 12.5px; }
.bw-options-popup button:hover { background: var(--amos-blue-soft); }
/* 上下布局，无需响应式切换 */
/* Open Record 对话框 */
.open-dialog-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; z-index: 40; }
.open-dialog { background: #fff; border-radius: 10px; box-shadow: var(--amos-shadow); width: 420px; padding: 20px 24px; }
.open-dialog h3 { margin: 0 0 8px; font-size: 15px; color: #2c486a; }
.open-dialog .amos-field { margin-top: 12px; }
.od-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
/* 手册 P44-45 截图右下角：Counter Setup 齿轮按钮（置于 Counters 标签底部右侧） */
.counter-setup-bar { display: flex; justify-content: flex-end; margin-top: 10px; }
.counter-setup-bar .gear { font-size: 13px; margin-right: 2px; }
/* Counter Setup 弹窗（Teleport 到 body，需全局样式覆盖 scoped 限制） */
:global(.cs-mask) { position: fixed; inset: 0; background: rgba(0,0,0,.32); display: flex; align-items: center; justify-content: center; z-index: 5000; }
:global(.cs-modal) { background: #fff; border-radius: 10px; box-shadow: 0 10px 36px rgba(0,0,0,.28); width: 560px; max-width: 92vw; max-height: 84vh; display: flex; flex-direction: column; overflow: hidden; }
:global(.cs-head) { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--amos-border); background: #f3f6fa; }
:global(.cs-head strong) { font-size: 13.5px; color: #2c486a; }
:global(.cs-body) { padding: 12px 14px; overflow: auto; }
:global(.cs-body .muted) { font-size: 12px; margin: 0 0 10px; }
:global(.cs-foot) { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--amos-border); background: #fafcff; }
:global(.cs-action) { white-space: nowrap; }
/* 手册 P60：Details 只读 Job Description 对话框（Teleport 到 body，需全局样式覆盖 scoped 限制） */
:global(.jd-mask) { position: fixed; inset: 0; background: rgba(0,0,0,.32); display: flex; align-items: center; justify-content: center; z-index: 5000; }
:global(.jd-modal) { background: #fff; border-radius: 10px; box-shadow: 0 10px 36px rgba(0,0,0,.28); width: 460px; max-width: 92vw; max-height: 84vh; display: flex; flex-direction: column; overflow: hidden; }
:global(.jd-head) { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--amos-border); background: #f3f6fa; }
:global(.jd-head strong) { font-size: 13.5px; color: #2c486a; }
:global(.jd-body) { padding: 12px 14px; overflow: auto; }
:global(.jd-body .muted) { font-size: 12px; margin: 0 0 10px; }
:global(.jd-body .amos-field) { margin-top: 8px; }
:global(.jd-foot) { display: flex; justify-content: flex-end; padding: 10px 14px; border-top: 1px solid var(--amos-border); background: #fafcff; }
:global(.added-tag) { color: #0e6a30; font-size: 12px; }
</style>
