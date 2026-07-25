// ============================================================
// Auth Service —— 对接 amos-server System Foundation 的认证接口
// ============================================================

import apiFetch, { setToken } from './api.js'

export const authService = {
  // POST /api/auth/login  {username,password} -> {token,username,displayName,roles,scopes}
  async login(username, password) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { username, password }, auth: false })
    if (data && data.token) setToken(data.token)
    return data
  },
  // GET /api/system/me
  async me() {
    return apiFetch('/system/me')
  },
  // GET /api/system/me/scopes
  async scopes() {
    return apiFetch('/system/me/scopes')
  },
}
