// useJobTab.js —— 可复用的 Jobs 标签逻辑
// 同时供 ComponentsView（Component 级作业）与 ComponentTypesView（ComponentType 级作业）使用。
//
// 用法：
//   const {
//     relJobs, selectedJob, jobDetailsOpen, jobDetailsJD, jobDetailsJobNo,
//     newJob, viewJob, deleteJob, detailsJob,
//     jobDetailsTemplate,  // <Teleport> 包裹的 JD 弹窗模板（在父组件 <template> 中使用）
//   } = useJobTab({
//     targetType: 'Component',          // 'Component' | 'ComponentType'
//     getTargetId: () => selected.value?.number,
//     getWindowKey: () => 'component-jobs',  // New/View 打开的窗口 key
//     getDescriptionHint: () => (selected.value?.name || selected.value?.number || '') + ' — 维护作业',
//   })

import { ref, computed, watch } from 'vue'
import { jobService } from '../services/jobService.js'
import { store, openWindow, showToast, setPresetFilter } from '../store.js'

export function useJobTab({ targetType, getTargetId, getWindowKey, getDescriptionHint }) {

  // ---- 数据 ----

  const relJobs = computed(() => {
    const targetId = getTargetId()
    if (!targetId) return []
    if (targetType === 'Component') return jobService.getComponentJobs(targetId)
    // ComponentType：直接过滤 targetType + targetId
    return jobService.list().filter((j) => j.targetType === targetType && j.targetId === targetId)
  })

  const selectedJob = ref(null)

  // 父级选中记录变化时清空选中作业，避免跨记录误操作
  watch(getTargetId, () => { selectedJob.value = null })

  // ---- JD Details 弹窗状态 ----

  const jobDetailsOpen = ref(false)
  const jobDetailsJD = ref(null)
  const jobDetailsJobNo = ref('')

  // ---- 操作 ----

  /** View → 打开对应作业窗口并定位 */
  function viewJob(j) {
    if (!j) return
    setPresetFilter({ _focusJobNo: j.jobNo })
    openWindow(getWindowKey())
  }

  /** Details → 本窗口内只读展示该作业的 Job Description */
  function detailsJob(j) {
    if (!j) return
    const jd = jobService.getJobDescription(j.jdCode)
    if (!jd) { showToast(`作业 ${j.jobNo} 未关联 Job Description（jdCode 为空），无法查看 JD 内容`, 'warn'); return }
    jobDetailsJD.value = jd
    jobDetailsJobNo.value = j.jobNo
    jobDetailsOpen.value = true
  }

  /** Delete → 删除作业（类型作业级联删除继承副本） */
  function deleteJob(j) {
    if (!j) return
    if (!confirm(`确认删除作业 ${j.jobNo}（${j.jdTitle || j.description}）？`)) return
    jobService.remove(j.jobNo)
    if (selectedJob.value && selectedJob.value.id === j.id) selectedJob.value = null
    showToast('已删除作业：' + j.jobNo, 'ok')
  }

  /** New → 创建新作业并跳转到作业窗口（落在 Job Description 标签） */
  async function newJob() {
    const targetId = getTargetId()
    if (!targetId) return showToast(`请先选择${targetType === 'Component' ? '组件' : '组件类型'}`, 'warn')
    const job = await jobService.create({
      description: getDescriptionHint(),
      targetType,
      targetId,
    })
    setPresetFilter({ _focusJobNo: job.jobNo, _focusTab: 'jobDescription' })
    openWindow(getWindowKey())
  }

  // ---- JD 弹窗渲染函数（返回 VNode 或在模板中通过作用域使用）----
  // 注意：由于 composable 不直接渲染模板，这里只提供状态；
  // 实际的 <template #extra-jobs> 内容由各 View 组件自行编写（或抽取为 JobTabPanel.vue 子组件）。

  return {
    relJobs,
    selectedJob,
    jobDetailsOpen,
    jobDetailsJD,
    jobDetailsJobNo,
    newJob,
    viewJob,
    deleteJob,
    detailsJob,
  }
}
