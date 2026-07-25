// 复现脚本（贴近用户真实场景）：
// Components 选中组件 → Jobs 标签 New → 自动跳入 Component Jobs（第一次，高亮新建 Job）
// → 在 Job Description 标签设置 JD → 切回 Components → Jobs 标签选中该 Job → View
// → 再次跳入 Component Jobs（第二次，keep-alive 复用，_focusJobNo 相同）
// → 断言左侧列表高亮目标 Job。
//
// 用法：node tests/e2e/repro-job-preselect.mjs
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
  await page.locator('.tab-body').first().locator('button', { hasText: 'New' }).first().click(); await sleep(400)
  await page.locator('button', { hasText: 'Save' }).first().click(); await sleep(700)

  // 2) 现在在 component-jobs（第一次进入），读取新建 Job No
  const firstSel = await getSelectedJobNo(page)
  console.log(`[第一次进入] 左侧选中: ${firstSel}`)
  const NEWJOB = firstSel ? firstSel.split('@')[0] : null
  if (!NEWJOB) { console.log('未能获取新建 Job No，退出'); await browser.close(); process.exit(2) }

  // 3) 在 Job Description 标签设置 JD（点 lookup 选第一条）
  await page.locator('.biz-win').last().locator('.tab-row .tab', { hasText: 'Job Description' }).first().click(); await sleep(400)
  const jdLookup = page.locator('.biz-win').last().locator('.amos-field', { hasText: 'Job Description' }).locator('.lookup-btn').first()
  await jdLookup.scrollIntoViewIfNeeded().catch(() => {})
  await jdLookup.dispatchEvent('click').catch(() => {})
  await sleep(500)
  const dlg = page.locator('.dialog').first()
  if (await dlg.count()) {
    const opt = dlg.locator('tbody tr').first()
    if (await opt.count()) { await opt.click(); await sleep(300); console.log('[JD] 已选择 Job Description') }
    // 关闭 lookup 弹窗（点 OK / 确认 / 取消，避免 modal-mask 残留拦截后续点击）
    const closeBtn = dlg.locator('button', { hasText: /OK|确认|选择|取消|Close/i }).first()
    if (await closeBtn.count()) { await closeBtn.click().catch(() => {}); await sleep(300) }
  } else {
    console.log('[JD] lookup 弹窗未出现（不影响高亮验证）')
  }
  // 清除可能残留的 modal-mask
  const mask = page.locator('.modal-mask')
  if (await mask.count()) { await mask.click({ position: { x: 5, y: 5 } }).catch(() => {}); await sleep(300) }
  // 保存 JD（若有）
  const saveBtn = page.locator('.biz-win').last().locator('button', { hasText: 'Save' }).first()
  if (await saveBtn.isVisible().catch(() => false)) { await saveBtn.click(); await sleep(400) }

  // 4) 切回 Components（离开 component-jobs）
  await openComponents(page); await sleep(300)

  // 5) 第二次进入：Components Jobs 标签选中该 Job → View
  await page.locator('.record-list .amos-grid tbody tr', { hasText: COMP }).first().click(); await sleep(300)
  await page.locator('.tab-row .tab', { hasText: 'Jobs' }).first().click(); await sleep(400)
  const jobsPanel = page.locator('.tab-body').first()
  const jobRow = jobsPanel.locator('tbody tr', { hasText: NEWJOB }).first()
  await jobRow.waitFor({ state: 'visible', timeout: 8000 })
  await jobRow.click(); await sleep(200)
  await jobsPanel.locator('button', { hasText: 'View' }).first().click(); await sleep(800)

  // 6) 断言第二次进入左侧高亮
  const secondSel = await getSelectedJobNo(page)
  const pass = !!secondSel && secondSel.startsWith(NEWJOB)
  console.log(`[第二次进入] 左侧选中: ${secondSel} -> ${pass ? '高亮✅ PASS' : '未高亮❌ FAIL'}`)

  if (errors.length) { console.log('\n[控制台错误]'); errors.forEach((e) => console.log('  -', e)) }
  await browser.close()
  process.exit(pass ? 0 : 1)
}
main().catch((e) => { console.error('脚本异常:', e); process.exit(2) })
