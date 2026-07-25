// ============================================================
// Purchase Form Service —— 采购单（Requisition / Query / Purchase Order）领域的数据访问 / 业务逻辑层
// ------------------------------------------------------------
// 与 componentService 同构：视图层只调用本 service，后续接真实后端时
// 仅替换方法体（fetch/axios），方法签名保持不变。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
//   * 写入方法异步（模拟后端事务）
// ============================================================

import { db, uid } from '../mock/index.js'

// 手册 4：Form 转换流 Requisition → Query → Purchase Order
const FORM_CONVERSION = { Requisition: 'Query', Query: 'PurchaseOrder', PurchaseOrder: 'PurchaseOrder' }

export const purchaseFormService = {
  // ---- 读取 ----
  list() {
    return db.purchaseForms
  },
  get(id) {
    return db.purchaseForms.find((f) => f.id === id) || null
  },
  // Apply Contract 下拉数据源
  contracts() {
    return db.contracts
  },
  // Quotation Comparison 窗口读取报价数据
  quotations() {
    return db.quotations
  },
  // Dashboard KPI：待处理的申请单数（Requisition 且未归档）
  openRequisitionCount() {
    return db.purchaseForms.filter((f) => f.type === 'Requisition' && f.status !== 'Filed').length
  },

  // ---- 写入 ----
  async create(data = {}) {
    const form = {
      id: uid('pf'),
      formNo: data.formNo || 'REQ-' + Math.floor(Math.random() * 9000 + 1000),
      type: data.type || 'Requisition',
      status: data.status || 'Draft',
      vendor: data.vendor || '',
      deliveryLocation: data.deliveryLocation || 'ER-Store-A',
      contract: data.contract || '',
      createdDate: data.createdDate || new Date().toISOString().slice(0, 10),
      lineItems: data.lineItems || [],
      total: data.total || 0,
    }
    db.purchaseForms.unshift(form)
    return form
  },
  // 手册 4：Requisition→Query 为已发出的询价（Issued）；Query→Purchase Order 为新生成的采购单（Draft，待审批）
  async convert(id) {
    const f = db.purchaseForms.find((x) => x.id === id)
    if (!f) return null
    const next = FORM_CONVERSION[f.type]
    if (next === f.type) return f // 已是最终形态
    f.type = next
    f.status = next === 'Query' ? 'Issued' : 'Draft'
    return f
  },
  // 应用合同（不传 contractNo 时默认取第一份合同）
  async applyContract(id, contractNo) {
    const f = db.purchaseForms.find((x) => x.id === id)
    if (!f) return null
    f.contract = contractNo || db.contracts[0]?.contractNo || ''
    return f
  },
  // 手册 4：Quotation Comparison 选定报价方案后，由 Query 生成采购单（Query → Purchase Order）
  async createPOFromQuery(formNo, vendor, unitPrice) {
    const form = db.purchaseForms.find((f) => f.formNo === formNo)
    if (!form) return null
    const no = 'PO-' + Math.floor(Math.random() * 9000 + 1000)
    const po = {
      id: uid('pf'),
      formNo: no,
      type: 'PurchaseOrder',
      status: 'Draft',
      vendor: vendor || form.vendor,
      deliveryLocation: form.deliveryLocation,
      contract: form.contract,
      createdDate: new Date().toISOString().slice(0, 10),
      lineItems: (form.lineItems || []).map((li) => ({ ...li, unitPrice: unitPrice || li.unitPrice })),
      total: 0,
    }
    db.purchaseForms.unshift(po)
    return po
  },
}
