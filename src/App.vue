<template>
  <div class="app-shell">
    <!-- 顶部标题栏 -->
    <header class="top-bar">
      <div class="tb-brand">
        <span class="tb-logo">Neusoft</span>
        <div class="tb-caption">
          <strong>{{ prototypeData.productName }}</strong>
          <small>{{ prototypeData.windowCaption }}</small>
        </div>
      </div>
      <div class="tb-right">
        <label class="tb-field">
          <span>安装地点</span>
          <select v-model="store.installation" class="amos-select sm" @change="onInstChange">
            <option v-for="i in installations" :key="i.code" :value="i.code">{{ i.code }}</option>
          </select>
        </label>
        <label class="tb-field">
          <span>部门</span>
          <select v-model="store.department" class="amos-select sm">
            <option v-for="d in deptOptions" :key="d" :value="d">{{ d }}</option>
          </select>
        </label>
        <span class="tb-user">
          <span class="tb-avatar">{{ userInitial }}</span>
          {{ store.user }}
        </span>
        <button class="amos-btn ghost" title="锁定" @click="lock">🔒</button>
      </div>
    </header>

    <MenuBar />
    <Toolbar />

    <div class="work-area">
      <main class="workspace">
        <!-- 窗口标签页 -->
        <div class="tab-strip">
          <div
            v-for="t in store.openTabs"
            :key="t.pageKey"
            class="wtab"
            :class="{ active: t.pageKey === store.activeKey }"
            @click="store.activeKey = t.pageKey"
          >
            <span>{{ t.title }}</span>
            <button class="wtab-x" @click.stop="closeTab(t.pageKey)" title="关闭">×</button>
          </div>
          <span v-if="!store.openTabs.length" class="muted" style="padding:8px 12px">未打开任何窗口</span>
        </div>
        <!-- 活动窗口内容：keep-alive 保留各窗口上下文；:key 区分 activeKey 以避免多窗口共用 BusinessWindow 串台 -->
        <div class="win-content">
          <keep-alive>
            <component :is="activeComponent" :key="store.activeKey" />
          </keep-alive>
        </div>
      </main>
    </div>

    <StatusBar />
    <GlobalDialogs />

    <!-- Toast -->
    <transition name="fade">
      <div v-if="store.toast" class="toast" :class="store.toast.tone">{{ store.toast.msg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import MenuBar from './components/MenuBar.vue'
import Toolbar from './components/Toolbar.vue'
import StatusBar from './components/StatusBar.vue'
import GlobalDialogs from './components/GlobalDialogs.vue'
import { store, openWindow, closeTab, showToast } from './store.js'
import { installations, departments, prototypeData } from './data/amosData.js'
import { pageComponents } from './pages/index.js'

const activeComponent = computed(() => pageComponents[store.activeKey] || pageComponents.dashboard)

const deptOptions = computed(() => departments.filter((d) => d.installation === store.installation).map((d) => d.code))
const userInitial = computed(() => (store.user || 'A').trim().charAt(0).toUpperCase())

function onInstChange() {
  store.department = deptOptions.value[0] || ''
}
function lock() {
  showToast('应用已锁定（原型演示）', 'warn')
}

// 手册 1.3：Ctrl+F 打开当前窗口的查找过滤器
function onKeydown(e) {
  if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('amos-action', { detail: { action: 'filter' } }))
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (store.options.enableDashboard && !store.openTabs.length) openWindow('dashboard')
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.app-shell { display: flex; flex-direction: column; height: 100%; background: var(--amos-panel); }
.top-bar { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; background: var(--amos-title-grad); color: #fff; }
.tb-brand { display: flex; align-items: center; gap: 10px; }
.tb-logo { font-weight: 900; font-size: 18px; letter-spacing: 2px; background: rgba(255,255,255,.18); padding: 3px 10px; border-radius: 6px; }
.tb-caption { display: flex; flex-direction: column; line-height: 1.2; }
.tb-caption strong { font-size: 13.5px; }
.tb-caption small { font-size: 11px; opacity: .8; }
.tb-right { display: flex; align-items: center; gap: 14px; }
.tb-field { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.tb-field .amos-select.sm { height: 26px; width: auto; min-width: 120px; color: #24415f; border-color: rgba(255,255,255,.4); background: #fff; }
.tb-user { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
.tb-avatar { width: 26px; height: 26px; border-radius: 50%; background: #fff; color: var(--amos-blue); display: inline-flex; align-items: center; justify-content: center; font-weight: 800; }
.tb-right .amos-btn.ghost { color: #fff; }

.work-area { flex: 1; display: flex; min-height: 0; }
.workspace { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--amos-panel); }
.tab-strip { display: flex; align-items: flex-end; gap: 2px; background: var(--amos-panel-2); border-bottom: 1px solid var(--amos-border); padding: 4px 6px 0; overflow-x: auto; }
.wtab { display: flex; align-items: center; gap: 8px; padding: 6px 10px 6px 12px; background: #e1e7ef; border: 1px solid var(--amos-border); border-bottom: none; border-radius: 6px 6px 0 0; cursor: pointer; font-size: 12.5px; color: var(--amos-text-soft); white-space: nowrap; }
.wtab.active { background: #fff; color: var(--amos-blue); font-weight: 700; box-shadow: 0 -2px 0 var(--amos-blue) inset; }
.wtab-x { border: none; background: transparent; cursor: pointer; color: #8a98a8; font-size: 14px; line-height: 1; padding: 0 2px; border-radius: 3px; }
.wtab-x:hover { background: rgba(0,0,0,.08); color: var(--amos-danger); }
.win-content { flex: 1; min-height: 0; background: #fff; overflow: hidden; display: flex; }
.win-content > * { flex: 1; }

.toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 8px; color: #fff; font-weight: 600; box-shadow: var(--amos-shadow); z-index: 1500; }
.toast.ok { background: #1f9d63; }
.toast.warn { background: #e8853a; }
.toast.info { background: #2a5ca8; }
.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
