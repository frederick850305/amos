// 共享过滤器匹配工具
// 支持 AMOS 风格的通配：%Drill = 包含，Drill% = 开头，%Drill% = 包含
// 无 % 的纯文本按“包含”匹配（更贴合原型体验）。

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// cell: 单元格文本；q: 查询字符串（可能含 %）
function likeMatch(cell, q) {
  const segs = q.split('%').map((s) => s.trim()).filter(Boolean)
  if (!segs.length) return true
  // 用 .* 连接各段，实现“开头/结尾/包含”语义
  const body = segs.map((s) => escapeRegExp(s)).join('.*')
  const starts = q.startsWith('%')
  const ends = q.endsWith('%')
  let re = '^'
  if (!starts) re += body + (ends ? '$' : '.*$')
  else re += '.*' + body + (ends ? '$' : '.*$')
  return new RegExp(re, 'i').test(cell)
}

// row: 数据行；fields: 过滤器字段定义；criteria: 用户输入
export function matchRow(row, fields, criteria) {
  return fields.every((f) => {
    const v = criteria[f.key]
    if (v == null || v === '') return true
    const cell = String(row[f.key] ?? '').toLowerCase()
    const q = String(v).toLowerCase()
    if (q.includes('%')) return likeMatch(cell, q)
    return cell.includes(q)
  })
}

// 计划时间判定（用于 Work Orders 的 Planning 过滤）
export function matchPlanning(row, planning) {
  if (!planning) return true
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = row.dueDate ? new Date(row.dueDate) : null
  if (!due) return planning === 'Due Now' || planning === 'Overdue' ? false : true
  const dayMs = 86400000
  const startOfWeek = new Date(today)
  const dow = (today.getDay() + 6) % 7 // 周一为 0
  startOfWeek.setDate(today.getDate() - dow)
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * dayMs)
  const nextWeekEnd = new Date(endOfWeek.getTime() + 7 * dayMs)

  switch (planning) {
    case 'Due Now':
      return due <= today && row.status !== 'Completed'
    case 'Overdue':
      return due < today && row.status !== 'Completed'
    case 'Due This Week':
      return due >= today && due <= endOfWeek && row.status !== 'Completed'
    case 'Due Next Week':
      return due > endOfWeek && due <= nextWeekEnd && row.status !== 'Completed'
    default:
      return true
  }
}
