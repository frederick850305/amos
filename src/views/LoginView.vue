<template>
  <div class="login-screen">
    <div class="login-card">
      <div class="lc-brand">
        <span class="lc-logo">Neusoft</span>
        <strong>M&amp;P</strong>
      </div>
      <p class="lc-sub">国产化原型系统 · 登录 AMOS 后端</p>

      <label class="lc-field">
        <span>用户名</span>
        <input v-model="username" type="text" autocomplete="username" @keyup.enter="doLogin" />
      </label>
      <label class="lc-field">
        <span>密码</span>
        <input v-model="password" type="password" autocomplete="current-password" @keyup.enter="doLogin" />
      </label>

      <button class="lc-btn" :disabled="busy" @click="doLogin">
        {{ busy ? '登录中…' : '登录' }}
      </button>

      <p v-if="error" class="lc-error">{{ error }}</p>

      <div class="lc-foot">
        <button class="lc-link" @click="demo">以演示模式进入（本地 Mock）</button>
      </div>
      <p class="lc-hint">默认账号：admin / admin（由 amos-server SystemSeedRunner 注入）</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { login, enterDemoMode, session } from '../store/session.js'
import { openWindow, store } from '../store.js'

const username = ref('admin')
const password = ref('admin')
const busy = ref(false)
const error = ref('')

// 登录成功后把默认安装地点 / 部门设为后端返回的首个作用域
function applyDefaultScope() {
  if (session.installations.length) {
    store.installation = session.installations[0].code
    store.department = (session.installations[0].departments[0] && session.installations[0].departments[0].code) || ''
  }
}

async function doLogin() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  busy.value = true
  try {
    await login(username.value, password.value)
    applyDefaultScope()
    openWindow('dashboard')
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    busy.value = false
  }
}

function demo() {
  enterDemoMode()
  openWindow('dashboard')
}

function onUnauthorized() {
  error.value = '会话已失效，请重新登录'
}
onMounted(() => window.addEventListener('amos-unauthorized', onUnauthorized))
onBeforeUnmount(() => window.removeEventListener('amos-unauthorized', onUnauthorized))
</script>

<style scoped>
.login-screen { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #0d4a9e, #1e6fd9); }
.login-card { width: 340px; background: #fff; border-radius: 12px; padding: 28px 26px;
  box-shadow: 0 20px 60px rgba(0,0,0,.3); }
.lc-brand { display: flex; align-items: center; gap: 10px; }
.lc-logo { font-weight: 900; font-size: 18px; letter-spacing: 2px; background: #1e6fd9; color: #fff; padding: 3px 10px; border-radius: 6px; }
.lc-brand strong { font-size: 16px; color: #1e6fd9; }
.lc-sub { margin: 6px 0 18px; color: #6b7c8f; font-size: 13px; }
.lc-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; font-size: 12.5px; color: #33506f; }
.lc-field input { height: 36px; border: 1px solid #cfdae6; border-radius: 7px; padding: 0 11px; font-size: 14px; }
.lc-field input:focus { outline: none; border-color: #1e6fd9; box-shadow: 0 0 0 3px rgba(30,111,217,.15); }
.lc-btn { width: 100%; height: 40px; border: none; border-radius: 7px; background: #1e6fd9; color: #fff;
  font-size: 14.5px; font-weight: 700; cursor: pointer; }
.lc-btn:disabled { opacity: .6; cursor: default; }
.lc-error { color: #d6453d; font-size: 12.5px; margin: 10px 0 0; }
.lc-foot { margin-top: 14px; text-align: center; }
.lc-link { background: none; border: none; color: #1e6fd9; cursor: pointer; font-size: 12.5px; text-decoration: underline; }
.lc-hint { color: #9aa7b5; font-size: 11.5px; margin: 12px 0 0; text-align: center; }
</style>
