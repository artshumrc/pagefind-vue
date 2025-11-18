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
import { computed, ref } from 'vue'
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

// PERFORMANCE FIX: Cache the expensive Object.keys().map() operation with memoization
const dropdownOptionsCache = new Map<string, typeof dropdownOptions.value>()
const optionsCacheKey = ref('')

const dropdownOptions = computed(() => {
  // Create a cache key based on options object
  const newCacheKey = JSON.stringify(props.options)

  // Return cached result if options haven't changed
  if (optionsCacheKey.value === newCacheKey && dropdownOptionsCache.has(newCacheKey)) {
    return dropdownOptionsCache.get(newCacheKey)!
  }

  const result = Object.keys(props.options).map((value) => ({
    value,
    label: value,
    count: props.options[value],
  }))

  // Update cache
  optionsCacheKey.value = newCacheKey
  dropdownOptionsCache.set(newCacheKey, result)

  // Keep cache size reasonable (last 10 option sets)
  if (dropdownOptionsCache.size > 10) {
    const firstKey = dropdownOptionsCache.keys().next().value
    dropdownOptionsCache.delete(firstKey)
  }

  return result
})

const handleCheckboxUpdate = (group: string, value: string | string[]) => {
  if (Array.isArray(value)) {
    emit('update:filters', group, value.join(','))
  } else {
    emit('update:filters', group, value)
  }
}
</script>
