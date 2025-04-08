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
      :options="
        Object.keys(options).map((value) => ({
          value,
          label: value,
          count: options[value],
        }))
      "
      @update:model-value="$emit('update:filters', name, $event)"
    />
  </template>
</template>

<script setup lang="ts">
import FilterableDropdown from './FilterableDropdown.vue'
import CheckboxGroup from './CheckboxGroup.vue'

defineProps<{
  name: string
  options: { [key: string]: number }
  selectedFilters: { [key: string]: string[] }
  checkboxFilterThreshold: number
  filterType?: string
}>()

const emit = defineEmits<{
  'update:filters': [group: string, value: string]
}>()

const handleCheckboxUpdate = (group: string, value: string | string[]) => {
  if (Array.isArray(value)) {
    emit('update:filters', group, value.join(','))
  } else {
    emit('update:filters', group, value)
  }
}
</script>
