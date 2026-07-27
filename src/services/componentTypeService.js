// ============================================================
// Component Type Service —— 接入 amos-server 后端
// 端点：/api/maintenance/component-types
// ------------------------------------------------------------
// 视图层（ComponentTypesView）只调用本 service，不直接操作 mock。
//
// 为兼容既有「同步绑定」用法（列表 computed、lookups.componentTypes 读
// db.componentTypes），本 service 复用 db.componentTypes 作为响应式缓存：
//   * loadAll()   从后端拉取并原地替换 db.componentTypes 内容；
//   * create/update/remove 调后端并同步刷新 db.componentTypes；
//   * listComponentTypes() 仍同步返回 db.componentTypes（与旧签名一致）。
//
// 字段契约（与后端 ComponentTypeDto 对齐）：
//   后端 relatedTypes 用 relatedTypeNumber / relatedComponentTypeId；
//   前端子表 related 标签的列 key 为 typeNumber，故适配器双向映射。
//   后端 stockTypeLinks 用 stockTypeId / stockTypeNo；
//   前端 Parts 用 parts[{stockTypeNo, alternativeNo, name, makersRef}]。
// ============================================================

import { db } from '../mock/index.js'
import { apiFetch } from './api.js'

const BASE = '/maintenance/component-types'

// 后端 DTO → 前端 viewModel
function fromDto(d) {
  if (!d) return null
  return {
    id: d.id,
    typeNumber: d.typeNumber || '',
    name: d.name || '',
    maker: d.maker || '',
    model: d.model || '',
    type: d.type || '',
    classCode: d.classCode || '',
    preferredVendor: d.preferredVendor || '',
    parentTypeNumber: d.parentTypeNumber || '',
    compTypeModel: d.compTypeModel || '',
    description: d.description || '',
    status: d.status || 'Active',
    dateCreated: d.dateCreated || '',
    dateModified: d.dateModified || '',
    counters: (d.counters || []).map((c) => ({
      id: c.id, code: c.code || '', description: c.description || '',
      unit: c.unit || '', sortOrder: c.sortOrder || 0,
    })),
    measurePointDefs: (d.measurePointDefs || []).map((m) => ({
      id: m.id, code: m.code || '', description: m.description || '',
      trend: m.trend || 'Stable', unit: m.unit || '', sortOrder: m.sortOrder || 0,
    })),
    // 子表 related 标签列 key=typeNumber；回显时映射 relatedTypeNumber→typeNumber
    relatedTypes: (d.relatedTypes || []).map((r) => ({
      id: r.id, typeNumber: r.relatedTypeNumber || '', name: r.relatedTypeName || '',
    })),
    // Parts 标签：stockTypeLinks→parts
    parts: (d.stockTypeLinks || []).map((s) => ({
      id: s.id, stockTypeNo: s.stockTypeNo || '', alternativeNo: s.alternativeNo || '',
      name: s.description || '', makersRef: s.makersRef || '',
    })),
  }
}

// 前端 viewModel → 后端 DTO
// 注意：草稿 id 形如 'ct_1700000000'（字符串），后端 ComponentTypeDto.id 是 Long，
// 若直接发送会触发 Jackson「JSON parse error」。因此 id 仅在为数字（已落库）时发送，
// 新建场景省略 id 字段（JSON.stringify 会丢弃 undefined），由后端自动生成。
function toDto(vm) {
  if (!vm) return null
  const numId = (v) => (typeof v === 'number' ? v : undefined)
  return {
    id: numId(vm.id),
    typeNumber: vm.typeNumber || null,
    name: vm.name || null,
    maker: vm.maker || null,
    model: vm.model || null,
    type: vm.type || null,
    classCode: vm.classCode || null,
    preferredVendor: vm.preferredVendor || null,
    parentTypeNumber: vm.parentTypeNumber || null,
    compTypeModel: vm.compTypeModel || null,
    description: vm.description || null,
    status: vm.status || 'Active',
    dateCreated: vm.dateCreated || null,
    dateModified: vm.dateModified || null,
    counters: (vm.counters || []).map((c) => ({
      id: numId(c.id), code: c.code, description: c.description, unit: c.unit, sortOrder: c.sortOrder || 0,
    })),
    measurePointDefs: (vm.measurePointDefs || []).map((m) => ({
      id: numId(m.id), code: m.code, description: m.description, trend: m.trend, unit: m.unit, sortOrder: m.sortOrder || 0,
    })),
    // typeNumber→relatedTypeNumber（后端按业务键解析；子行 id 仅在编辑已存在行时复用）
    relatedTypes: (vm.relatedTypes || []).map((r) => ({
      id: numId(r.id), relatedTypeNumber: r.typeNumber || null,
    })),
    // stockTypeNo + alternativeNo + makersRef（后端按 stockTypeNo 解析）
    stockTypeLinks: (vm.parts || []).map((p) => ({
      id: numId(p.id), stockTypeNo: p.stockTypeNo || null,
      alternativeNo: p.alternativeNo || '', makersRef: p.makersRef || '',
    })),
  }
}

export const componentTypeService = {
  // 同步读取（保持对 db.componentTypes 的响应式追踪）
  listComponentTypes() {
    return db.componentTypes
  },

  // 从后端加载全部，原地替换 db.componentTypes 内容
  async loadAll() {
    const list = await apiFetch(BASE)
    db.componentTypes.length = 0
    ;(list || []).map(fromDto).forEach((r) => db.componentTypes.push(r))
    return db.componentTypes.slice()
  },

  // 按 id 拉取单个（GET /{id}）
  async get(id) {
    const d = await apiFetch(`${BASE}/${id}`)
    return fromDto(d)
  },

  // 创建 → 返回适配后的 viewModel
  async create(vm) {
    const created = await apiFetch(BASE, { method: 'POST', body: toDto(vm) })
    const rec = fromDto(created)
    db.componentTypes.push(rec)
    return rec
  },

  // 更新（按 id 复用子行）
  async update(id, vm) {
    const updated = await apiFetch(`${BASE}/${id}`, { method: 'PUT', body: toDto(vm) })
    const rec = fromDto(updated)
    const i = db.componentTypes.findIndex((r) => String(r.id) === String(id))
    if (i >= 0) db.componentTypes[i] = rec
    else db.componentTypes.push(rec)
    return rec
  },

  // 删除
  async remove(id) {
    await apiFetch(`${BASE}/${id}`, { method: 'DELETE' })
    const i = db.componentTypes.findIndex((r) => String(r.id) === String(id))
    if (i >= 0) db.componentTypes.splice(i, 1)
  },

  // Register as Component：返回 Component（由视图 seed 进 Components 列表）
  async registerComponent(id, req) {
    return apiFetch(`${BASE}/${id}/register-component`, { method: 'POST', body: req })
  },
}
