<template>
  <div v-if="tabs?.length" class="tabs fade-section" :class="{ visible: visible }">
    <div role="tablist" class="tab-buttons">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :id="`tab-${tab.value}`"
        role="tab"
        :aria-selected="modelValue === tab.value"
        :aria-controls="`panel-${tab.value}`"
        :tabindex="modelValue === tab.value ? 0 : -1"
        :class="{ active: modelValue === tab.value }"
        @click="handleTabClick(tab.value)"
        @keydown="handleTabKeydown"
      >
        {{ tab.label }} ({{ tab.count }})
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tab } from './types'

defineProps<{
  modelValue: string
  tabs: Tab[]
  visible: boolean
  filterName?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const handleTabClick = (value: string) => {
  emit('update:modelValue', value)
}

const handleTabKeydown = (event: KeyboardEvent) => {
  const tabButtons = Array.from(document.querySelectorAll('[role="tab"]'))
  const currentIndex = tabButtons.findIndex((tab) => tab === event.target)

  let newIndex: number
  switch (event.key) {
    case 'ArrowLeft':
      newIndex = currentIndex - 1
      if (newIndex < 0) newIndex = tabButtons.length - 1
      break
    case 'ArrowRight':
      newIndex = currentIndex + 1
      if (newIndex >= tabButtons.length) newIndex = 0
      break
    default:
      return
  }

  const newTab = tabButtons[newIndex] as HTMLButtonElement
  event.preventDefault()
  newTab.focus()
  newTab.click()
}
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.tab-buttons {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin: 1rem 0;
}

button {
  text-wrap-mode: nowrap;
  min-width: fit-content;
}

[role='tab'] {
  padding: 0.5rem 1rem;
  cursor: pointer;
  border: 1px solid #ccc;
  background: none;
  border-radius: 4px;
}

[role='tab'][aria-selected='true'] {
  background: #eee;
  color: black;
  border-color: #999;
  font-weight: bold !important;
}

[role='tab']:focus {
  outline: 2px solid #4caf50;
  outline-offset: 2px;
}

.fade-section {
  opacity: 0;
  transition: opacity 1s ease-out;
}

.fade-section.visible {
  opacity: 1;
}
</style>
