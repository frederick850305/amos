<template>
  <Modal :title="title || 'Lookup'" width="460px" @close="$emit('cancel')">
    <input v-model="q" class="amos-input" placeholder="输入关键字自动定位…" style="margin-bottom:10px" />
    <div style="max-height:320px;overflow:auto;border:1px solid var(--amos-border);border-radius:6px">
      <table class="amos-grid">
        <thead><tr><th style="width:40%">Code</th><th>Description</th></tr></thead>
        <tbody>
          <tr
            v-for="o in filtered"
            :key="o.code"
            :class="{ selected: o.code === sel }"
            @click="sel = o.code"
            @dblclick="choose(o)"
          >
            <td>{{ o.code }}</td>
            <td>{{ o.label }}</td>
          </tr>
          <tr v-if="!filtered.length"><td colspan="2" class="muted" style="text-align:center;padding:14px">无匹配项</td></tr>
        </tbody>
      </table>
    </div>
    <template #footer>
      <button class="amos-btn" @click="$emit('cancel')">Cancel</button>
      <button class="amos-btn primary" :disabled="!sel" @click="choose(filtered.find((o) => o.code === sel))">OK</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from './Modal.vue'

const props = defineProps({ title: String, options: { type: Array, default: () => [] } })
const emit = defineEmits(['select', 'cancel'])

const q = ref('')
const sel = ref('')
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return props.options
  return props.options.filter((o) => (o.code + ' ' + o.label).toLowerCase().includes(s))
})
function choose(o) {
  if (o) emit('select', o.code)
}
</script>
