// ============================================================
// Session 状态层（前端联调核心）
// ------------------------------------------------------------
// 承载登录态、当前用户、从后端拉取的 Installations/Departments，
// 以及 Registers 的 lookup 缓存。
// 设计原则：纯增量、可回落。未登录或后端不可达时，App 回退到
// amosData.js 的静态 Mock 数据，现有原型行为不受影响。
// ============================================================

import { reactive, computed } from 'vue'
import { authService } from '../services/authService.js'
import { registerService } from '../services/registerService.js'
import { clearToken, getToken } from '../services/api.js'

export const session = reactive({
  token: getToken(),
  loggedIn: false,
  user: '',
  roles: [],
  // [{code, name, departments:[{code,name}]}]
  installations: [],
  // Registers lookup 缓存：从后端拉取；为空时 lookups 回落 Mock
  registerCache: {
    makers: [],
    vendors: [],
    functionCriticalities: [],
    locations: [],
    units: [],
    currencies: [],
    jobClasses: [],
    trades: [],
    disciplines: [],
    budgetCodes: [],
  },
})

// installation -> [deptCode]，供顶栏部门下拉使用
export const departmentsByInstallation = computed(() => {
  const map = {}
  session.installations.forEach((i) => {
    map[i.code] = (i.departments || []).map((d) => d.code)
  })
  return map
})

function normalizeScopes(scopes) {
  const insts = (scopes && scopes.installations) || []
  return insts.map((i) => ({
    code: i.code,
    name: i.name,
    departments: (i.departments || []).map((d) => ({ code: d.code, name: d.name })),
  }))
}

// 从后端拉取全部 10 个 register（makers/vendors/fc/locations/units/currencies/job-classes/trades/disciplines/budget-codes）
export async function loadRegisterLookups() {
  try {
    const [makers, vendors, fcs, locs, units, currencies, jobClasses, trades, disciplines, budgetCodes] = await Promise.all([
      registerService.makers(),
      registerService.vendors(),
      registerService.functionCriticalities(),
      registerService.locations(),
      registerService.units(),
      registerService.currencies(),
      registerService.jobClasses(),
      registerService.trades(),
      registerService.disciplines(),
      registerService.budgetCodes(),
    ])
    if (Array.isArray(makers)) session.registerCache.makers = makers
    if (Array.isArray(vendors)) session.registerCache.vendors = vendors
    if (Array.isArray(fcs)) session.registerCache.functionCriticalities = fcs
    if (Array.isArray(locs)) session.registerCache.locations = locs
    if (Array.isArray(units)) session.registerCache.units = units
    if (Array.isArray(currencies)) session.registerCache.currencies = currencies
    if (Array.isArray(jobClasses)) session.registerCache.jobClasses = jobClasses
    if (Array.isArray(trades)) session.registerCache.trades = trades
    if (Array.isArray(disciplines)) session.registerCache.disciplines = disciplines
    if (Array.isArray(budgetCodes)) session.registerCache.budgetCodes = budgetCodes
  } catch (e) {
    // 后端不可达：保持空缓存，lookups 自动回落 Mock
  }
}

// 应用启动：若本地有令牌则尝试恢复会话（me + scopes + register 缓存）
export async function bootstrapSession() {
  if (!session.token) return false
  try {
    const [me, scopes] = await Promise.all([authService.me(), authService.scopes()])
    session.user = me.displayName || me.username || ''
    session.roles = me.roles || []
    session.installations = normalizeScopes(scopes)
    session.loggedIn = true
    await loadRegisterLookups()
    return true
  } catch (e) {
    clearToken()
    session.token = ''
    session.loggedIn = false
    return false
  }
}

// 登录：成功后写入令牌、用户、作用域，并拉取 register 缓存
export async function login(username, password) {
  const data = await authService.login(username, password)
  if (data && data.token) {
    session.token = data.token
    session.user = data.displayName || data.username || ''
    session.roles = data.roles || []
    session.installations = normalizeScopes(data.scopes)
    session.loggedIn = true
    await loadRegisterLookups()
    return data
  }
  throw new Error('登录失败：后端未返回令牌')
}

// 本地演示模式：不连后端，沿用 amosData 静态 Mock
export function enterDemoMode() {
  session.loggedIn = true
  session.user = 'Demo (Mock)'
  session.installations = []
  session.registerCache = { makers: [], vendors: [], functionCriticalities: [], locations: [], units: [], currencies: [], jobClasses: [], trades: [], disciplines: [], budgetCodes: [] }
}

export function logout() {
  clearToken()
  session.token = ''
  session.loggedIn = false
  session.user = ''
  session.roles = []
  session.installations = []
  session.registerCache = { makers: [], vendors: [], functionCriticalities: [], locations: [], units: [], currencies: [], jobClasses: [], trades: [], disciplines: [], budgetCodes: [] }
}
