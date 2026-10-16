# 模块 07 Counters And Measure Points — 浏览器端手工测试验证流程

适用范围：`amos-server`（后端真实 API）+ `amos`（前端）。本轮为模块 07 首次后端化：新增计数器/测点读数日志表（`V11`）、`CounterService` / `CounterController`，前端 `counterService.js` 由本地 Mock 直写改为经后端命令持久化。

## 1. 前置条件

### 1.1 启动后端（连本地 PG 开发库）

```bash
cd amos-server
./scripts/start.sh
# 或手动：cd amos-app && SERVER_PORT=8099 mvn spring-boot:run
```

默认 `postgres` profile，连 `localhost:5432/amos`。确认 `V11` 已应用：

```bash
docker compose -f deploy/postgres/docker-compose.yml exec -T db \
  psql -U postgres -d amos -c "select version, success from flyway_schema_history order by version desc limit 3;"
```

### 1.2 启动前端

```bash
cd amos
VITE_API_TARGET=http://localhost:8099 npm run dev   # 后端在 8099 时；默认 8080 可省略
```

### 1.3 登录

`admin/admin` 登录，顶栏应为安装地点 `Traveller`、部门 `ER`、用户 `Administrator`。

## 2. 测试数据（由 `V10` + `V11` 自动造入）

| 载体 | code | description | 单位 | 初始值 | 备注 |
|---|---|---|---|---|---|
| `C-TEST-10` 计数器 | `HRS` | Running Hours | h | 900 | `depends_on = C-TEST-01`（级联用） |
| `C-TEST-10` 计数器 | `OIL` | Lub Oil Pressure | bar | 4.5 | 无依赖 |
| `C-TEST-01` 计数器 | `HRS` | Running Hours | h | 900 | 被依赖方 |
| `C-TEST-10` 测点 | `T-EXH` | Exhaust Temp | °C | 420 | 趋势 `Stable` |
| `FN-ENG-01` 功能计数器 | `HRS` | Running Hours | h | 5000 | 装在 `C-TEST-10` 上 |

`C-TEST-10` 已装于 `FN-ENG-01`（status `In Use`），这是「组件计数器读数 → 同步功能计数器」场景的前提。

## 3. 验证场景

### 场景 A：记录读数并回写计数器（核心）

1. Components 窗口 → 选中 `C-TEST-10` → `Counters` 标签 → 选中 `HRS` 行。
2. 打开 `Update Counters` 业务窗口，`New Value` 填 `1000`，`Reading Date` 填今天，`Unit` 填 `h` → Save。
3. 预期：toast 提示已持久化；`C-TEST-10` 的 `HRS` 的 `Current Value` 变为 `1000`，`Average` 按天数重算。

后端查证：

```bash
docker exec pg17-local psql -U postgres -d amos -c \
  "select code, current_value, average from component_counter cc join component c on c.id=cc.component_id where c.number='C-TEST-10' and cc.code='HRS';"
docker exec pg17-local psql -U postgres -d amos -c \
  "select component_no, code, old_value, new_value, delta, reading_date from counter_reading_log order by id desc limit 3;"
```

预期日志新增一行：`old_value=900, new_value=1000, delta=100`。

### 场景 B：同步功能计数器（dependsOn 同名功能计数器）

`C-TEST-10` 装在 `FN-ENG-01`，`FN-ENG-01` 有 `HRS`（`last_value=5000`）。

1. 同场景 A，对 `C-TEST-10` 的 `HRS` 再记一次读数，New Value 填 `1100`。
2. 预期：`FN-ENG-01` 的 `HRS` 的 `Last Value` 从 5000 变为 **5100**（按 delta=100 累加）。

```bash
docker exec pg17-local psql -U postgres -d amos -c \
  "select fc.code, fc.last_value from function_counter fc join maintenance_function f on f.id=fc.function_id where f.function_no='FN-ENG-01' and fc.code='HRS';"
```

### 场景 C：dependsOn 级联

`C-TEST-10.HRS` 的 `depends_on = C-TEST-01`。

1. 对 `C-TEST-10` 的 `HRS` 记读数（如 New Value = `1200`）。
2. 预期：`C-TEST-01` 的 `HRS` 的 `Current Value` 同步变化（实现读数级联），并各自写入 `counter_reading_log`。

```bash
docker exec pg17-local psql -U postgres -d amos -c \
  "select c.number, cc.code, cc.current_value from component_counter cc join component c on c.id=cc.component_id where cc.code='HRS' and c.number in ('C-TEST-01','C-TEST-10');"
```

### 场景 D：Set Start（归零快照）

1. `C-TEST-10` → `Counters` 标签 → 选中 `OIL` 行 → `Set Start`。
2. 预期：toast 显示已持久化，`Total at Zeroed` 快照当前值，`Average` 重置。

```bash
docker exec pg17-local psql -U postgres -d amos -c \
  "select code, start_value, current_value, average from component_counter cc join component c on c.id=cc.component_id where c.number='C-TEST-10' and cc.code='OIL';"
```

### 场景 E：Update Measure Points（测点读数）

1. `C-TEST-10` → `Measure Points` 标签 → 选中 `T-EXH`。
2. 打开 `Update Measure Points` 窗口，`Value` 填 `450`，`Trend` 选 `Rising`，`Reading Date` 填今天 → Save。
3. 预期：测点值与趋势更新；`measure_point_reading_log` 新增一行。

```bash
docker exec pg17-local psql -U postgres -d amos -c \
  "select component_no, code, old_value, new_value, trend from measure_point_reading_log order by id desc limit 3;"
```

### 场景 F：Counters Overview 查询与过滤

1. 打开 `Counters Overview` 窗口。
2. 条件：`Component = C-TEST-10` → 预期列出该组件计数器与功能计数器。
3. 条件：`Inherits from component = C-TEST-01` → 预期只列出 `depends_on = C-TEST-01` 的计数器（即 `C-TEST-10.HRS`），`Include children` 勾选时同时列出子组件。

### 场景 G：归属校验（400）

用不属于该组件的计数器记录读数，应被后端拒绝（HTTP 400），前端 toast 报错且不写库。

```bash
# 取一个属于 C-TEST-01 的 counterId，但用 C-TEST-10 的 id 去记录
curl -s -X POST http://localhost:8099/api/maintenance/components/<C-TEST-10_id>/counters/<C-TEST-01_counterId>/readings \
  -H 'Content-Type: application/json' -d '{"newValue":1,"readingDate":"2026-10-16","unit":"h"}'
# 预期 HTTP 400 + {code:400, message:..., data:null}
```

## 4. 回归检查

| 项 | 预期 |
|---|---|
| 刷新页面 / 重开窗口 | 读数日志仍在（已持久化，不再是本地 Mock） |
| 后端重启后 | 计数器当前值与历史日志保持不变 |
| 演示模式（无后端） | 相关操作回落本地 Mock，不报错 |

## 5. 自动化覆盖

后端 H2 切片测试已覆盖上述核心逻辑（7/7）：

```bash
cd amos-server && mvn -pl amos-app -am test -Dtest=CounterSliceTest
```