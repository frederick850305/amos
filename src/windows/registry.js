// 通用业务窗口配置注册表（驱动 BusinessWindow.vue）
// 非专用页面均通过此配置渲染 Filter + 列表 + 明细标签页。

import { lookups } from '../mock/index.js'

const noteTab = (id, label, text) => ({ id, label, fields: [{ key: '_note', label: '说明', type: 'readonly', value: text }] })

export const windowRegistry = {
  'component-types': {
    windowKey: 'component-types',
    windowTitle: 'Component Types',
    dataKey: 'componentTypes',
    statusField: 'status',
    statusOptions: ['Active', 'Obsolete', 'Blocked'],
    filterBasic: [
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Obsolete', 'Blocked'] },
      { key: 'maker', label: 'Maker', type: 'text' },
      { key: 'classCode', label: 'Class', type: 'text' },
    ],
    filterAdvanced: [
      { key: 'typeNumber', label: 'Type Number', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
    ],
    columns: [
      { key: 'typeNumber', label: 'Type Number', width: '130px' },
      { key: 'name', label: 'Name' },
      { key: 'maker', label: 'Maker', width: '110px' },
      { key: 'classCode', label: 'Class', width: '80px' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
      { key: 'jobs', label: 'Jobs', align: 'right', width: '70px' },
    ],
    detailTabs: [
      {
        id: 'general', label: 'General', fields: [
          { key: 'typeNumber', label: 'Type Number' },
          { key: 'name', label: 'Name' },
          { key: 'maker', label: 'Maker' },
          { key: 'model', label: 'Model' },
          { key: 'type', label: 'Type' },
          { key: 'classCode', label: 'Component Class' },
          { key: 'preferredVendor', label: 'Preferred Vendor', type: 'select', options: ['', ...lookups.vendors()] },
          { key: 'parentTypeNumber', label: 'Parent Component Type', type: 'lookup', lookupKey: 'componentTypes' },
          { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Obsolete', 'Blocked'] },
          // 手册 P36 截图：General 标签末尾 — Component Class 旁的 Comp Type Model 文本框
          { key: 'compTypeModel', label: 'Comp Type Model' },
        ],
      },
      // 手册 2 / P37：Jobs tab 的 New/View 打开 Component Type Jobs（这里直接维护指向该类型的作业）
      {
        id: 'jobs', label: 'Jobs', type: 'subgrid',
        subSource: { dbKey: 'jobs', filterKey: 'targetId', filterModelKey: 'typeNumber' },
        newDefaults: { targetType: 'ComponentType', jobNo: '', description: '', frequency: '', planningMethod: 'Periodic', dueDate: '', status: 'Open', requiredDisciplines: [], requiredParts: [] },
        columns: [
          { key: 'jobNo', label: 'Job No.', width: '100px', default: '' },
          { key: 'description', label: 'Description', default: '' },
          { key: 'frequency', label: 'Frequency', width: '90px', default: '' },
          { key: 'planningMethod', label: 'Method', type: 'select', width: '100px', options: ['Periodic', 'Counter', 'MeasurePoint', 'Trigger'], default: 'Periodic' },
        ],
      },
      // 手册 P38：Parts 双表布局（对照手册截图）
      // 上部（红框）：Parts 列表（Item No. / Name / Makers Ref.）
      // 下部（绿框）：Stock Types 列表（Number / Name / Maker / Type）
      { id: 'parts', label: 'Parts', fields: [] },
      // 手册 2 / P39 / P44：Counters 标签（定义该类型组件的计数器模板，注册为组件时继承）
      // 注：Depends On 字段按手册 P44 仅出现在 Components 窗口的 Counters 标签，类型级不设置依赖
      {
        id: 'counters', label: 'Counters', type: 'subgrid', subKey: 'counters',
        columns: [
          { key: 'code', label: 'Counter Code', width: '120px', default: '' },
          { key: 'description', label: 'Description', default: '' },
          { key: 'unit', label: 'Unit', width: '70px', default: '' },
        ],
      },
      // 手册 2 / P39 / P45：Measure Points 标签（定义测点模板；注册组件时继承为可编辑子表）
      {
        id: 'measure_points', label: 'Measure Points', type: 'subgrid', subKey: 'measurePointDefs',
        columns: [
          { key: 'code', label: 'Point Code', width: '120px', default: '' },
          { key: 'description', label: 'Description', default: '' },
          { key: 'trend', label: 'Trend', type: 'select', width: '90px', options: ['Up', 'Down', 'Stable'], default: 'Stable' },
          { key: 'unit', label: 'Unit', width: '70px', default: '' },
        ],
      },
      // 手册 2 / P39：Related tab 关联组件类型（创建组件时相关类型及其备件会被继承）
      {
        id: 'related', label: 'Related', type: 'subgrid', subKey: 'relatedTypes',
        columns: [
          { key: 'typeNumber', label: 'Related Component Type', type: 'lookup', lookupKey: 'componentTypes', width: '170px', default: '' },
        ],
      },
      { id: 'components', label: 'Components', fields: [] },
    ],
    options: [
      { label: 'Register as Component', action: 'register-component' },
      { label: 'View Job', action: 'view-job' },
      { label: 'Add Part', action: 'add-part' },
      { label: 'Copy', action: 'copy-type' },
      { label: 'Copy List', action: 'copy-list' },
      { label: 'Use Component Types', action: 'toggle-use-types' },
    ],
  },

  functions: {
    windowTitle: 'Functions',
    dataKey: 'functions',
    // 手册 Fleet 场景：列表按船（Installation）分组显示
    groupBy: 'installation',
    statusField: 'status',
    statusOptions: ['In Use', 'Scrapped'],
    filterBasic: [
      { key: 'status', label: 'Status', type: 'select', options: ['In Use', 'Scrapped'] },
      { key: 'location', label: 'Location', type: 'lookup', lookupKey: 'locations' },
      // 手册 P44：一旦 criticality 在使用中，可按 degree 在 Functions 窗口过滤
      { key: 'criticality', label: 'Criticality', type: 'select', lookupKey: 'criticalities' },
    ],
    filterAdvanced: [{ key: 'functionNo', label: 'Function No.', type: 'text' }, { key: 'description', label: 'Description', type: 'text' }],
    columns: [
      { key: 'functionNo', label: 'Function No.', width: '130px' },
      { key: 'description', label: 'Description' },
      { key: 'parentFunctionNo', label: 'Parent', width: '120px' },
      { key: 'status', label: 'Status', width: '90px', tag: true },
      // 手册 P44：Criticality 列以颜色编码指示器显示（cell-criticality 插槽渲染）
      { key: 'criticality', label: 'Criticality', width: '110px', criticality: true },
      { key: 'installedComponentId', label: 'Installed', width: '110px' },
    ],
    // 手册 Working with Functions：General 标签字段与截图示例一致
    detailTabs: [
      {
        id: 'general', label: 'General', fields: [
          { key: 'functionNo', label: 'Function No.' },
          { key: 'description', label: 'Description' },
          { key: 'reference', label: 'Reference' },
          { key: 'parentFunctionNo', label: 'Parent Function', type: 'lookup-with-name', lookupKey: 'functions' },
          // 手册 2 / P38-39：状态为指示性，修改统一走 Options > Change Status 对话框
          { key: 'status', label: 'Status', type: 'readonly' },
          { key: 'location', label: 'Location', type: 'lookup', lookupKey: 'locations' },
          // 手册 P44-46：Criticality 下拉选项来自 FunctionCriticality 注册表
          { key: 'criticality', label: 'Criticality', type: 'select', lookupKey: 'criticalities' },
          { key: 'installedComponentId', label: 'Component Performing the Function', type: 'component-performing' },
        ],
      },
      // 手册 Working with Functions：Details 标签
      {
        id: 'details', label: 'Details', fields: [
          { key: 'sfiCode', label: 'SFI Code' },
          { key: 'system', label: 'System' },
          { key: 'subSystem', label: 'Sub System' },
          { key: 'remarks', label: 'Remarks', type: 'textarea' },
        ],
      },
      // 手册 Working with Functions：Additional Info 标签
      {
        id: 'additional', label: 'Additional Info', fields: [
          { key: 'serialNo', label: 'Serial No.' },
          { key: 'maker', label: 'Maker' },
          { key: 'model', label: 'Model' },
          { key: 'tagNo', label: 'Tag No.' },
        ],
      },
      // 手册 Working with Functions：Financial Info 标签
      {
        id: 'financial', label: 'Financial Info', fields: [
          { key: 'assetValue', label: 'Asset Value', type: 'number' },
          { key: 'acquisitionDate', label: 'Acquisition Date', type: 'date' },
          { key: 'currency', label: 'Currency' },
          { key: 'depreciation', label: 'Depreciation', type: 'number' },
        ],
      },
      // 手册 Working with Functions：Counters 标签（功能位置计数器定义，可维护）
      {
        id: 'counters', label: 'Counters', type: 'subgrid', subKey: 'functionCounters',
        columns: [
          { key: 'code', label: 'Counter Code', width: '120px', default: '' },
          { key: 'description', label: 'Description', default: '' },
          { key: 'unit', label: 'Unit', width: '70px', default: '' },
          { key: 'lastValue', label: 'Last Reading', type: 'number', width: '110px', default: 0 },
        ],
      },
      // 手册 Working with Functions：Rotation Log 标签（组件安装 / 拆卸历史，只读）
      // 手册 P40：选择一行并点击 Notes 按钮可查看安装 / 拆卸时登记的 Details 评论
      {
        id: 'rotation', label: 'Rotation Log', type: 'rotation-log', sourceKey: 'rotationLog',
        subActions: [{ id: 'notes', label: 'Notes' }],
        columns: [
          { key: 'componentNo', label: 'Component No.', width: '120px' },
          { key: 'componentName', label: 'Component Name', width: '180px' },
          { key: 'installedAt', label: 'Installed', width: '110px' },
          { key: 'installedBy', label: 'Installed By', width: '120px' },
          { key: 'removedAt', label: 'Removed', width: '110px' },
          { key: 'removedBy', label: 'Removed By', width: '120px' },
        ],
      },
      // 手册 P40 step 5：只读的 Installed Component 标签，显示当前执行该功能位置的组件字段详情
      {
        id: 'installed', label: 'Installed Component', type: 'installed-component',
        fields: [
          { key: 'number', label: 'Component No.' },
          { key: 'name', label: 'Name' },
          { key: 'typeNumber', label: 'Type No.' },
          { key: 'status', label: 'Status' },
          { key: 'location', label: 'Location' },
          { key: 'maker', label: 'Maker' },
          { key: 'serialNo', label: 'Serial No.' },
        ],
      },
    ],
    options: [
      { label: 'Install Component', action: 'install-component' },
      { label: 'Remove Component', action: 'remove-component' },
      // 手册 2 / P38-39 Changing Function Status：Options > Change Status
      { label: 'Change Status', action: 'change-status' },
      // 手册 Copying Functions to Other Departments：Options > Copy Functions
      { label: 'Copy Functions', action: 'copy-functions' },
    ],
  },

  'component-type-jobs': {
    windowTitle: 'Component Type Jobs',
    dataKey: 'jobs',
    statusField: 'status',
    filterBasic: [{ key: 'targetType', label: 'Target', type: 'select', options: ['ComponentType', 'Component', 'Function'] }, { key: 'status', label: 'Status', type: 'text' }],
    filterAdvanced: [{ key: 'jobNo', label: 'Job No.', type: 'text' }, { key: 'description', label: 'Description', type: 'text' }],
    columns: [
      { key: 'jobNo', label: 'Job No.', width: '120px' },
      { key: 'description', label: 'Description' },
      { key: 'targetType', label: 'Target', width: '110px' },
      { key: 'frequency', label: 'Frequency', width: '100px' },
      { key: 'planningMethod', label: 'Method', width: '100px' },
      { key: 'dueDate', label: 'Due', width: '110px' },
    ],
    detailTabs: [
      {
        id: 'general', label: 'General', fields: [
          { key: 'jobNo', label: 'Job No.' },
          { key: 'targetType', label: 'Target Type', type: 'select', options: ['ComponentType', 'Component', 'Function'] },
          { key: 'targetId', label: 'Target', type: 'lookup', lookupKey: 'componentTypes' },
          // 手册 P44：Counters 必须先列在 component/type 上，才能在 jobs 中选用；此字段仅当 Planning Method = Counter 时出现
          { key: 'counterCode', label: 'Counter Code', type: 'lookup', lookupKey: 'componentTypeJobCounters', showIf: { key: 'planningMethod', value: 'Counter' }, placeholder: '仅可选本类型已列计数器' },
          // 手册 P45：Measure Points 必须先列在类型上，才能在 component type jobs 中选用；此字段仅当 Planning Method = MeasurePoint 时出现
          { key: 'measurePointCode', label: 'Measure Point', type: 'lookup', lookupKey: 'componentTypeJobMeasurePoints', showIf: { key: 'planningMethod', value: 'MeasurePoint' }, placeholder: '仅可选本类型已列测点' },
          { key: 'dueDate', label: 'Due Date', type: 'date' },
        ],
      },
      // 手册（截图 P51）：Job Specific Details —— 作业实例级配置（区别于 JD 模板内容）
      {
        id: 'jobSpecific', label: 'Job Specific Details', fields: [
          { key: 'class', label: 'Class', type: 'select', options: ['Class A', 'Class B', 'Class C', 'Unclassed'] },
          { key: 'trade', label: 'Trade', type: 'select', options: ['Mechanical', 'Electrical', 'Hydraulic', 'Welding', 'Survey'] },
          { key: 'requiredDisciplines', label: 'Required Disciplines', type: 'readonly', placeholder: '见 Disciplines 标签' },
          { key: 'requiredParts', label: 'Required Parts', type: 'readonly', placeholder: '见 Parts 标签' },
        ],
      },
      // 手册 P60 + 截图 P51：Job Description —— 查找 JD 库（Code/Revision/Title）+ JD 级计划 / 报告字段 + 内嵌 JD 库子表
      {
        id: 'jobDescription', label: 'Job Description', fields: [
          // 手册 P60：Look up a Job Description（三段式：Code / Revision / Title），选中后自动带出 Revision / Title
          { key: 'jdCode', label: 'Job Description', type: 'lookup', lookupKey: 'jobDescriptions', alsoFill: { revision: 'jdRevision', title: 'jdTitle' }, placeholder: '查找作业描述库…' },
          { key: 'jdRevision', label: 'Revision', readonly: true },
          { key: 'jdTitle', label: 'Title', readonly: true },
          // 手册 P69-81：周期频率（驱动 Next Due 计算）
          { key: 'frequency', label: 'Periodic Frequency' },
          // 手册 P147：负责工种（子承包时必填）
          { key: 'respDiscipline', label: 'Resp. Discipline', type: 'select', lookupKey: 'disciplines' },
          // 手册 P71：输出格式（Report Work 阶段作业描述呈现方式）
          { key: 'outputFormat', label: 'Output Format', type: 'select', options: ['Compact List', 'Full List', 'Step by Step'] },
          // 手册 P71：历史模板（MandatoryHistory 时可选，决定 Report Work 历史记录模板）
          { key: 'historyTemplate', label: 'History Template', type: 'select', lookupKey: 'historyTemplates' },
          // 手册 P60-61：Active 复选（决定作业是否纳入工单）
          { key: 'active', label: 'Active', type: 'select', options: ['Yes', 'No'], default: 'Yes' },
          // 手册 P59：Last Done 驱动 Next Due；改动触发重排（'AutomaticallyRescheduleWorkOrders'=TRUE）
          { key: 'lastDone', label: 'Last Done', type: 'date' },
          // 手册 P69-81：Window —— 到期日前后浮动窗口（天）
          { key: 'window', label: 'Window', type: 'number' },
          // 手册 P69-81：Planning Method（含 Variable → Estimates）
          { key: 'planningMethod', label: 'Planning Method', type: 'select', options: ['Periodic', 'Counter', 'MeasurePoint', 'Trigger', 'Variable'] },
          // 手册（截图 P51）：Variable 计划下的估算（Total Duration / Total Cost）
          { key: 'totalDuration', label: 'Total Duration', type: 'number', showIf: { key: 'planningMethod', value: 'Variable' } },
          { key: 'totalCost', label: 'Total Cost', type: 'number', showIf: { key: 'planningMethod', value: 'Variable' } },
          // 手册（截图 P51）：Maintenance Criteria
          { key: 'maintCriteria', label: 'Maint. Criteria', type: 'select', lookupKey: 'maintCriteria' },
        ],
        // 手册 P60：Job Description 标签内嵌 JD 库子表（Code / Revision / Title / Frequency / Window）—— 只读展示可用作业描述
        subgrid: {
          title: 'Available Job Descriptions',
          readonly: true,
          subSource: { dbKey: 'jobDescriptions' },
          columns: [
            { key: 'code', label: 'Code', readonly: true },
            { key: 'revision', label: 'Revision', readonly: true },
            { key: 'title', label: 'Title', readonly: true },
            { key: 'frequency', label: 'Frequency', readonly: true },
            { key: 'window', label: 'Window', readonly: true },
          ],
        },
      },
      // 手册（截图 P51）：JD Attachments —— 作业描述附件
      {
        id: 'jdAttachments', label: 'JD Attachments', type: 'subgrid', subKey: 'attachments',
        columns: [
          { key: 'fileName', label: 'File Name' },
          { key: 'description', label: 'Description' },
          { key: 'fileType', label: 'Type', type: 'select', options: ['PDF', 'Image', 'Drawing', 'Doc'] },
        ],
      },
      // 手册 P82：Counters —— 类型已登记计数器（仅当类型先列出计数器时才可选）
      {
        id: 'counters', label: 'Counters', type: 'counter-list',
        columns: [
          { key: 'code', label: 'Code' },
          { key: 'description', label: 'Description' },
          { key: 'unit', label: 'Unit' },
          { key: 'currentValue', label: 'Current Value' },
        ],
      },
      noteTab('scheduling', 'Scheduling', '调度触发条件（周期 / 计数器 / 测点）。'),
      noteTab('parts', 'Parts', '所需备件（手册 P73：Required Parts）。'),
      noteTab('disciplines', 'Disciplines', '所需工种（手册 P147：Resp. Discipline）。'),
      // 手册 P62：Component / Type Jobs 的 Risk Management（激活风险 + 场景 / 类型）
      {
        id: 'risk', label: 'Risk Management', fields: [
          { key: 'riskActive', label: 'Active', type: 'select', options: ['Yes', 'No'], default: 'No' },
          { key: 'riskScenario', label: 'Scenario' },
          { key: 'riskType', label: 'Type' },
        ],
      },
      noteTab('reporting', 'Reporting Options', '上报要求。'),
      // 手册 P64-65：Related Jobs —— 关联相似作业形成可一起上报的层级
      { id: 'related', label: 'Related Jobs', type: 'subgrid', subKey: 'relatedJobs',
        columns: [{ key: 'jobNo', label: 'Related Job', type: 'lookup', lookupKey: 'jobsForType', placeholder: '选择关联作业' }] },
      // 手册 P65-68：Job Dependencies —— 依赖链（Depending 作业；Counter 作业不可入链、同链须同频率 / 方法）
      { id: 'dependency', label: 'Dependency', type: 'subgrid', subKey: 'dependencies',
        columns: [{ key: 'jobNo', label: 'Depending Job', type: 'lookup', lookupKey: 'jobsForType', placeholder: '选择依赖作业' }] },
    ],
    options: [{ label: 'Spare Booking', action: 'spare-booking' }],
  },

  'component-jobs': {
    windowTitle: 'Component Jobs',
    dataKey: 'jobs',
    statusField: 'status',
    filterBasic: [{ key: 'targetType', label: 'Target', type: 'select', options: ['Component', 'ComponentType', 'Function'] }],
    filterAdvanced: [{ key: 'jobNo', label: 'Job No.', type: 'text' }],
    columns: [
      { key: 'jobNo', label: 'Job No.', width: '120px' },
      { key: 'description', label: 'Description' },
      { key: 'targetType', label: 'Target', width: '110px' },
      // 手册 P59-61：继承自组件类型作业的来源 Job No.（空则为组件自建作业）
      { key: 'inheritedFrom', label: 'Inherited From', width: '130px' },
      { key: 'frequency', label: 'Frequency', width: '100px' },
      { key: 'dueDate', label: 'Due', width: '110px' },
    ],
    detailTabs: [
      {
        id: 'general', label: 'General', fields: [
          { key: 'jobNo', label: 'Job No.' },
          { key: 'targetId', label: 'Component', type: 'lookup', lookupKey: 'components' },
          // 手册 P59-61：只读展示继承来源（继承自哪条组件类型作业）
          { key: 'inheritedFrom', label: 'Inherited From (Type Job)', readonly: true, showIf: { key: 'inheritedFrom', truthy: true } },
          // 手册 P44：Counters 必须先列在组件上，才能在 component jobs 中选用；此字段仅当 Planning Method = Counter 时出现
          { key: 'counterCode', label: 'Counter Code', type: 'lookup', lookupKey: 'componentJobCounters', showIf: { key: 'planningMethod', value: 'Counter' }, placeholder: '仅可选本组件已列计数器' },
          // 手册 P45：Measure Points 必须先列在组件上，才能在 component jobs 中选用；此字段仅当 Planning Method = MeasurePoint 时出现
          { key: 'measurePointCode', label: 'Measure Point', type: 'lookup', lookupKey: 'componentJobMeasurePoints', showIf: { key: 'planningMethod', value: 'MeasurePoint' }, placeholder: '仅可选本组件已列测点' },
          { key: 'dueDate', label: 'Due Date', type: 'date' },
        ],
      },
      // 手册（截图 P51）：Job Specific Details —— 作业实例级配置（区别于 JD 模板内容）
      {
        id: 'jobSpecific', label: 'Job Specific Details', fields: [
          { key: 'class', label: 'Class', type: 'select', options: ['Class A', 'Class B', 'Class C', 'Unclassed'] },
          { key: 'trade', label: 'Trade', type: 'select', options: ['Mechanical', 'Electrical', 'Hydraulic', 'Welding', 'Survey'] },
          // 手册 P73：Required Parts / 手册 P147：Required Disciplines —— 只读汇总，详细见 Parts / Disciplines 标签
          { key: 'requiredDisciplines', label: 'Required Disciplines', type: 'readonly', placeholder: '见 Disciplines 标签' },
          { key: 'requiredParts', label: 'Required Parts', type: 'readonly', placeholder: '见 Parts 标签' },
        ],
      },
      // 手册 P60 + 截图 P51：Job Description —— 查找 JD 库（Code/Revision/Title）+ JD 级计划 / 报告字段 + 内嵌 JD 库子表
      {
        id: 'jobDescription', label: 'Job Description', fields: [
          // 手册 P60：Look up a Job Description（三段式：Code / Revision / Title），选中后自动带出 Revision / Title
          { key: 'jdCode', label: 'Job Description', type: 'lookup', lookupKey: 'jobDescriptions', alsoFill: { revision: 'jdRevision', title: 'jdTitle' }, placeholder: '查找作业描述库…' },
          { key: 'jdRevision', label: 'Revision', readonly: true },
          { key: 'jdTitle', label: 'Title', readonly: true },
          // 手册 P69-81：周期频率（驱动 Next Due 计算）
          { key: 'frequency', label: 'Periodic Frequency' },
          // 手册 P147：负责工种（子承包时必填）
          { key: 'respDiscipline', label: 'Resp. Discipline', type: 'select', lookupKey: 'disciplines' },
          // 手册 P71：输出格式（Report Work 阶段作业描述呈现方式）
          { key: 'outputFormat', label: 'Output Format', type: 'select', options: ['Compact List', 'Full List', 'Step by Step'] },
          // 手册 P71：历史模板（MandatoryHistory 时可选，决定 Report Work 历史记录模板）
          { key: 'historyTemplate', label: 'History Template', type: 'select', lookupKey: 'historyTemplates' },
          // 手册 P60-61：Active 复选（决定作业是否纳入工单）
          { key: 'active', label: 'Active', type: 'select', options: ['Yes', 'No'], default: 'Yes' },
          // 手册 P59：Last Done 驱动 Next Due；改动触发重排（'AutomaticallyRescheduleWorkOrders'=TRUE）
          { key: 'lastDone', label: 'Last Done', type: 'date' },
          // 手册 P69-81：Window —— 到期日前后浮动窗口（天）
          { key: 'window', label: 'Window', type: 'number' },
          // 手册 P69-81：Planning Method（含 Variable → Estimates）
          { key: 'planningMethod', label: 'Planning Method', type: 'select', options: ['Periodic', 'Counter', 'MeasurePoint', 'Trigger', 'Variable'] },
          // 手册（截图 P51）：Variable 计划下的估算（Total Duration / Total Cost）
          { key: 'totalDuration', label: 'Total Duration', type: 'number', showIf: { key: 'planningMethod', value: 'Variable' } },
          { key: 'totalCost', label: 'Total Cost', type: 'number', showIf: { key: 'planningMethod', value: 'Variable' } },
          // 手册（截图 P51）：Maintenance Criteria
          { key: 'maintCriteria', label: 'Maint. Criteria', type: 'select', lookupKey: 'maintCriteria' },
        ],
        // 手册 P60：Job Description 标签内嵌 JD 库子表（Code / Revision / Title / Frequency / Window）—— 只读展示可用作业描述
        subgrid: {
          title: 'Available Job Descriptions',
          readonly: true,
          subSource: { dbKey: 'jobDescriptions' },
          columns: [
            { key: 'code', label: 'Code', readonly: true },
            { key: 'revision', label: 'Revision', readonly: true },
            { key: 'title', label: 'Title', readonly: true },
            { key: 'frequency', label: 'Frequency', readonly: true },
            { key: 'window', label: 'Window', readonly: true },
          ],
        },
      },
      // 手册（截图 P51）：JD Attachments —— 作业描述附件
      {
        id: 'jdAttachments', label: 'JD Attachments', type: 'subgrid', subKey: 'attachments',
        columns: [
          { key: 'fileName', label: 'File Name' },
          { key: 'description', label: 'Description' },
          { key: 'fileType', label: 'Type', type: 'select', options: ['PDF', 'Image', 'Drawing', 'Doc'] },
        ],
      },
      // 手册 P82：Counters —— 组件已登记计数器（仅当组件 / 类型先列出计数器时才可选）
      {
        id: 'counters', label: 'Counters', type: 'counter-list',
        columns: [
          { key: 'code', label: 'Code' },
          { key: 'description', label: 'Description' },
          { key: 'unit', label: 'Unit' },
          { key: 'currentValue', label: 'Current Value' },
        ],
      },
      noteTab('scheduling', 'Scheduling', '调度触发条件（周期 / 计数器 / 测点）。'),
      noteTab('parts', 'Parts', '所需备件（手册 P73：Required Parts）。'),
      noteTab('disciplines', 'Disciplines', '所需工种（手册 P147：Resp. Discipline）。'),
      // 手册 P62：Component Jobs 的 Risk Management（激活风险 + 场景 / 类型）
      {
        id: 'risk', label: 'Risk Management', fields: [
          { key: 'riskActive', label: 'Active', type: 'select', options: ['Yes', 'No'], default: 'No' },
          { key: 'riskScenario', label: 'Scenario' },
          { key: 'riskType', label: 'Type' },
        ],
      },
      // 手册 P64-65：Related Jobs —— 关联相似作业形成可一起上报的层级
      { id: 'related', label: 'Related Jobs', type: 'subgrid', subKey: 'relatedJobs',
        columns: [{ key: 'jobNo', label: 'Related Job', type: 'lookup', lookupKey: 'jobsForComponent', placeholder: '选择关联作业' }] },
      // 手册 P65-68：Job Dependencies —— 依赖链（Depending 作业；Counter 作业不可入链、同链须同频率 / 方法）
      { id: 'dependency', label: 'Dependency', type: 'subgrid', subKey: 'dependencies',
        columns: [{ key: 'jobNo', label: 'Depending Job', type: 'lookup', lookupKey: 'jobsForDependency', placeholder: '选择依赖作业' }] },
    ],
    // 手册 P61-64：Component Jobs 窗口 Options —— 字段链接例外（Show Indicators / Link All / Remove All / Copy Link）
    options: [
      { label: 'Spare Booking', action: 'spare-booking' },
      { label: 'Show Indicators', action: 'show-indicators' },
      { label: 'Link All to Type', action: 'link-all' },
      { label: 'Remove All Links to Type', action: 'remove-all-links' },
      { label: 'Copy Link from Selected', action: 'copy-link' },
    ],
  },

  'job-planning': {
    windowTitle: 'Job Planning',
    dataKey: 'jobs',
    statusField: 'status',
    filterBasic: [{ key: 'planningMethod', label: 'Method', type: 'select', options: ['Periodic', 'Counter', 'MeasurePoint', 'Trigger'] }],
    filterAdvanced: [{ key: 'description', label: 'Description', type: 'text' }],
    columns: [
      { key: 'jobNo', label: 'Job No.', width: '120px' },
      { key: 'description', label: 'Description' },
      { key: 'planningMethod', label: 'Method', width: '110px' },
      { key: 'frequency', label: 'Frequency', width: '100px' },
      { key: 'dueDate', label: 'Due', width: '110px' },
    ],
    detailTabs: [
      { id: 'periodic', label: 'Periodic Frequencies', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '按天 / 周 / 月周期调度。' }] },
      { id: 'counters', label: 'Counters', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '按运行小时或计数器触发。' }] },
      { id: 'measure', label: 'Measure Points', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '按测点读数触发。' }] },
      { id: 'triggers', label: 'Triggers', fields: [{ key: '_note', label: '说明', type: 'readonly', value: '由其他作业或状态触发。' }] },
    ],
    options: [{ label: 'Calculate Due Date', action: 'calc-due' }, { label: 'Generate Work Orders', action: 'gen-wo' }],
  },

  rounds: {
    windowTitle: 'Maintenance Rounds',
    dataKey: 'jobs',
    filterBasic: [{ key: 'status', label: 'Status', type: 'text' }],
    filterAdvanced: [{ key: 'jobNo', label: 'Code', type: 'text' }],
    columns: [
      { key: 'jobNo', label: 'Code', width: '120px' },
      { key: 'description', label: 'Description' },
      { key: 'frequency', label: 'Schedule', width: '110px' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [
        { key: 'description', label: 'Title' },
        { key: 'jobNo', label: 'Code' },
        { key: 'frequency', label: 'Schedule' },
        { key: 'outputFormat', label: 'Output Format', type: 'select', options: ['List', 'Extended List', 'Work Order'] },
        { key: 'historyTemplate', label: 'History Template' },
        { key: 'discipline', label: 'Discipline' },
      ] },
      noteTab('schedule', 'Schedule', '巡检周期设置（Periodic / Triggers）。'),
      noteTab('jobs', 'Jobs', '分配到轮次的作业。'),
      noteTab('triggers', 'Triggers', '轮次可链接的触发条件。'),
      noteTag('reporting', 'Reporting', '上报方式：简单 / 完整。'),
      noteTab('wo', 'Work Orders', '轮次工单。'),
    ],
    options: [{ label: 'Define Round', action: 'define-round' }, { label: 'Generate Round Work Order', action: 'gen-round-wo' }],
  },

  'work-planning': {
    windowTitle: 'Work Planning',
    dataKey: 'workOrders',
    statusField: 'status',
    filterBasic: [{ key: 'status', label: 'Status', type: 'select', options: ['Requested', 'Planned', 'Issued', 'Pending', 'Postponed', 'Cancelled', 'Completed', 'Controlled', 'Filed'] }],
    filterAdvanced: [{ key: 'functionNo', label: 'Function', type: 'text' }],
    columns: [
      { key: 'workOrderNo', label: 'WO No.', width: '130px' },
      { key: 'description', label: 'Description' },
      { key: 'componentId', label: 'Component', width: '110px' },
      { key: 'functionNo', label: 'Function', width: '110px' },
      { key: 'dueDate', label: 'Due', width: '110px' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailTabs: [
      { id: 'main', label: 'Work Orders', fields: [
        { key: 'workOrderNo', label: 'WO No.' },
        { key: 'description', label: 'Description' },
        { key: 'status', label: 'Status', type: 'select', options: ['Requested', 'Planned', 'Issued', 'Pending', 'Postponed', 'Cancelled', 'Completed', 'Controlled', 'Filed'] },
        { key: 'dueDate', label: 'Due Date', type: 'date' },
      ] },
    ],
    options: [{ label: 'Set Status', action: 'set-status' }, { label: 'Issue Work Orders', action: 'issue-wo' }, { label: 'Adjust Parts', action: 'adjust-parts' }],
  },

  projects: {
    windowTitle: 'Projects',
    dataKey: 'projects',
    statusField: 'status',
    filterBasic: [{ key: 'status', label: 'Status', type: 'select', options: ['Active', 'Closed', 'On Hold'] }],
    filterAdvanced: [{ key: 'projectNo', label: 'Project No.', type: 'text' }],
    columns: [
      { key: 'projectNo', label: 'Project No.', width: '130px' },
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status', width: '90px', tag: true },
      { key: 'sections', label: 'Sections', align: 'right', width: '80px' },
      { key: 'cost', label: 'Cost', align: 'right', width: '100px' },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [{ key: 'projectNo', label: 'Project No.' }, { key: 'title', label: 'Title' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Closed', 'On Hold'] }] },
      noteTab('sections', 'Sections', '项目分段。'),
      noteTab('access', 'Access Control', '访问控制。'),
      noteTab('jobs', 'Jobs', '项目作业。'),
      noteTab('wo', 'Work Orders', '项目工单。'),
      noteTab('sub', 'Sub-Contracting', '分包管理。'),
      noteTab('costs', 'Costs', '成本归集。'),
    ],
    options: [{ label: 'Add Section', action: 'add-section' }, { label: 'Generate Project Work Orders', action: 'gen-proj-wo' }],
  },

  'report-work': {
    windowTitle: 'Report Work',
    dataKey: 'workOrders',
    statusField: 'status',
    // 指南（手册 2，Reporting Work）：仅可对状态为 Issued 或 Started 的工单上报
    filterBasic: [{ key: 'status', label: 'Status', type: 'select', options: ['Issued', 'Started'] }],
    filterAdvanced: [{ key: 'workOrderNo', label: 'WO No.', type: 'text' }],
    columns: [
      { key: 'workOrderNo', label: 'WO No.', width: '130px' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
      { key: 'dueDate', label: 'Due', width: '110px' },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [
        { key: 'workOrderNo', label: 'WO No.' },
        { key: 'description', label: 'Description' },
        { key: 'status', label: 'Status', type: 'select', options: ['Issued', 'Started', 'Completed'] },
        { key: 'componentId', label: 'Component' },
        { key: 'functionNo', label: 'Function' },
        { key: 'priority', label: 'Priority' },
      ] },
      noteTab('resources', 'Resources Used', '人工 / 工时 / 工种。'),
      noteTab('stock', 'Stock Used', '消耗备件。'),
      noteTab('history', 'History', '维修历史描述。'),
      noteTab('measure', 'Measure Points', '执行时测点读数。'),
      noteTab('permit', 'Work Permit', '作业许可。'),
      noteTab('related', 'Related Jobs', '关联或依赖作业。'),
    ],
    options: [{ label: 'Complete Work Order', action: 'complete-wo' }, { label: 'Report Overdue', action: 'report-overdue' }],
  },

  'update-counters': {
    windowTitle: 'Update Counters',
    dataKey: 'counterLogs',
    filterBasic: [{ key: 'function', label: 'Function（按功能位置查找）', type: 'text' }],
    filterAdvanced: [{ key: 'component', label: 'Component', type: 'text' }],
    columns: [
      { key: 'component', label: 'Component', width: '110px' },
      { key: 'function', label: 'Function', width: '110px' },
      { key: 'counter', label: 'Counter', width: '120px' },
      { key: 'currentValue', label: 'Current', align: 'right', width: '90px' },
      { key: 'newValue', label: 'New', align: 'right', width: '90px' },
      { key: 'unit', label: 'Unit', width: '70px' },
      { key: 'readingDate', label: 'Date Read', width: '110px' },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [
        { key: 'component', label: 'Component', type: 'lookup', lookupKey: 'components' },
        { key: 'function', label: 'Function', type: 'lookup', lookupKey: 'functions' },
        { key: 'counter', label: 'Counter Code' },
        { key: 'currentValue', label: 'Current Value（总计值）', type: 'number' },
        { key: 'newValue', label: 'New Reading', type: 'number' },
        { key: 'unit', label: 'Unit' },
        { key: 'readingDate', label: 'Date Read', type: 'date' },
      ] },
      { id: 'note', label: 'Note', fields: [{ key: '_note', label: '说明', type: 'readonly', value: 'Current Value 为总计值：AMOS 中凡与 HOUR 工单相关之处均取总计值。建议更新前先打印当前计数器并核对。' }] },
    ],
    options: [],
  },

  'update-measure-points': {
    windowTitle: 'Update Measure Points',
    dataKey: 'measureLogs',
    filterBasic: [{ key: 'function', label: 'Function', type: 'text' }],
    filterAdvanced: [{ key: 'measurePoint', label: 'Measure Point', type: 'text' }],
    columns: [
      { key: 'component', label: 'Component', width: '110px' },
      { key: 'measurePoint', label: 'Measure Point', width: '130px' },
      { key: 'value', label: 'Value', align: 'right', width: '90px' },
      { key: 'trend', label: 'Trend', width: '90px', tag: true },
      { key: 'readingDate', label: 'Date', width: '110px' },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [
        { key: 'component', label: 'Component', type: 'lookup', lookupKey: 'components' },
        { key: 'measurePoint', label: 'Measure Point' },
        { key: 'value', label: 'Value', type: 'number' },
        { key: 'trend', label: 'Trend', type: 'select', options: ['Up', 'Down', 'Stable'] },
        { key: 'readingDate', label: 'Reading Date', type: 'date' },
      ] },
      noteTab('trends', 'Trends', '测点读数趋势图（完整系统中展示）。'),
    ],
    options: [],
  },

  'maintenance-history': {
    windowTitle: 'Maintenance History',
    dataKey: 'maintenanceLog',
    filterBasic: [{ key: 'jobState', label: 'Job State', type: 'select', options: ['Completed', 'PartlyDone'] }],
    filterAdvanced: [{ key: 'workOrder', label: 'WO No.', type: 'text' }],
    columns: [
      { key: 'date', label: 'Date', width: '110px' },
      { key: 'workOrder', label: 'WO No.', width: '120px' },
      { key: 'job', label: 'Job', width: '90px' },
      { key: 'jobState', label: 'State', width: '100px', tag: true },
      { key: 'reportedBy', label: 'Reported By', width: '110px' },
    ],
    detailTabs: [{ id: 'history', label: 'History', fields: [
      { key: 'date', label: 'Date' }, { key: 'workOrder', label: 'WO No.' }, { key: 'job', label: 'Job' },
      { key: 'jobState', label: 'Job State', type: 'select', options: ['Completed', 'PartlyDone'] },
      { key: 'reportedBy', label: 'Reported By' }, { key: 'text', label: 'History Text', type: 'textarea' },
    ] }],
    options: [],
  },

  'maintenance-log': {
    windowTitle: 'Maintenance Log',
    dataKey: 'maintenanceLog',
    filterBasic: [{ key: 'jobState', label: 'Job State', type: 'select', options: ['Completed', 'PartlyDone'] }],
    filterAdvanced: [{ key: 'workOrder', label: 'WO No.', type: 'text' }],
    columns: [
      { key: 'date', label: 'Date', width: '110px' },
      { key: 'workOrder', label: 'WO No.', width: '120px' },
      { key: 'job', label: 'Job', width: '90px' },
      { key: 'reportedBy', label: 'Reported By', width: '110px' },
      { key: 'text', label: 'Text' },
    ],
    detailTabs: [{ id: 'log', label: 'Log', fields: [
      { key: 'date', label: 'Date' }, { key: 'workOrder', label: 'WO No.' }, { key: 'job', label: 'Job' },
      { key: 'jobState', label: 'Job State', type: 'select', options: ['Completed', 'PartlyDone'] },
      { key: 'reportedBy', label: 'Reported By' }, { key: 'text', label: 'Log Text', type: 'textarea' },
    ] }],
    options: [],
  },

  'stock-types': {
    windowTitle: 'Stock Types',
    dataKey: 'stockTypes',
    statusField: 'status',
    statusOptions: ['Active', 'Obsolete', 'Scrapped'],
    filterBasic: [{ key: 'status', label: 'Status', type: 'select', options: ['Active', 'Obsolete', 'Scrapped'] }, { key: 'maker', label: 'Maker', type: 'text' }],
    filterAdvanced: [{ key: 'stockTypeNo', label: 'Stock Type No.', type: 'text' }],
    columns: [
      { key: 'stockTypeNo', label: 'Stock Type No.', width: '130px' },
      { key: 'description', label: 'Description' },
      { key: 'maker', label: 'Maker', width: '110px' },
      { key: 'unit', label: 'Unit', width: '70px' },
      { key: 'bestPrice', label: 'Best Price', align: 'right', width: '90px' },
      { key: 'status', label: 'Status', width: '90px', tag: true },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [
        // 手册 P181-182：General 标签字段（Number / Name / Maker / Maker's Ref / Parent Type / Stock Unit / Perishable / Stock Class / Best Price / Preferred Vendor / Status）
        { key: 'stockTypeNo', label: 'Stock Type No.' },
        { key: 'description', label: 'Description' },
        // 手册 P181-182（截图）：Maker 为 lookup-with-name（左框 Code 如 WART，右框 Name 如 Wärtsilä，匹配 TOW001/TOWIMOR SA 样式）
        { key: 'maker', label: 'Maker', type: 'lookup-with-name', lookupKey: 'makers' },
        { key: 'makersRef', label: "Maker's Ref." },
        { key: 'parentTypeNo', label: 'Parent Type', type: 'lookup', lookupKey: 'stockTypes' },
        { key: 'unit', label: 'Stock Unit' },
        { key: 'perishable', label: 'Perishable Item', type: 'checkbox', checkLabel: '易腐 / 有保质期' },
        { key: 'stockClass', label: 'Stock Class', type: 'select', options: ['Spare Part', 'Consumable', 'Tool', 'Other'] },
        { key: 'bestPrice', label: 'Best Purchase Price', type: 'number' },
        { key: 'vendor', label: 'Preferred Vendor', type: 'lookup', lookupKey: 'vendors' },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Obsolete', 'Scrapped'] },
      ] },
      // 手册 P181：Makers —— 本 Stock Type 的合格制造商清单（可编辑子表）
      { id: 'makers', label: 'Makers', type: 'subgrid',
        subSource: { dbKey: 'stockTypeMakers', filterKey: 'stockTypeNo', filterModelKey: 'stockTypeNo' },
        columns: [
          { key: 'maker', label: 'Maker', type: 'lookup', lookupKey: 'makers', width: '160px' },
          { key: 'makersRef', label: "Maker's Ref.", width: '120px' },
          { key: 'price', label: 'Price', type: 'number', width: '90px' },
          { key: 'status', label: 'Status', type: 'select', options: ['Approved', 'Pending', 'Obsolete'], width: '100px' },
        ] },
      // 手册 P181：Vendors —— 本 Stock Type 的合格供应商清单（可编辑子表）
      { id: 'vendors', label: 'Vendors', type: 'subgrid',
        subSource: { dbKey: 'stockTypeVendors', filterKey: 'stockTypeNo', filterModelKey: 'stockTypeNo' },
        columns: [
          { key: 'vendor', label: 'Vendor', type: 'lookup', lookupKey: 'vendors', width: '160px' },
          { key: 'price', label: 'Price', type: 'number', width: '90px' },
          { key: 'leadTime', label: 'Lead (days)', type: 'number', width: '90px' },
          { key: 'status', label: 'Status', type: 'select', options: ['Approved', 'Pending', 'Obsolete'], width: '100px' },
        ] },
      // 手册 P181：Grades —— 本 Stock Type 的库存等级（可编辑子表）
      { id: 'grades', label: 'Grades', type: 'subgrid',
        subSource: { dbKey: 'stockGrades', filterKey: 'stockTypeNo', filterModelKey: 'stockTypeNo' },
        columns: [
          { key: 'grade', label: 'Grade', width: '80px' },
          { key: 'priceFactor', label: 'Price Factor', type: 'number', width: '100px' },
          { key: 'description', label: 'Description' },
        ] },
      // 手册 P181/P184：Used in Component Types —— 显示引用本 Stock Type 的组件类型（只读聚合）
      { id: 'ctypes', label: 'Used in Component Types', type: 'agg-list', aggKey: 'usedInComponentTypes',
        columns: [
          { key: 'typeNumber', label: 'Type No.', width: '110px' },
          { key: 'name', label: 'Name' },
          { key: 'status', label: 'Status', width: '90px' },
        ] },
      // 手册 P181：Available Stock —— 本 Stock Type 在各安装地点注册为 Stock Items 后的库存汇总（只读聚合）
      { id: 'avail', label: 'Available Stock', type: 'agg-list', aggKey: 'availableStock',
        columns: [
          { key: 'location', label: 'Location', width: '160px' },
          { key: 'quantity', label: 'Quantity', align: 'right', width: '90px' },
        ] },
      // 手册 P189：Purchase History —— 本 Stock Type 所有 Items 的采购交易历史（只读聚合）
      { id: 'ph', label: 'Purchase History', type: 'agg-list', aggKey: 'purchaseHistory',
        columns: [
          { key: 'transactionNo', label: 'TX No.', width: '110px' },
          { key: 'type', label: 'Type', width: '80px' },
          { key: 'stockItem', label: 'Stock Item', width: '110px' },
          { key: 'quantity', label: 'Qty', align: 'right', width: '60px' },
          { key: 'date', label: 'Date', width: '100px' },
          { key: 'reference', label: 'Ref.', width: '90px' },
        ] },
    ],
    options: [{ label: 'Register as Stock Item', action: 'register-stock' }, { label: 'Set Status', action: 'set-status' }],
  },

  transactions: {
    windowTitle: 'Stock Transactions',
    dataKey: 'transactions',
    filterBasic: [{ key: 'type', label: 'Type', type: 'select', options: ['In', 'Out', 'Move', 'Transferred In', 'Transferred Out', 'Reverse'] }],
    filterAdvanced: [{ key: 'stockItem', label: 'Stock Item', type: 'text' }],
    columns: [
      { key: 'transactionNo', label: 'TX No.', width: '120px' },
      { key: 'type', label: 'Type', width: '80px', tag: true },
      { key: 'stockItem', label: 'Stock Item', width: '110px' },
      { key: 'quantity', label: 'Qty', align: 'right', width: '70px' },
      { key: 'fromLocation', label: 'From', width: '110px' },
      { key: 'toLocation', label: 'To', width: '110px' },
      { key: 'date', label: 'Date', width: '110px' },
    ],
    detailTabs: [{ id: 'general', label: 'General', fields: [
      { key: 'transactionNo', label: 'TX No.' },
      { key: 'type', label: 'Type', type: 'select', options: ['In', 'Out', 'Move', 'Transferred In', 'Transferred Out', 'Reverse'] },
      { key: 'stockItem', label: 'Stock Item', type: 'lookup', lookupKey: 'stockItems' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'fromLocation', label: 'From Location' },
      { key: 'toLocation', label: 'To Location' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'reference', label: 'Reference' },
    ] }],
    options: [{ label: 'Reverse Transaction', action: 'reverse-tx' }],
  },

  'transfer-documents': {
    windowTitle: 'Transfer Documents',
    dataKey: 'transferDocs',
    statusField: 'status',
    statusOptions: ['Created', 'Submitted', 'Approved', 'PartlyTransferred', 'Transferred', 'In Transit', 'Received'],
    filterBasic: [{ key: 'status', label: 'Status', type: 'select', options: ['Created', 'Submitted', 'Approved', 'PartlyTransferred', 'Transferred', 'In Transit', 'Received'] }],
    filterAdvanced: [{ key: 'docNo', label: 'Doc No.', type: 'text' }],
    columns: [
      { key: 'docNo', label: 'Doc No.', width: '120px' },
      { key: 'fromLocation', label: 'From', width: '110px' },
      { key: 'toLocation', label: 'To', width: '110px' },
      { key: 'items', label: 'Items', align: 'right', width: '70px' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [
        { key: 'docNo', label: 'Doc No.' },
        { key: 'fromLocation', label: 'From Location' },
        { key: 'toLocation', label: 'To Location' },
        { key: 'status', label: 'Status', type: 'select', options: ['Created', 'Submitted', 'Approved', 'PartlyTransferred', 'Transferred', 'In Transit', 'Received'] },
        { key: 'created', label: 'Created', type: 'date' },
      ] },
      noteTab('items', 'Items', '需转移的库存项。'),
      noteTab('approval', 'Approval', '审批。'),
      noteTab('transfer', 'Transfer', '转移执行。'),
      noteTab('receiving', 'Receiving', '接收。'),
    ],
    options: [{ label: 'Submit', action: 'submit' }, { label: 'Approve', action: 'approve' }, { label: 'Transfer Items', action: 'transfer' }, { label: 'Receive', action: 'receive' }],
  },

  'stock-control': {
    windowTitle: 'Stock Control',
    dataKey: 'stockItems',
    statusField: 'status',
    filterBasic: [{ key: 'status', label: 'Status', type: 'select', options: ['Active', 'Obsolete', 'Scrapped'] }],
    filterAdvanced: [{ key: 'stockTypeNo', label: 'Stock Type', type: 'text' }],
    columns: [
      { key: 'stockItemNo', label: 'Item No.', width: '110px' },
      { key: 'description', label: 'Description' },
      { key: 'quantity', label: 'Qty', align: 'right', width: '70px' },
      { key: 'location', label: 'Location', width: '110px' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailTabs: [{ id: 'general', label: 'General', fields: [
      { key: 'stockItemNo', label: 'Item No.' },
      { key: 'description', label: 'Description' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Obsolete', 'Scrapped'] },
    ] }],
    options: [{ label: 'Set Status', action: 'set-status' }],
  },

  quotations: {
    windowTitle: 'Quotations',
    dataKey: 'quotations',
    filterBasic: [],
    filterAdvanced: [{ key: 'formNo', label: 'Query Form', type: 'text' }],
    columns: [
      { key: 'formNo', label: 'Query Form', width: '120px' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'unitPrice', label: 'Unit Price', align: 'right', width: '100px' },
      { key: 'discount', label: 'Disc%', align: 'right', width: '70px' },
      { key: 'deliveryDays', label: 'Days', align: 'right', width: '70px' },
      { key: 'currency', label: 'Cur', width: '60px' },
    ],
    detailTabs: [{ id: 'general', label: 'General', fields: [
      { key: 'formNo', label: 'Query Form' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'unitPrice', label: 'Unit Price', type: 'number' },
      { key: 'discount', label: 'Discount %', type: 'number' },
      { key: 'deliveryDays', label: 'Delivery Days', type: 'number' },
      { key: 'currency', label: 'Currency' },
      { key: 'note', label: 'Note', type: 'textarea' },
    ] }],
    options: [{ label: 'Add Quotation', action: 'add-quotation' }, { label: 'Print', action: 'print' }],
  },

  deliveries: {
    windowTitle: 'Deliveries',
    dataKey: 'deliveries',
    statusField: 'status',
    statusOptions: ['In Transit', 'Partly Received', 'Received', 'Rejected'],
    filterBasic: [{ key: 'status', label: 'Status', type: 'select', options: ['In Transit', 'Partly Received', 'Received', 'Rejected'] }],
    filterAdvanced: [{ key: 'formNo', label: 'PO Form', type: 'text' }],
    columns: [
      { key: 'deliveryNo', label: 'Delivery No.', width: '120px' },
      { key: 'formNo', label: 'PO Form', width: '120px' },
      { key: 'lineItems', label: 'Items', align: 'right', width: '70px' },
      { key: 'intermediate', label: 'Intermediate', width: '110px' },
      { key: 'status', label: 'Status', width: '110px', tag: true },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [
        { key: 'deliveryNo', label: 'Delivery No.' },
        { key: 'formNo', label: 'PO Form' },
        { key: 'status', label: 'Status', type: 'select', options: ['In Transit', 'Partly Received', 'Received', 'Rejected'] },
        { key: 'date', label: 'Date', type: 'date' },
      ] },
      noteTab('items', 'Line Items', '逐行到货数量。'),
      noteTab('inter', 'Intermediate Locations', '中转地点。'),
    ],
    options: [{ label: 'Register Delivery', action: 'register-delivery' }, { label: 'Receive', action: 'receive' }],
  },

  'transport-documents': {
    windowTitle: 'Transport Documents',
    dataKey: 'transportDocs',
    filterBasic: [],
    filterAdvanced: [{ key: 'docNo', label: 'Doc No.', type: 'text' }],
    columns: [
      { key: 'docNo', label: 'Doc No.', width: '120px' },
      { key: 'deliveries', label: 'Deliveries', width: '110px' },
      { key: 'intermediate', label: 'Intermediate', width: '110px' },
      { key: 'status', label: 'Status', width: '110px', tag: true },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [{ key: 'docNo', label: 'Doc No.' }, { key: 'status', label: 'Status' }] },
      noteTab('deliveries', 'Deliveries', '关联交付。'),
      noteTab('inter', 'Intermediate Locations', '中转地点更新。'),
    ],
    options: [{ label: 'Add Deliveries', action: 'add-deliveries' }, { label: 'Update Location', action: 'update-loc' }],
  },

  'quality-checks': {
    windowTitle: 'Quality Checks',
    dataKey: 'qualityChecks',
    statusField: 'status',
    statusOptions: ['Open', 'Passed', 'Rejected', 'Claimed'],
    filterBasic: [{ key: 'status', label: 'Status', type: 'select', options: ['Open', 'Passed', 'Rejected', 'Claimed'] }],
    filterAdvanced: [{ key: 'formNo', label: 'Form', type: 'text' }],
    columns: [
      { key: 'checkNo', label: 'Check No.', width: '120px' },
      { key: 'formNo', label: 'Form', width: '120px' },
      { key: 'result', label: 'Result', width: '90px' },
      { key: 'claim', label: 'Claim', width: '70px' },
      { key: 'status', label: 'Status', width: '100px', tag: true },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [
        { key: 'checkNo', label: 'Check No.' },
        { key: 'formNo', label: 'Form' },
        { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Passed', 'Rejected', 'Claimed'] },
        { key: 'result', label: 'Result', type: 'select', options: ['Accept', 'Reject', ''] },
        { key: 'claim', label: 'Claim', type: 'select', options: ['Yes', 'No'] },
        { key: 'date', label: 'Date', type: 'date' },
      ] },
      noteTab('items', 'Items', '受检条目。'),
      noteTab('result', 'Result', '检查结果。'),
      noteTab('claim', 'Claim', '索赔。'),
      noteTab('return', 'Return Items', '退回报废项。'),
    ],
    options: [{ label: 'Accept', action: 'accept' }, { label: 'Reject', action: 'reject' }, { label: 'Escalate to Claim', action: 'escalate' }],
  },

  contracts: {
    windowTitle: 'Contracts',
    dataKey: 'contracts',
    statusField: 'status',
    statusOptions: ['Draft', 'Approved', 'Issued'],
    filterBasic: [{ key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Approved', 'Issued'] }, { key: 'vendor', label: 'Vendor', type: 'text' }],
    filterAdvanced: [{ key: 'contractNo', label: 'Contract No.', type: 'text' }],
    columns: [
      { key: 'contractNo', label: 'Contract No.', width: '130px' },
      { key: 'title', label: 'Title' },
      { key: 'vendor', label: 'Vendor', width: '120px' },
      { key: 'status', label: 'Status', width: '90px', tag: true },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [
        { key: 'contractNo', label: 'Contract No.' },
        { key: 'title', label: 'Title' },
        { key: 'vendor', label: 'Vendor' },
        { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Approved', 'Issued'] },
        { key: 'discount', label: 'Discount' },
        { key: 'deliveryZone', label: 'Delivery Zone' },
        { key: 'priceMatrix', label: 'Price Matrix' },
      ] },
      noteTab('discounts', 'Discounts', '各级别折扣。'),
      noteTab('zones', 'Delivery Zones', '交付区域。'),
      noteTab('groups', 'Product Groups', '产品组。'),
      noteTab('matrix', 'Price Matrix', '按产品组与地点维护价格。'),
      noteTab('items', 'Contract Items', '合同物料。'),
    ],
    options: [{ label: 'Approve', action: 'approve' }, { label: 'Issue', action: 'issue' }, { label: 'Create Price Matrix', action: 'price-matrix' }],
  },

  'custom-clearance-forms': {
    windowTitle: 'Custom Clearance Forms',
    dataKey: 'deliveries',
    filterBasic: [],
    filterAdvanced: [{ key: 'deliveryNo', label: 'Delivery', type: 'text' }],
    columns: [
      { key: 'deliveryNo', label: 'Delivery No.', width: '120px' },
      { key: 'formNo', label: 'PO Form', width: '120px' },
      { key: 'status', label: 'Status', width: '110px', tag: true },
    ],
    detailTabs: [
      { id: 'general', label: 'General', fields: [{ key: 'deliveryNo', label: 'Delivery No.' }, { key: 'formNo', label: 'PO Form' }] },
      noteTab('details', 'Details', '清关明细。'),
      noteTab('forms', 'Forms', '关联单据。'),
      noteTab('expenses', 'Expenses', '费用。'),
      noteTab('items', 'Items', '物品。'),
    ],
    options: [{ label: 'New Form', action: 'new-form' }, { label: 'Finalise Item', action: 'finalise' }],
  },
}

// 小工具：生成带说明的标签页（避免重复）
function noteTag(id, label, text) {
  return noteTab(id, label, text)
}
