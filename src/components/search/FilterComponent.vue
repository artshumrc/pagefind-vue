<template>
  <template
    v-if="
      filterType === 'checkboxes' ||
      (!filterType && Object.keys(options).length < checkboxToDropdownBreakpoint)
    "
  >
    <CheckboxGroup
      :name="name"
      :options="options"
      :selected-filters="selectedFilters"
      @update:filters="handleCheckboxUpdate"
    />
  </template>
  <template v-else>
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

const props = defineProps<{
  name: string
  options: { [key: string]: number }
  selectedFilters: { [key: string]: string[] }
  checkboxToDropdownBreakpoint: number
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
