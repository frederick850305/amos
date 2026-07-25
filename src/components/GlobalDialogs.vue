<template>
  <!-- 切换部门 -->
  <Modal v-if="store.globalDialog === 'switch-department'" title="Switch Department" width="420px" @close="close">
    <div class="amos-field">
      <label>Installation</label>
      <div class="ctrl">
        <select v-model="inst" class="amos-select" @change="onInst">
          <option v-for="i in installations" :key="i.code" :value="i.code">{{ i.name }}</option>
        </select>
      </div>
    </div>
    <div class="amos-field">
      <label>Department</label>
      <div class="ctrl">
        <select v-model="dept" class="amos-select">
          <option v-for="d in deptOptions" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
    </div>
    <template #footer>
      <button class="amos-btn" @click="closeWindows">Close Windows</button>
      <span class="spacer" />
      <button class="amos-btn" @click="close">Cancel</button>
      <button class="amos-btn primary" @click="apply">OK</button>
    </template>
  </Modal>

  <!-- 修改密码 -->
  <Modal v-else-if="store.globalDialog === 'change-password'" title="Change Password" width="420px" @close="close">
    <div class="amos-field"><label>Login ID</label><div class="ctrl"><input class="amos-input" :value="store.user" readonly /></div></div>
    <div class="amos-field"><label>Old Password</label><div class="ctrl"><input type="password" v-model="pw.old" class="amos-input" /></div></div>
    <div class="amos-field"><label>New Password</label><div class="ctrl"><input type="password" v-model="pw.nw" class="amos-input" /></div></div>
    <div class="amos-field"><label>Confirm New Password</label><div class="ctrl"><input type="password" v-model="pw.confirm" class="amos-input" /></div></div>
    <template #footer>
      <button class="amos-btn" @click="close">Cancel</button>
      <button class="amos-btn primary" @click="changePw">OK</button>
    </template>
  </Modal>

  <!-- SFI 编码说明（手册 2.1）-->
  <Modal v-else-if="store.globalDialog === 'sfi-info'" title="SFI Coding（SFI 编码规则）" width="520px" @close="close">
    <p>SFI 分类编码系统（Ship/Facility Item Group System）是航运与海洋石油行业广泛应用的国际标准，用于对船舶 / 钻井平台的技术功能与财务信息进行细分。</p>
    <p class="muted">SFI 涵盖船舶 / 钻井船技术规格的所有方面，将采购、财务、维护保养、设备技术等信息关联起来。</p>
    <div class="amos-field"><label>编码规则（部件示例）</label>
      <div class="ctrl"><input class="amos-input" :value="'731 . 001 . 001'" readonly /></div>
    </div>
    <ul class="sfi-rule">
      <li><b>731</b> = 起动空气系统（System）</li>
      <li><b>001</b> = 起动空压机组（Group）</li>
      <li><b>001</b> = 起动空压机（Unit / 部件）</li>
    </ul>
    <p class="muted">在 Components / Functions Hierarchy 窗口中点击 <b>Toggle number</b> 可显示或隐藏 SFI 编码。</p>
    <template #footer>
      <button class="amos-btn primary" @click="close">OK</button>
    </template>
  </Modal>

  <!-- 关于 -->
  <Modal v-else-if="store.globalDialog === 'about'" title="About M&P" width="440px" @close="close">
    <div class="about">
      <div class="about-logo">Neusoft</div>
      <p><b>{{ prototypeData.productName }}</b> — {{ prototypeData.windowCaption }}</p>
      <p class="muted">版本：{{ prototypeData.version }}</p>
      <hr class="sep" />
      <p class="muted">本系统为国产化 Vue 原型，用于演示与业务沟通，非生产系统。数据均为前端 Mock。</p>
    </div>
    <template #footer>
      <button class="amos-btn primary" @click="close">OK</button>
    </template>
  </Modal>

  <!-- 选择视图 -->
  <Modal v-else-if="store.globalDialog === 'select-view'" title="Select View" width="440px" @close="close">
    <p class="muted" style="margin-top:0">为当前窗口选择预定义过滤与列配置。</p>
    <div class="view-list">
      <button v-for="v in views" :key="v" class="view-item" :class="{ active: v === selView }" @click="selView = v">{{ v }}</button>
    </div>
    <template #footer>
      <button class="amos-btn" @click="close">Cancel</button>
      <button class="amos-btn primary" :disabled="!selView" @click="applyView">OK</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from './Modal.vue'
import { store, closeDialog, showToast } from '../store.js'
import { installations, departments, prototypeData } from '../data/amosData.js'

const inst = ref(store.installation)
const dept = ref(store.department)
const deptOptions = computed(() => departments.filter((d) => d.installation === inst.value).map((d) => d.code))
function onInst() {
  dept.value = deptOptions.value[0] || ''
}

const selView = ref('')
const views = ['All Records', 'Active Only', 'This Week Due', 'My Department', 'Overdue']

const pw = ref({ old: '', nw: '', confirm: '' })
function changePw() {
  if (!pw.value.old) return showToast('请输入当前密码', 'warn')
  if (pw.value.nw.length < 4) return showToast('新密码至少 4 位', 'warn')
  if (pw.value.nw !== pw.value.confirm) return showToast('两次输入的新密码不一致', 'warn')
  pw.value = { old: '', nw: '', confirm: '' }
  closeDialog()
  showToast('密码已修改（原型演示）', 'ok')
}

function close() {
  closeDialog()
}
function apply() {
  // 手册 P20 步骤 4：切换前应关闭所有窗口
  if (store.openTabs.length) {
    showToast('请先关闭所有窗口后再切换 Department（或点 Close Windows 按钮）', 'warn')
    return
  }
  store.installation = inst.value
  store.department = dept.value
  closeDialog()
  showToast(`已切换至 ${inst.value} / ${dept.value}`, 'ok')
}
function closeWindows() {
  store.openTabs = []
  store.activeKey = null
  closeDialog()
  showToast('已关闭所有窗口', 'info')
}
function applyView() {
  closeDialog()
  showToast(`已应用视图：${selView.value}`, 'ok')
}
</script>

<style scoped>
.about { text-align: center; }
.about-logo { font-size: 30px; font-weight: 900; letter-spacing: 3px; color: var(--amos-blue); margin-bottom: 6px; }
.view-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.view-item { padding: 10px; border: 1px solid var(--amos-border-strong); border-radius: 6px; background: #fff; cursor: pointer; text-align: left; font-size: 12.5px; }
.view-item:hover { border-color: var(--amos-blue); background: #f3f8ff; }
.view-item.active { background: var(--amos-blue-soft); border-color: var(--amos-blue); color: var(--amos-blue); font-weight: 700; }
</style>
