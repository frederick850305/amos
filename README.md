# AMOS M&P 国产化 Vue 原型系统

面向船舶 / 海工资产维护、库存、采购与预算管理的桌面型企业系统原型（原型演示用，非生产系统）。
依据 `AMOS M&P Vrs.10.0.30 User Guide.pdf` 提炼，复刻传统 AMOS 桌面操作体验。

## 技术栈

- Vue 3 + Vite（与同仓 `prototypes/aps` 保持一致的轻量方案，无第三方 UI 库 / 路由）
- 纯前端 Mock 数据（`src/mock/index.js`），运行于浏览器内存态

## 运行

```bash
npm install
npm run dev      # 开发服务器（默认端口 5280，0.0.0.0）
npm run build    # 生产构建到 dist/
npm run preview  # 预览生产构建
```

打开浏览器访问 `http://localhost:5280/` 即可。

## 系统结构

```
prototypes/amos/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.js
    ├── App.vue                  # 外壳：标题栏 / 菜单栏 / 工具栏 / 快捷栏 / 工作区标签页 / 状态栏
    ├── style.css                # AMOS 企业视觉（浅蓝标题栏、浅灰面板、蓝色选中态）
    ├── store.js                 # 全局状态：安装地点 / 部门 / 打开的窗口标签 / 全局弹窗 / Toast
    ├── data/amosData.js         # 安装地点、部门、菜单结构、页面注册表
    ├── mock/index.js            # Mock 数据库与 Lookup / Dashboard 数据
    ├── windows/registry.js      # 通用业务窗口配置（驱动 GenericWindowView）
    ├── components/              # Modal / MenuBar / Toolbar / ShortcutBar / StatusBar /
    │                             # FilterDialog / LookupDialog / RecordList / RecordDetail /
    │                             # BusinessWindow / GlobalDialogs
    ├── views/                   # Dashboard 与重点业务页面 + GenericWindowView
    └── pages/index.js           # 页面 key → 组件映射
```

## 已实现功能

- **外壳**：顶部标题栏（安装地点 / 部门切换、用户、锁定）、横向菜单栏（File / Maintenance / Stock / Purchase / Budget / Tools / Window / Help）、图标工具栏、左侧模块快捷栏（Maintenance / Stock / Purchase / Budget + Dashboard 飞出菜单）、多窗口标签页工作区、状态栏。
- **统一业务窗口模式**：进入业务窗口先弹 `Filter` 对话框（Basic / Advanced，OK / Cancel / Select All / Clear）→ 结果列表（排序、搜索、双击打开明细）→ 明细标签页（含 Lookup 弹窗选择）；工具栏 New / Save / Refresh / Print / View / Options 作用于活动窗口。
- **Dashboard 首页**：KPI 卡片、Alerts Overview（条形图 / 饼图切换、双击跳转）、Notifications、模块快捷入口。
- **重点页面（专用实现）**：Components、Work Orders（状态流步骤条 + Generate / Issue / Requisition）、Stock Items（Move 生成交易）、Stock Wanted（Calculate / Generate Forms）、Purchase Forms（类型筛选 + Requisition→Query→PO 转换 + Apply Contract）、Quotation Comparison（报价矩阵 + Best Price / Best Delivery / Approve）、Budget（占用进度条）、Vouchers（Net / VAT / Total 计算）。
- **通用页面（配置驱动）**：Component Types、Functions、Component Type/Component Jobs、Job Planning、Rounds、Work Planning、Projects、Report Work、Update Counters / Measure Points、Maintenance History / Log、Stock Types、Stock Transactions、Transfer Documents、Stock Control、Quotations、Deliveries、Transport Documents、Quality Checks、Contracts、Custom Clearance Forms。
- **全局能力**：Tools › Switch Department、Select View、Options（配置）、Global Search（跨对象检索）、About、Lock、打印。

> 说明：手册中 Quality / Voyage / Crewing 等未展开菜单在原型中保留入口或置灰；数据均为前端 Mock，刷新页面后重置。
