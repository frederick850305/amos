// ============================================================
// API 客户端（前端联调层）
// ------------------------------------------------------------
// 统一封装 fetch：Base URL 取自 Vite 环境变量（默认同源 /api，
// 由 vite.config.js 的 dev proxy 转发到 amos-server）。
// - 自动附带 JWT（Bearer），从 localStorage 读取；
// - 统一解析 amos-common 的 ApiResponse 信封 {code,message,data}；
// - 401 时清空令牌并广播 amos-unauthorized 事件，由 LoginView 接管。
// ============================================================

const BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '/api'

const TOKEN_KEY = 'amos_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * @param {string} path  形如 '/auth/login'
 * @param {{method?:string, body?:any, auth?:boolean}} opts
 */
export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const tk = getToken()
  if (auth && tk) headers['Authorization'] = 'Bearer ' + tk

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    clearToken()
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('amos-unauthorized'))
  }

  let payload = null
  const text = await res.text()
  if (text) {
    try { payload = JSON.parse(text) } catch { payload = text }
  }

  // amos-common ApiResponse 信封
  if (payload && typeof payload === 'object' && 'code' in payload) {
    if (payload.code >= 400) throw new Error(payload.message || ('请求失败 HTTP ' + res.status))
    return payload.data
  }
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return payload
}

export default apiFetch
