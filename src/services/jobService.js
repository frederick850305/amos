// ============================================================
// Job Service —— 作业（Jobs）领域的数据访问 / 业务逻辑层
// ------------------------------------------------------------
// 与 componentService / stockWantedService 同构：视图层只调用本 service，
// 后续接真实后端时仅替换方法体（fetch/axios），方法签名保持不变。
//   * 读取方法同步返回（供 computed 派生，保持对 db 的响应式追踪）
//   * 写入方法异步（模拟后端事务）
// ============================================================

import { db, uid } from '../mock/index.js'

// 手册 P61-64：Component Jobs 上可被「链接 / 解除链接」到 Component Type Job 的字段
// （身份字段 jobNo / targetType / targetId 不参与链接）
// 含 General 原有字段 + Job Description 标签的 JD 级字段（jdCode / respDiscipline / outputFormat /
// historyTemplate / lastDone / window / totalDuration / totalCost / maintCriteria / class / trade）
export const LINKABLE_FIELDS = [
  'description', 'frequency', 'planningMethod', 'counterCode', 'measurePointCode', 'dueDate', 'active',
  'jdCode', 'jdRevision', 'jdTitle', 'respDiscipline', 'outputFormat', 'historyTemplate',
  'lastDone', 'window', 'totalDuration', 'totalCost', 'maintCriteria', 'class', 'trade',
]

// 由一条 ComponentType 作业生成 Component 级继承副本
function blankInheritedJob(typeJob, componentNumber) {
  return {
    id: uid('jb'),
    // 手册 P59-61：继承作业编号从「父类型作业号 @ 组件号」派生，确定性且可追溯来源，避免随机号碰撞
    jobNo: `${typeJob.jobNo}@${componentNumber}`,
    description: typeJob.description,
    targetType: 'Component',
    targetId: componentNumber,
    frequency: typeJob.frequency || '',
    planningMethod: typeJob.planningMethod || 'Periodic',
    counterCode: typeJob.counterCode || '',
    measurePointCode: typeJob.measurePointCode || '',
    dueDate: typeJob.dueDate || '',
    active: typeJob.active || 'Yes',
    // 手册 P60：Job Description 标签 —— JD 库查找结果 + JD 级计划 / 报告字段（继承时一并拷贝）
    jdCode: typeJob.jdCode || '',
    jdRevision: typeJob.jdRevision || '',
    jdTitle: typeJob.jdTitle || '',
    respDiscipline: typeJob.respDiscipline || '',
    outputFormat: typeJob.outputFormat || '',
    historyTemplate: typeJob.historyTemplate || '',
    lastDone: typeJob.lastDone || '',
    window: typeJob.window || 0,
    totalDuration: typeJob.totalDuration || 0,
    totalCost: typeJob.totalCost || 0,
    maintCriteria: typeJob.maintCriteria || '',
    class: typeJob.class || '',
    trade: typeJob.trade || '',
    attachments: [],
    status: typeJob.status || 'Planned',
    inheritedFrom: typeJob.jobNo,
    linkedFields: [...LINKABLE_FIELDS],
    relatedJobs: [],
    dependencies: [],
  }
}

