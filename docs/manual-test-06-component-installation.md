# 模块 06 Component Installation — 浏览器端手工测试验证流程

适用范围：`amos-server`（后端真实 API）+ `amos`（前端）。本轮改动为 `FunctionService` 安装/拆卸校验与状态日志补强，以及前端 `ComponentsView` 改调真实命令（不再写本地 mock history），并合并了 `Functions Performed` / `Function Performing` 标签页、在 `Functions Performed` 内加入 Install/Remove 编辑入口。

> 注：本轮**没有新增 DB 迁移、没有新端点**，只是 `FunctionService` 补强校验 + 状态日志，以及前端改调真实命令。

## 1. 前置条件

### 1.1 启动后端（连本地 PG 开发库）

```bash
cd amos-server/amos-app
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
SERVER_PORT=8099 mvn spring-boot:run
```

默认 `postgres` profile，连 `localhost:5432/amos`。启动后确认 `/api/system/me` 可访问。

### 1.2 启动前端

```bash
cd amos
# vite.config.js 的 dev proxy 默认转发到 http://localhost:8080
# 若后端用了 8099，则配置 VITE_API_TARGET=http://localhost:8099
VITE_API_TARGET=http://localhost:8099 npm run dev
```

浏览器打开 Vite 提示的地址（通常 `http://localhost:5173`）。

### 1.3 登录

用 `admin/admin` 登录，顶栏安装地点应为 `Traveller`、部门 `ER`、用户 `Administrator`。

> 前端业务窗口列表渲染前会经 `scopeByDepartment` 过滤（按当前部门 **code** `ER` 与当前船 **code** `Traveller`）。造测试数据时 `department` 必须写 code `ER`，否则后端已返回但前端被隐藏。

## 2. 测试数据

由 Flyway 迁移 `amos-server/.../db/migration/V10__component_test_data.sql` 自动造入（服务启动即持久化；已对开发库手动应用一次）。

**待安装组件**（status=Available，未装任何 function，覆盖多 maker/部门，department 均为 `ER`）：

| number | name | status | function_no | location |
|---|---|---|---|---|
| C-TEST-01 | ME Cylinder #2 | Available | — | Engine Room |
| C-TEST-02 | Aux Boiler Feed Pump A | Available | — | Engine Room |
| C-TEST-03 | Compressor Unit B | Available | — | Engine Room |
| C-TEST-04 | Main Switchboard MCC | Available | — | Engine Room |
| C-TEST-05 | Deck Crane Hoist Motor | Available | — | Deck |

**预装组件**（用于触发拒绝场景）：

- `C-TEST-10`（ME Piston #1，status=In Use，function_no=FN-ENG-01），并已同步 `FN-ENG-01.installed_component_no='C-TEST-10'`。

**空 function**（用于触发"空 function 拆卸拒绝"）：`FN-DECK-01` 本身未装组件。

前端 Components 窗口按 installation=Traveller 即可看到这 6 个组件；Functions 窗口可见 FN-ENG-01/02/03、FN-DECK-01。

## 3. 验证场景（原有流程）

### 场景 A：安装组件到 Function（写状态日志 + 已装别处拒绝）

1. 进入 **Components** 窗口，选中 `C-TEST-01`（status 应为 `Available`）。
2. 在详情 `Function` 字段填入已存在的 `functionNo`（如 `FN-ENG-02`）。
3. 失焦/保存，观察：
   - 组件 `Function` 更新为 `FN-ENG-02`；
   - `Functions Performed` 历史出现一条 `Installed on FN-ENG-02` 记录（`action=Installed`）。
4. 选中 `C-TEST-02`，同样安装到 `FN-ENG-01`（已被 `C-TEST-10` 占用）：
   - 期望：后端拒绝（"component already installed on function ... remove it first"），前端提示错误，且 `C-TEST-02` 的 `Function` 回滚到后端真实状态（不为 `FN-ENG-01`）。

### 场景 B：同组件重复安装同 Function（拒绝）

1. 选中已装在 `FN-ENG-02` 的 `C-TEST-01`，再次把 `Function` 设为 `FN-ENG-02` 并保存：
   - 期望：后端拒绝重复安装，前端报错并回滚（`Function` 仍为 `FN-ENG-02`）。

### 场景 C：拆卸组件（写状态日志 + 空 function 拆卸拒绝）

1. 选中装在 `FN-ENG-02` 的 `C-TEST-01`，把 `Function` 清空并保存：
   - 后端执行 `removeComponent`，状态日志新增 `Removed from FN-ENG-02`（`newStatus` 默认 `Available`）；
   - 组件 `status` 回到 `Available`，历史中出现拆卸记录。
2. 对**本来就没有安装组件**的 function（或已空的组件）再次清空保存：
   - 期望：后端返回 400（"no component installed on function ..."），前端提示错误。

### 场景 D：BusinessWindow 手动改 installedComponentId

1. 打开某 Function 的 **Business Window**，手动修改 `installedComponentId`：
   - 改为有效组件号 → 走后端 `installComponent`，成功则联动写日志；
   - 改为空 → 走后端 `removeComponent`；
   - 失败（如组件已装别处）→ 前端提示并回滚到后端真实值。

