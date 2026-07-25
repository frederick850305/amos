<template>
  <div class="tn">
    <div
      class="tn-node"
      :class="{ active: selectedId === node.id }"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
      @click="onClick"
      @contextmenu.prevent="$emit('contextmenu', { node, event: $event })"
    >
      <button v-if="hasChildren" class="tn-toggle" @click.stop="$emit('toggle', node.id)">
        {{ isExpanded ? '▾' : '▸' }}
      </button>
      <span v-else class="tn-toggle" />
      <span class="tn-ico" :class="node.type">{{ node.type === 'function' ? '◈' : '▣' }}</span>
      <span class="tn-no" v-if="showNumber && node.no">{{ node.no }}</span>
      <span class="tn-label">{{ node.label }}</span>
      <span
        v-if="node.type === 'function' && node.criticality"
        class="tn-crit"
        :style="{ background: critColor(node.criticality) }"
        :title="'Criticality: ' + node.criticality"
      />
      <span class="tn-tag" v-if="node.status">{{ node.status }}</span>
    </div>
    <div v-if="isExpanded && hasChildren" class="tn-children">
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :show-number="showNumber"
        :depth="depth + 1"
        :selected-id="selectedId"
        :expanded-ids="expandedIds"
        @select="$emit('select', $event)"
        @open-component="$emit('open-component', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { lookups } from '../mock/index.js'
const props = defineProps({
  node: { type: Object, required: true },
  showNumber: { type: Boolean, default: true },
  depth: { type: Number, default: 0 },
  selectedId: { type: String, default: '' },
  expandedIds: { type: Set, default: () => new Set() },
})
const emit = defineEmits(['select', 'open-component', 'toggle', 'contextmenu'])
const hasChildren = computed(() => props.node.children && props.node.children.length)
const isExpanded = computed(() => props.expandedIds.has(props.node.id))
// 手册 P44-P46：Criticality 颜色编码指示器（colour-coded indicator），颜色来自 FunctionCriticality 注册表
function critColor(v) {
  const list = lookups.criticalities()
  const found = list.find((c) => c.code === v)
  return found ? found.color : '#bdc3c7'
}
function onClick() {
  emit('select', props.node)
  if (props.node.type === 'component') emit('open-component', props.node.no)
}
</script>

<style scoped>
.tn-node { display: flex; align-items: center; gap: 4px; padding: 3px 6px; border-radius: 5px; cursor: pointer; font-size: 12.5px; }
.tn-node:hover { background: #eef3fb; }
.tn-node.active { background: #d7e6fb; }
.tn-toggle { width: 16px; height: 16px; border: none; background: transparent; cursor: pointer; color: #6b7c93; font-size: 11px; }
.tn-ico { font-size: 12px; }
.tn-ico.function { color: #2a5ca8; }
.tn-ico.component { color: #1f9d63; }
.tn-no { font-family: 'SF Mono', ui-monospace, monospace; color: #8a4b00; font-size: 11.5px; background: #fff4e3; padding: 0 5px; border-radius: 4px; }
.tn-label { color: #2c3e50; }
.tn-crit { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; box-shadow: 0 0 0 1px rgba(0,0,0,0.08) inset; }
.tn-tag { margin-left: auto; font-size: 10.5px; color: #7b8aa0; }
</style>
