<template>
  <div>
    <div v-if="Object.keys(options).length > checkboxFilterThreshold" class="input-wrapper">
      <input
        type="text"
        v-model="filterCheckboxesTerm"
        placeholder="Filter options..."
        class="filter-input"
      />
      <button
        v-if="filterCheckboxesTerm"
        class="clear-button"
        @click="clearFilter"
        aria-label="Clear filter"
      >
        <XIcon size="16" color="#000" />
      </button>
    </div>
    <div class="checkbox-container">
      <div v-for="value in filteredOptions" :key="value" class="checkbox-group">
        <Checkbox
          :filter-group="name"
          :value="value"
          :selected-filters="selectedFilters"
          :count="options[value]"
          @update:filters="handleSelect"
        >
          {{ value }} ({{ options[value] }})
        </Checkbox>
      </div>
      <div v-if="filteredOptions.length === 0" class="no-results">No matching options</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Checkbox from './CheckboxSingle.vue'
import XIcon from './icons/XIcon.vue'
import { ref, computed } from 'vue'

const props = defineProps<{
  name: string
  options: { [key: string]: number }
  selectedFilters: { [key: string]: string[] }
  checkboxFilterThreshold: number
}>()

const emit = defineEmits<{
  'update:filters': [group: string, value: string]
}>()

const filterCheckboxesTerm = ref('')

const filteredOptions = computed(() => {
  const keys = Object.keys(props.options)
  if (!filterCheckboxesTerm.value) return keys

  return keys.filter((key) => key.toLowerCase().includes(filterCheckboxesTerm.value.toLowerCase()))
})

const handleSelect = (group: string, value: string) => {
  emit('update:filters', group, value)
}

const clearFilter = () => {
  filterCheckboxesTerm.value = ''
}
</script>

<style scoped>
.filter-input {
  width: 100%;
  padding: var(--pagefind-vue-input-padding);
  border: var(--pagefind-vue-input-border);
  border-radius: var(--pagefind-vue-input-border-radius);
  font-size: var(--pagefind-vue-input-font-size);
  box-sizing: border-box;
  margin-bottom: 2px;
  padding-right: 30px; /* Make room for the clear button */
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.clear-button {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0;
  margin: 0;
  line-height: 1;
  pointer-events: auto;
}

.checkbox-container {
  max-height: var(--pagefind-vue-options-max-height);
  overflow-y: auto;
  overflow-x: hidden;
  border: var(--pagefind-vue-input-border);
  border-radius: var(--pagefind-vue-input-border-radius);
  padding: 6px;
  /* Add scrollbar styling */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(0, 0, 0, 0.3) transparent; /* Firefox */
}

.checkbox-container::-webkit-scrollbar {
  width: 8px;
}

.checkbox-container::-webkit-scrollbar-track {
  background: transparent;
  margin: 3px;
}

.checkbox-container::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.no-results {
  color: #888;
  font-style: italic;
  padding: 10px 0;
}
</style>
