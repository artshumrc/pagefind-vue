<template>
  <div class="checkbox-option">
    <label :class="{ disabled: count === 0 }">
      <span class="checkbox-wrapper">
        <input
          type="checkbox"
          :checked="isSelected"
          :disabled="count === 0"
          @change="handleChange"
        />
      </span>
      <span class="label-text"><slot></slot></span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  filterGroup: string
  value: string
  selectedFilters: { [key: string]: string[] }
  count: number
}>()

const emit = defineEmits<{
  'update:filters': [group: string, value: string]
}>()

const isSelected = computed(() => {
  return props.selectedFilters[props.filterGroup]?.includes(props.value) || false
})

const handleChange = () => {
  emit('update:filters', props.filterGroup, props.value)
}
</script>

<style>
:root {
  --pagefind-vue-checkbox-option-margin: 0.5rem 0;
  --pagefind-vue-checkbox-label-padding: 0.1rem 1.5rem;
  --pagefind-vue-checkbox-label-font-size: 1rem;
  --pagefind-vue-checkbox-input-size: 1rem;
}
</style>

<style scoped>
.checkbox-option {
  margin: var(--pagefind-vue-checkbox-option-margin);
  position: relative;
  width: 100%;
}

.checkbox-option label {
  display: block;
  position: relative;
  cursor: pointer;
  min-height: 1.2rem;
}

.checkbox-wrapper {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.label-text {
  display: block;
  text-align: left;
  font-size: var(--pagefind-vue-checkbox-label-font-size);
  padding: var(--pagefind-vue-checkbox-label-padding);
}

.checkbox-option input[type='checkbox'] {
  margin: 0;
  padding: 0;
  cursor: pointer;
  width: 1.2rem;
  height: var(--pagefind-vue-checkbox-input-size);
}

.checkbox-option label.disabled {
  opacity: 0.5;
  cursor: default;
}

.checkbox-option label.disabled input[type='checkbox'] {
  cursor: default;
}
</style>
