// ============================================================
// Component Types 前端接入 e2e（自包含）：
// 登录后端 → 预置一个含 alternativeNo 的类型 → 真实浏览器打开
// Component Types 窗口 → 断言列表渲染了来自后端的该行（证明
// 前端 loadAll 接入成功且无运行时错误）→ 清理。
// 运行：node tests/e2e/component-types.e2e.mjs
// 依赖：后端 amos-server 已在 http://localhost:8080 启动（PG profile）
// ============================================================
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 5283
const BASE = `http://localhost:${PORT}`
const API = process.env.VITE_API_TARGET || 'http://localhost:8080'
const TYPE_NO = 'CT-E2E-1'

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
const log = (...a) => console.log('[e2e-ct]', ...a)
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
let createdId = null
try {
  const token = await apiLogin()
  log('已登录后端')

  // 预置一个含 alternativeNo 的类型（stockTypeNo 解析到已有 ST-101）
  const post = await apiJson('POST', '/api/maintenance/component-types', token, {
    typeNumber: TYPE_NO,
    name: 'E2E Type',
    status: 'Active',
    stockTypeLinks: [{ stockTypeNo: 'ST-101', alternativeNo: 'ALT-E2E', quantity: 1.0 }],
  })
  createdId = post.body?.id
  check('后端预置类型成功(201/200)', post.status === 201 || post.status === 200)
  log('预置类型 id =', createdId)

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

  // 打开 Component Types 窗口（顶部 Maintenance 菜单 → Component Types 子项）
  await page.getByText('Maintenance', { exact: true }).first().click()
  await page.getByText('Component Types', { exact: true }).first().click()
  // 等待列表/视图渲染
  await page.waitForFunction(
    () => document.body.innerText.includes('Component Types'),
    { timeout: 10000 },
  )
  log('Component Types 窗口已打开')

  // 断言：列表渲染了来自后端的预置类型（证明前端 loadAll 从后端拉取）
  await page.waitForFunction(
    (tn) => document.body.innerText.includes(tn),
    TYPE_NO,
    { timeout: 10000 },
  )
  check('列表渲染了后端预置类型 ' + TYPE_NO, true)

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
    if (createdId != null) {
      const token = await apiLogin()
      await apiJson('DELETE', `/api/maintenance/component-types/${createdId}`, token)
      log('已清理预置类型', createdId)
    }
  } catch (e) {
    log('清理失败(可手动删):', e.message)
  }
}

log(failures === 0 ? 'ALL PASS ✅' : `${failures} FAILED ❌`)
process.exit(failures === 0 ? 0 : 1)
