// ============================================================
// Component Types「新建 → 保存」e2e：验证修复后 toDto 不再把草稿
// 字符串 id("ct_...") 发给后端 Long 字段（原先导致 JSON parse error）。
// 运行：node tests/e2e/component-types-create.e2e.mjs
// 依赖：后端 amos-server 已在 http://localhost:8080 启动
// ============================================================
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 5284
const BASE = `http://localhost:${PORT}`
const API = process.env.VITE_API_TARGET || 'http://localhost:8080'

let failures = 0
const log = (...a) => console.log('[e2e-ct-create]', ...a)
function check(name, cond) {
  log(`${cond ? 'PASS' : 'FAIL'} - ${name}`)
  if (!cond) failures++
}
function waitPort(url, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try { const r = await fetch(url); if (r.ok) return resolve(true) } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error('vite 启动超时'))
      setTimeout(tick, 500)
    }
    tick()
  })
}
async function apiLogin() {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  })
  const j = await r.json()
  return j.data?.token || j.token
}
async function apiJson(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  return { status: r.status, body: t ? JSON.parse(t) : null }
}

let vite, token
let captured = null
let createdId = null
try {
  token = await apiLogin()
  log('已登录后端')

  vite = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
    cwd: process.cwd(), env: { ...process.env, VITE_API_TARGET: API }, stdio: 'ignore',
  })
  await waitPort(BASE)
  log('vite 就绪', BASE)

  const browser = await chromium.launch()
  const page = await browser.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  // 拦截 Component Types 的 POST 请求体
  page.on('request', (req) => {
    if (req.url().includes('/api/maintenance/component-types') && req.method() === 'POST') {
      captured = req.postData()
    }
  })

  // 登录
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="text"]', { timeout: 10000 })
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', 'admin')
  await page.click('button.lc-btn')
  await page.waitForSelector('.app-shell', { timeout: 10000 })

  // 打开 Component Types 窗口
  await page.getByText('Maintenance', { exact: true }).first().click()
  await page.getByText('Component Types', { exact: true }).first().click()
  await page.waitForFunction(() => document.body.innerText.includes('Component Types'), { timeout: 10000 })

  // 点 New（顶部按钮）→ 出现空白草稿表单（已预填 typeNumber + status）
  await page.getByText('New', { exact: true }).first().click()
  await page.waitForTimeout(500)

  // 点 Save → 触发 POST create
  await page.getByText('Save', { exact: true }).first().click()
  await page.waitForTimeout(2500)

  check('捕获到 POST /component-types 请求体', !!captured)
  if (captured) {
    check('POST 体不含字符串草稿 id ("ct_...")', !/"id"\s*:\s*"ct_/.test(captured))
    const parsed = JSON.parse(captured)
    check('POST 体省略了 id 字段（新建场景应由后端生成）', !('id' in parsed))
    const tn = parsed.typeNumber
    log('新建 typeNumber =', tn)

    // 后端确认：记录真的被创建（说明没 JSON parse error）
    const list = await apiJson('GET', '/api/maintenance/component-types', token)
    const arr = list.body?.data || list.body || []
    const rec = arr.find((x) => x.typeNumber === tn)
    check('后端已成功创建该类型 (无 JSON parse error): ' + tn, !!rec)
    if (rec) {
      createdId = rec.id
      await apiJson('DELETE', `/api/maintenance/component-types/${rec.id}`, token)
      log('已清理后端记录', rec.id)
    }
  }
  check('无运行时 pageerror', pageErrors.length === 0)
  if (pageErrors.length) log('pageerrors:', pageErrors)

  await browser.close()
} catch (e) {
  log('ERROR', e.message)
  failures++
} finally {
  if (vite) vite.kill('SIGTERM')
  try {
    if (createdId != null) {
      const tk = await apiLogin()
      await apiJson('DELETE', `/api/maintenance/component-types/${createdId}`, tk)
      log('兜底清理', createdId)
    }
  } catch {}
}
log(failures === 0 ? 'ALL PASS ✅' : `${failures} FAILED ❌`)
process.exit(failures === 0 ? 0 : 1)
