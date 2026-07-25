<template>
  <div class="gs">
    <div class="panel" style="max-width:780px">
      <div class="panel-head"><h3>Global Search</h3><span class="sub">跨 Installation / Department 查询</span></div>
      <div class="panel-body">
        <div class="info-card">
          <p><strong>手册 P21-23 说明：</strong>Global Search 不是一个独立的搜索页面，而是每个业务窗口 Filter 面板内置的功能开关。</p>
        </div>

        <h4 style="margin:16px 0 8px;color:#2c486a">使用方法</h4>
        <ol class="steps">
          <li>打开任意业务窗口（如 <strong>Maintenance › Components</strong>）</li>
          <li>点击工具栏的 <strong>Find / Filter</strong> 按钮，打开过滤对话框</li>
          <li>勾选对话框顶部的 <strong>☑ Global Search</strong> 复选框</li>
          <li>切换到新出现的 <strong>Departments</strong> 标签页</li>
          <li>选择要搜索的目标 Installation / Department（可多选）</li>
          <li>点 <strong>OK</strong>，窗口即进入 Global 模式</li>
        </ol>

        <h4 style="margin:16px 0 8px;color:#2c486a">Global 模式特征</h4>
        <ul class="feats">
          <li>列表新增 <strong>Inst / Dept</strong> 列，显示每条记录所属部门</li>
          <li>标题栏徽标变为绿色 <code style="background:#e4f7e8;padding:1px 6px;border-radius:999px;font-size:11.5px">🌐 Global：N Dept</code></li>
          <li>数据来自所有选中的 Department（不再仅限当前 Dept 范围）</li>
          <li>仍可同时使用 Basic / Advanced 过滤条件进一步筛选</li>
        </ul>

        <div class="info-card accent" style="margin-top:14px">
          <p><strong>适用窗口：</strong>Components · Work Orders · Stock Items （以及所有带 Filter 的窗口）</p>
          <p style="margin-top:4px"><strong>系统参数：</strong>"Limit Global Search to Departmental Access" 控制是否仅显示有权限的 Dept 结果。</p>
        </div>

        <div style="margin-top:18px;text-align:center">
          <button class="amos-btn primary" @click="goComponents">打开 Components 窗口体验</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { openWindow } from '../store.js'
function goComponents() { openWindow('components') }
</script>

<style scoped>
.gs { padding: 16px; height: 100%; overflow: auto; }
.panel-body { padding: 14px; }
.info-card { background:#f5f8fb;border:1px solid #d4e0ec;border-radius:8px;padding:12px 14px;font-size:13.5px;line-height:1.55;color:#3a4a5c;margin-bottom:10px; }
.info-card.accent { background:#f0f7ee;border-color:#b8d9bc; }
.steps { padding-left:20px;font-size:13.2px;line-height:1.75;color:#3a4a5c; }
.steps li { margin-bottom:4px; }
.feats { padding-left:20px;font-size:13.2px;line-height:1.75;color:#3a4a5c; }
.feats li { margin-bottom:4px; }
</style>
