// ============================================================
// 前端联调 e2e（自包含）：拉起 vite dev → 真实浏览器登录 amos-server
// → 断言后端 Installation/Department/User 与 register 数据。
// 运行：node tests/e2e/integration-login.mjs
// 依赖：后端 amos-server 已在 http://localhost:8080 启动（PG profile）
// ============================================================
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 5280
const BASE = `http://localhost:${PORT}`
const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:8080'

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

let vite
const log = (...a) => console.log('[e2e]', ...a)
let failures = 0
function check(name, cond) {
  log(`${cond ? 'PASS' : 'FAIL'} - ${name}`)
  if (!cond) failures++
}

const viteEnv = { ...process.env, VITE_API_TARGET: API_TARGET }
vite = spawn('npm', ['run', 'dev'], { cwd: process.cwd(), env: viteEnv, stdio: 'ignore' })

try {
  await waitPort(BASE)
  log('vite 已就绪', BASE)

  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  page.on('pageerror', (e) => log('pageerror:', e.message))

  // ---- 1) 登录后端 ----
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="text"]', { timeout: 10000 }) // LoginView 用户名框
  log('LoginView 已显示')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', 'admin')
  await page.click('button.lc-btn')
  await page.waitForSelector('.app-shell', { timeout: 10000 }) // 登录门禁通过
  log('登录成功，进入应用外壳')

  // ---- 2) 后端 scopes → 顶栏 Installation/Department ----
  const instVal = await page.$eval('.tb-field select', (el) => el.value)
  check('顶栏安装地点取自后端 scopes = Traveller', instVal === 'Traveller')
  const deptVal = await page.$$eval('.tb-field select', (els) => els[1]?.value)
  check('顶栏部门取自后端 scopes = ER', deptVal === 'ER')
  const userTxt = await page.$eval('.tb-user', (el) => el.textContent)
  check('顶栏用户名取自 /api/system/me = Administrator', /Administrator/.test(userTxt))

  // ---- 3) 浏览器内通过代理 /api 拉取 register（证明 proxy+auth+register 联调） ----
  const makers = await page.evaluate(async () => {
    const tk = localStorage.getItem('amos_token')
    const r = await fetch('/api/register/makers', { headers: { Authorization: 'Bearer ' + tk } })
    return r.json()
  })
  check('浏览器经 /api 代理获取 makers（>=1 行）', Array.isArray(makers) && makers.length >= 1)
  log('makers 行数 =', Array.isArray(makers) ? makers.length : makers)

  // ---- 4) 演示模式回落（无后端也能进） ----
  const ctx2 = await browser.newContext()
  const page2 = await ctx2.newPage()
  await page2.goto(BASE, { waitUntil: 'networkidle' })
  await page2.waitForSelector('button.lc-link', { timeout: 10000 })
  await page2.click('button.lc-link') // 演示模式
  await page2.waitForSelector('.app-shell', { timeout: 10000 })
  const instOptions = await page2.$$eval('.tb-field select option', (opts) => opts.map((o) => o.value))
  check('演示模式回落 Mock：含 Voyager/Endeavour', instOptions.includes('Voyager') && instOptions.includes('Endeavour'))

  await browser.close()
} catch (e) {
  log('ERROR', e.message)
  failures++
} finally {
  if (vite) vite.kill('SIGTERM')
}

log(failures === 0 ? 'ALL PASS ✅' : `${failures} FAILED ❌`)
process.exit(failures === 0 ? 0 : 1)