### 场景 E：历史异步加载与回滚一致性

1. 选中不同组件时，`Functions Performed` 历史应随选中组件异步刷新（不再依赖本地 mock）。
2. 制造一次失败的安装（场景 A 第 4 步），确认前端 `selected` 被回滚，界面 `Function` 与后端一致，不出现"假成功"。

## 4. 在 Functions Performed 标签页直接 Install / Remove

本轮合并了原 `Function Performing` 标签页，在 `Functions Performed` 内新增「当前安装功能位置」摘要 + `Install` / `Remove` 按钮，与详情主面板 `Function` 字段**同源**（均调 `componentService.setFunction`）。

刷新 Components 页面后：

### 4.1 安装（Install）

1. 选中 `C-TEST-01`，进入详情 **Functions Performed** 标签页。
2. 顶部应显示「当前安装功能位置：**未安装**」。
3. 点击 **Install** → 弹出功能位置选择器（下拉列出本船 functions：FN-ENG-01/02/03、FN-DECK-01）。
4. 选择 `FN-ENG-02`，点击 **Install**：
   - 期望：历史表新增一条 `Installed on FN-ENG-02`（`action=Installed`）；
   - 顶部「当前安装功能位置」变为 `FN-ENG-02`，且历史中对应行**高亮 + 标「当前」徽标**；
   - 详情主面板 `Function` 字段同步变为 `FN-ENG-02`。

### 4.2 拆卸（Remove）

1. 仍选中 `C-TEST-01`（当前装在 `FN-ENG-02`），在 **Functions Performed** 标签页点 **Remove**：
   - 期望：历史表新增 `Removed from FN-ENG-02`（`action=Removed`）；
   - 顶部回到「未安装」，高亮「当前」行消失；
   - 组件 `status` 回落 `Available`，详情主面板 `Function` 清空。

### 4.3 已装别处拒绝（Install 触发）

1. 选中 `C-TEST-10`（已装 `FN-ENG-01`），进入 **Functions Performed** 标签页，顶部显示「当前安装功能位置：`FN-ENG-01`」。
2. 点 **Install**，选择 `FN-ENG-02`（被 `C-TEST-10` 外的组件理论可装，但本组件已占用 FN-ENG-01）→ 后端拒绝（一个组件只能装在一个 function）：
   - 期望：前端 toast 报错，顶部仍显示 `FN-ENG-01`，`Function` 字段不变（回滚到后端真实状态）。

### 4.4 重复安装拒绝（Install 触发）

1. 选中 `C-TEST-10`（已装 `FN-ENG-01`），点 **Install** 再次选择 `FN-ENG-01`：
   - 期望：后端拒绝重复安装，前端报错并回滚（顶部仍为 `FN-ENG-01`）。

### 4.5 空 function 拆卸拒绝（Remove 触发）

1. 选中一个未安装的组件（如 `C-TEST-02`，`Function` 为空），点 **Remove**：
   - 期望：后端返回 400（无组件可拆），前端 toast 报错，状态不变。

> 所有校验失败均回滚到后端真实状态，并以 toast 提示；成功则 `Object.assign` 同步选中对象并自动刷新历史与当前标识。

## 5. 验证要点对照表

| 验证项 | 后端行为（本轮新增） | 浏览器预期 |
|---|---|---|
| 安装写日志 | `installComponent` 写 `component_status_log` (In Use / Installed on FN) | 历史出现安装记录，顶部显示当前 function |
| 已装别处拒绝 | 抛 `IllegalArgumentException` | 报错 + 回滚 |
| 重复安装拒绝 | 同组件同 function 抛错 | 报错 + 回滚 |
| 拆卸写日志 | `removeComponent` 写日志 (Available / Removed from FN) | 历史出现拆卸记录，顶部回「未安装」 |
| 空 function 拆卸拒绝 | 抛 `IllegalArgumentException` (400) | 报错 |
| BusinessWindow 改组件 | 走后端 install/remove 命令 | 成功/失败回滚 |
| 历史加载 | `GET /maintenance/components/{id}/function-history` | 随选中异步刷新 |
| Functions Performed Install/Remove | 复用 `setFunction` 命令 | 标签页内直接安装/拆卸，与详情字段同源一致 |

## 6. 清理测试数据

`V10` 是 Flyway 自动迁移（服务启动即造数据），清理脚本**不进** Flyway，需手动执行：

```bash
docker exec -i pg17-local psql -U postgres -d amos -f /dev/stdin < \
  /Users/zhenghai/Code/fde-training-lab/prototypes/amos-server/scripts/postgres/cleanup_component_test_data.sql
```

或本机有 `psql` 时：

```bash
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d amos \
  -f /Users/zhenghai/Code/fde-training-lab/prototypes/amos-server/scripts/postgres/cleanup_component_test_data.sql
```

清理脚本会：复位 `FN-ENG-01.installed_component_no`、删除 `C-TEST-*` 产生的 `component_status_log` / `component_function_history` / `component_function_rotation`、删除 `C-TEST-*` 组件，仅影响测试数据，可重复执行。
