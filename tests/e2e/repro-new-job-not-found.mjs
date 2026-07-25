// 复现脚本（贴近用户真实场景）：
// Components 选中组件 → Jobs 标签 → 点 New → 自动跳入 Component Jobs 窗口
// 断言：不应弹出"未找到作业：J-xxxxx"异常提示（修复前必现，修复后消失）。
//
// 用法：node tests/e2e/repro-new-job-not-found.mjs
// 前置：dev server 已在 http://localhost:5280 运行
import { chromium } from 'playwright'
const BASE = process.env.BASE_URL || 'http://localhost:5280'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickByText(page, selector, text) {
  const loc = page.locator(selector, { hasText: text }).first()
  await loc.waitFor({ state: 'visible', timeout: 8000 })
  await loc.click(); await sleep(250)
}
async function openComponents(page) {
  await clickByText(page, '.menu-item', 'Maintenance'); await sleep(150)
  await clickByText(page, '.menu-leaf', 'Components'); await sleep(400)
}
async function getSelectedJobNo(page) {
  const win = page.locator('.biz-win').last()
  const sel = win.locator('.record-list .amos-grid tbody tr.selected')
  const n = await sel.count()
  if (!n) return null
  return (await sel.first().locator('td').first().innerText()).trim()
}

// 轮询检测"未找到作业" toast（toast 仅存活 ~2.2s，需持续监听）
async function pollForNotFoundToast(page) {
  for (let i = 0; i < 35; i++) {        // ~3.5s 覆盖 toast 生命周期
    const t = page.locator('.toast.warn')
    if (await t.count()) {
      const txt = (await t.first().innerText()).trim()
      if (txt.includes('未找到作业')) return txt
    }
    await sleep(100)
  }
  return null
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  await page.goto(BASE, { waitUntil: 'networkidle' }); await sleep(500)

  const COMP = 'C-10001'

  // 1) Components → 选组件 → Jobs 标签 → New
  await openComponents(page)
  await page.locator('.record-list .amos-grid tbody tr', { hasText: COMP }).first().click(); await sleep(300)
  await page.locator('.tab-row .tab', { hasText: 'Jobs' }).first().click(); await sleep(400)

  const newBtn = page.locator('.tab-body').first().locator('button', { hasText: 'New' }).first()
  await newBtn.waitFor({ state: 'visible', timeout: 8000 })

  // 2) 点 New 前启动 toast 轮询，点击后等待轮询结束
  const poll = pollForNotFoundToast(page)
  await newBtn.click(); await sleep(150)
  const toastMsg = await poll

  // 3) 等待跳入 component-jobs 并读取左侧高亮（辅助证据）
  await sleep(800)
  const selJob = await getSelectedJobNo(page)
  console.log(`[跳入 Component Jobs] 左侧选中: ${selJob || '(空)'} | 异常 toast: ${toastMsg || '(无)'}`)

  const pass = !toastMsg
  console.log(pass
    ? '未出现"未找到作业"提示 ✅ PASS'
    : `出现"未找到作业"提示 ❌ FAIL -> ${toastMsg}`)

  if (errors.length) { console.log('\n[控制台错误]'); errors.forEach((e) => console.log('  -', e)) }
  await browser.close()
  process.exit(pass ? 0 : 1)
}
main().catch((e) => { console.error('脚本异常:', e); process.exit(2) })
