<template>
  <template v-if="filterType === 'checkboxes'">
    <CheckboxGroup
      :name="name"
      :options="options"
      :selected-filters="selectedFilters"
      :checkbox-filter-threshold="checkboxFilterThreshold"
      @update:filters="handleCheckboxUpdate"
    />
  </template>
  <template v-else-if="filterType === 'dropdown' || !filterType">
    <FilterableDropdown
      :name="name"
      :model-value="selectedFilters[name]?.[0] || ''"
      :options="dropdownOptions"
      @update:model-value="$emit('update:filters', name, $event)"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FilterableDropdown from './FilterableDropdown.vue'
import CheckboxGroup from './CheckboxGroup.vue'

const props = defineProps<{
  name: string
  options: { [key: string]: number }
  selectedFilters: { [key: string]: string[] }
  checkboxFilterThreshold: number
  filterType?: string
}>()

const emit = defineEmits<{
  'update:filters': [group: string, value: string]
}>()

// PERFORMANCE FIX: Cache the expensive Object.keys().map() operation
const dropdownOptions = computed(() =>
  Object.keys(props.options).map((value) => ({
    value,
    label: value,
    count: props.options[value],
  })),
)

const handleCheckboxUpdate = (group: string, value: string | string[]) => {
  if (Array.isArray(value)) {
    emit('update:filters', group, value.join(','))
  } else {
    emit('update:filters', group, value)
  }
}
</script>
