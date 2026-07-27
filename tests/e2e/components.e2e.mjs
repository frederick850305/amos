// ============================================================
// Components 前端接入 e2e（自包含）：
// 登录后端 → 预置组件（一个 ER 部门应显示，一个其他部门应被范围过滤隐藏）
// → 真实浏览器打开 Components 窗口 → 断言列表读取后端数据 + 部门过滤
// → 走 Change Status → Component Status Log 断言状态变更已持久化
// → 清理。
// 运行：node tests/e2e/components.e2e.mjs
// 依赖：后端 amos-server 已在 http://localhost:8080 启动（PG profile）
// ============================================================
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 5284
const BASE = `http://localhost:${PORT}`
const API = process.env.VITE_API_TARGET || 'http://localhost:8080'
const ER_NO = 'COMP-E2E-ER'
const OTHER_NO = 'COMP-E2E-XX'

function waitPort(url, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const r = await fetch(url)
        if (r.ok) return resolve(true)
      } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error('vite 启动超时'))
      setTimeout(tick, 500)
    }
    tick()
  })
}

let failures = 0
const log = (...a) => console.log('[e2e-comp]', ...a)
function check(name, cond) {
  log(`${cond ? 'PASS' : 'FAIL'} - ${name}`)
  if (!cond) failures++
}

async function apiLogin() {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  })
  const j = await r.json()
  return j.data?.token || j.token
}
async function apiJson(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  return { status: r.status, body: t ? JSON.parse(t) : null }
}

let vite
let createdIds = []
try {
  const token = await apiLogin()
  log('已登录后端')

  // 预置：ER 部门组件（应显示）+ 其他部门组件（应被范围过滤隐藏）
  const er = await apiJson('POST', '/api/maintenance/components', token, {
    number: ER_NO, name: 'E2E ER Comp', status: 'Available',
    installation: 'Traveller', department: 'ER', typeNumber: 'CT-1001',
  })
  if (er.body?.id) createdIds.push(er.body.id)
  check('后端预置 ER 组件成功', er.status === 201 || er.status === 200)

  const other = await apiJson('POST', '/api/maintenance/components', token, {
    number: OTHER_NO, name: 'E2E Other Comp', status: 'Available',
    installation: 'Traveller', department: 'XX', typeNumber: 'CT-1001',
  })
  if (other.body?.id) createdIds.push(other.body.id)
  check('后端预置其他部门组件成功', other.status === 201 || other.status === 200)

  // 启动 vite
  const viteEnv = { ...process.env, VITE_API_TARGET: API }
  vite = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
    cwd: process.cwd(),
    env: viteEnv,
    stdio: 'ignore',
  })
  await waitPort(BASE)
  log('vite 已就绪', BASE)

  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  // 登录
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="text"]', { timeout: 10000 })
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', 'admin')
  await page.click('button.lc-btn')
  await page.waitForSelector('.app-shell', { timeout: 10000 })
  log('登录成功，进入应用外壳')

  // 打开 Components 窗口
  await page.getByText('Maintenance', { exact: true }).first().click()
  await page.getByText('Components', { exact: true }).first().click()
  await page.waitForFunction(
    () => document.body.innerText.includes('Components'),
    { timeout: 10000 },
  )
  log('Components 窗口已打开')

  // 断言 1：列表读取了后端预置的 ER 组件
  await page.waitForFunction((n) => document.body.innerText.includes(n), ER_NO, { timeout: 10000 })
  check('列表渲染了后端 ER 组件 ' + ER_NO, true)

  // 断言 2：其他部门组件被范围过滤隐藏（ER 范围不应显示 XX）
  const otherVisible = await page.evaluate((n) => document.body.innerText.includes(n), OTHER_NO)
  check('其他部门组件被范围过滤隐藏（不显示 ' + OTHER_NO + '）', !otherVisible)

  // 断言 3：Change Status → Status Log 状态变更持久化
  await page.locator('tr:has-text("' + ER_NO + '")').first().click()
  await page.getByText('Options', { exact: false }).first().click()
  await page.getByText('Change Status', { exact: true }).first().click()
  await page.waitForSelector('.open-dialog.reg select', { timeout: 5000 })
  await page.selectOption('.open-dialog.reg select', 'In Use')
  await page.locator('.open-dialog.reg').getByText('OK', { exact: true }).click()
  // 打开 Component Status Log
  await page.getByText('Options', { exact: false }).first().click()
  await page.getByText('Component Status Log', { exact: true }).first().click()
  await page.waitForFunction(
    () => document.body.innerText.includes('In Use') && document.body.innerText.includes('Available'),
    { timeout: 10000 },
  )
  check('Component Status Log 显示 Available → In Use（状态变更已持久化）', true)

  check('无运行时 pageerror', pageErrors.length === 0)
  if (pageErrors.length) log('pageerrors:', pageErrors)

  await browser.close()
} catch (e) {
  log('ERROR', e.message)
  failures++
} finally {
  if (vite) vite.kill('SIGTERM')
  // 清理预置数据
  try {
    if (createdIds.length) {
      const token = await apiLogin()
      for (const id of createdIds) {
        await apiJson('DELETE', `/api/maintenance/components/${id}`, token)
      }
      log('已清理预置组件', createdIds)
    }
  } catch (e) {
    log('清理失败(可手动删):', e.message)
  }
}

log(failures === 0 ? 'ALL PASS ✅' : `${failures} FAILED ❌`)
process.exit(failures === 0 ? 0 : 1)
