<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal" :style="{ width: width }">
      <div class="modal-head">
        <span>{{ title }}</span>
        <button class="x" type="button" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body" :style="{ minWidth: bodyMinWidth }">
        <slot />
      </div>
      <div v-if="$slots.footer" class="modal-foot">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String, width: { type: String, default: '520px' }, bodyMinWidth: { type: String, default: '0' } })
defineEmits(['close'])
</script>
