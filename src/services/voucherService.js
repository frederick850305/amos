// ============================================================
// Voucher Service —— 凭证（Vouchers / Invoices）领域的数据访问 / 业务逻辑层
// ------------------------------------------------------------
// 与 componentService 同构：视图层只调用本 service，后续接真实后端时
// 仅替换方法体（fetch/axios），方法签名保持不变。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
//   * 写入方法异步（模拟后端事务）
// ============================================================

import { db, uid } from '../mock/index.js'

// 凭证可关联多张采购单（formNos），统一派生一个展示用字符串 formNo
// 在模块加载时做一次规范化（原型内存态，等价于后端返回前已填充）
db.vouchers.forEach((v) => {
  if (Array.isArray(v.formNos) && !('formNo' in v)) v.formNo = v.formNos.join(', ')
})

export const voucherService = {
  // ---- 读取 ----
  list() {
    return db.vouchers
  },
  get(id) {
    return db.vouchers.find((v) => v.id === id) || null
  },

  // ---- 写入 ----
  async create(data = {}) {
    const rec = {
      id: uid('vc'),
      voucherNo: data.voucherNo || 'VC-' + Math.floor(Math.random() * 9000 + 1000),
      vendor: data.vendor || '',
      formNo: data.formNo || '',
      formNos: data.formNos || [],
      status: data.status || 'Draft',
      net: data.net ?? 0,
      vat: data.vat ?? 0,
      total: data.total ?? 0,
      lineItems: data.lineItems || [],
    }
    db.vouchers.unshift(rec)
    return rec
  },
  // 计算 Net = Σ(数量×单价)，VAT = 17%，Total = Net + VAT
  async calculate(id) {
    const v = db.vouchers.find((x) => x.id === id)
    if (!v) return null
    const net = (v.lineItems || []).reduce((s, li) => s + li.quantity * li.unitPrice, 0)
    v.net = net
    v.vat = Math.round(net * 0.17)
    v.total = v.net + v.vat
    return v
  },
  // 关联一张 Purchase Order：复制其行项目、vendor，并回填 formNo
  async linkForm(id) {
    const v = db.vouchers.find((x) => x.id === id)
    if (!v) return null
    const po = db.purchaseForms.find((f) => f.type === 'PurchaseOrder')
    if (!po) return null
    v.formNos = [po.formNo]
    v.formNo = po.formNo
    v.vendor = po.vendor
    v.lineItems = po.lineItems.map((li) => ({ ...li }))
    return v
  },
}
