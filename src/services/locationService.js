import { db, uid } from '../mock/index.js'

// 手册 Working with Functions：Location 作为编码 + 描述的主数据，供各窗口 lookup 使用。
// 提供列表、按编码查询与新增；新增后各 lookup（New Location / Function Location 等）自动刷新。
export const locationService = {
  list() {
    return db.locations
  },
  findByCode(code) {
    return db.locations.find((l) => l.code === code) || null
  },
  // 新增 Location 主数据；code 必填且唯一，description 可选（缺省等于 code）。
  create({ code, description = '' } = {}) {
    const c = (code || '').trim()
    if (!c) return { ok: false, error: 'Location 编码不能为空' }
    if (db.locations.some((l) => l.code === c)) return { ok: false, error: `Location "${c}" 已存在` }
    const rec = { id: uid('loc'), code: c, description: (description || '').trim() || c }
    db.locations.push(rec)
    return { ok: true, record: rec }
  },
}