export const jobService = {
  // ---- 读取 ----
  list() {
    return db.jobs
  },
  // 手册 2.2(13)：组件 / 部件类型关联作业（同时匹配 Component 与 ComponentType 两种 target）
  relatedJobs(componentNumber, componentTypeNumber) {
    if (!componentNumber && !componentTypeNumber) return []
    return db.jobs.filter(
      (j) =>
        (j.targetType === 'Component' && j.targetId === componentNumber) ||
        (j.targetType === 'ComponentType' && j.targetId === componentTypeNumber),
    )
  },
  // 手册 2：某部件类型关联的作业数（Component Types 列表 Jobs 列动态计算）
  countForComponentType(typeNumber) {
    return db.jobs.filter((j) => j.targetType === 'ComponentType' && j.targetId === typeNumber).length
  },

  // 某组件当前的组件级作业（targetType === 'Component'）
  getComponentJobs(componentNumber) {
    return db.jobs.filter((j) => j.targetType === 'Component' && j.targetId === componentNumber)
  },

  // 手册 P60：Details → see the job description for the selected job
  // 由作业的 jdCode 反查 Job Description 主数据（只读展示用）
  getJobDescription(code) {
    if (!code) return null
    return db.jobDescriptions.find((j) => j.code === code) || null
  },

  // 手册 P59：组件基于组件类型可继承已定义的 TypeJobs。
  // 注册组件时，为所选类型下每条 ComponentType 作业生成一条 Component 级副本（带 inheritedFrom 与 linkedFields）。
  inheritTypeJobs(typeNumber, componentNumber) {
    const typeJobs = db.jobs.filter((j) => j.targetType === 'ComponentType' && j.targetId === typeNumber)
    const inherited = new Set(
      db.jobs
        .filter((j) => j.targetType === 'Component' && j.targetId === componentNumber)
        .map((j) => j.inheritedFrom),
    )
    typeJobs.forEach((tj) => {
      if (inherited.has(tj.jobNo)) return // 已继承则跳过
      db.jobs.push(blankInheritedJob(tj, componentNumber))
    })
  },

  // 手册 P57-58：保存组件类型作业时，可选项将其应用到该类型的全部现有组件。
  // 为每条现有组件刷新（先删旧副本再建新副本）一条 Component 级继承作业。
  applyTypeJobToAll(typeJob) {
    const comps = db.components.filter((c) => c.typeNumber === typeJob.targetId)
    comps.forEach((c) => {
      const i = db.jobs.findIndex(
        (j) => j.targetType === 'Component' && j.targetId === c.number && j.inheritedFrom === typeJob.jobNo,
      )
      if (i >= 0) db.jobs.splice(i, 1)
      db.jobs.push(blankInheritedJob(typeJob, c.number))
    })
    return comps.length
  },

  // 手册 P61-64：类型作业保存并「反映到组件作业」时，仅把「已链接」字段的值同步到继承作业。
  propagateToInherited(typeJob) {
    db.jobs
      .filter((j) => j.inheritedFrom === typeJob.jobNo)
      .forEach((cj) => {
        ;(cj.linkedFields || []).forEach((f) => {
          if (LINKABLE_FIELDS.includes(f)) cj[f] = typeJob[f]
        })
      })
  },

  // 手册 P61：删除组件类型作业 → 级联删除所有继承它的组件作业（无论字段是否链接）。
  remove(jobNo) {
    const job = db.jobs.find((j) => j.jobNo === jobNo)
    if (!job) return false
    if (job.targetType === 'ComponentType') {
      for (let i = db.jobs.length - 1; i >= 0; i--) {
        if (db.jobs[i].inheritedFrom === jobNo) db.jobs.splice(i, 1)
      }
    }
    const idx = db.jobs.findIndex((j) => j.jobNo === jobNo)
    if (idx >= 0) db.jobs.splice(idx, 1)
    return true
  },

  // 手册 P63-64：Options > Link All to Type / Remove All Links to Type / Copy Link from Selected
  // 操作对象为某组件下的全部继承作业（Component 级、targetId === componentNumber）。
  linkAll(componentNumber) {
    this.getComponentJobs(componentNumber).forEach((j) => { j.linkedFields = [...LINKABLE_FIELDS] })
  },
  removeAllLinks(componentNumber) {
    this.getComponentJobs(componentNumber).forEach((j) => { j.linkedFields = [] })
  },
  copyLink(fromJobNo) {
    const from = db.jobs.find((j) => j.jobNo === fromJobNo)
    if (!from) return
    this.getComponentJobs(from.targetId)
      .filter((j) => j.jobNo !== fromJobNo)
      .forEach((j) => { j.linkedFields = [...(from.linkedFields || [])] })
  },

  // 手册 P64-65：Related Jobs —— 把另一条作业关联到当前作业（形成可一起上报的层级）。
  addRelatedJob(jobNo, relatedJobNo) {
    const j = db.jobs.find((x) => x.jobNo === jobNo)
    if (!j || jobNo === relatedJobNo) return false
    j.relatedJobs = j.relatedJobs || []
    if (!j.relatedJobs.includes(relatedJobNo)) j.relatedJobs.push(relatedJobNo)
    return true
  },

  // 手册 P65-68：Job Dependencies —— 在当前作业（Dependant）的依赖标签中加入一条 Depending 作业。
  // 校验：Counter 作业不可入链；同一条链内作业须频率与计划方法一致。
  addDependency(jobNo, depJobNo) {
    const j = db.jobs.find((x) => x.jobNo === jobNo) // Dependant Job
    const dep = db.jobs.find((x) => x.jobNo === depJobNo) // Depending Job
    if (!j || !dep || jobNo === depJobNo) return { ok: false, reason: 'notfound' }
    if (dep.planningMethod === 'Counter') return { ok: false, reason: 'counter' }
    if (j.planningMethod !== dep.planningMethod || j.frequency !== dep.frequency) {
      return { ok: false, reason: 'mismatch' }
    }
    j.dependencies = j.dependencies || []
    if (!j.dependencies.includes(depJobNo)) j.dependencies.push(depJobNo)
    return { ok: true }
  },

  // ---- 写入 ----
  async create({ description, targetType, targetId, frequency = 'Monthly', planningMethod = 'Periodic', status = 'Planned', requiredDisciplines = [], requiredParts = [], counterCode = '', measurePointCode = '', active = 'Yes', jdCode = '', jdRevision = '', jdTitle = '', respDiscipline = '', outputFormat = '', historyTemplate = '', lastDone = '', window = 0, totalDuration = 0, totalCost = 0, maintCriteria = '', class: jobClass = '', trade = '' }) {
    const job = {
      id: uid('jb'),
      jobNo: 'J-' + Math.floor(Math.random() * 90000 + 10000),
      description,
      targetType,
      targetId,
      frequency,
      planningMethod,
      counterCode,
      measurePointCode,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      active,
      // 手册 P60：Job Description 标签字段
      jdCode,
      jdRevision,
      jdTitle,
      respDiscipline,
      outputFormat,
      historyTemplate,
      lastDone,
      window,
      totalDuration,
      totalCost,
      maintCriteria,
      class: jobClass,
      trade,
      attachments: [],
      requiredDisciplines,
      requiredParts,
      status,
      // 手册 P61-64：继承作业携带 inheritedFrom / linkedFields；普通作业留空（继承由 inheritTypeJobs 构造）
      inheritedFrom: '',
      linkedFields: [],
      relatedJobs: [],
      dependencies: [],
    }
    db.jobs.push(job)
    return job
  },
}
