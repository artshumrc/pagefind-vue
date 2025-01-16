<template>
  <div class="checkbox-group">
    <div v-for="value in Object.keys(options)" :key="value">
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
  </div>
</template>

<script setup lang="ts">
import Checkbox from './CheckboxSingle.vue'

defineProps<{
  name: string
  options: { [key: string]: number }
  selectedFilters: { [key: string]: string[] }
}>()

const emit = defineEmits<{
  'update:filters': [group: string, value: string]
}>()

const handleSelect = (group: string, value: string) => {
  emit('update:filters', group, value)
}
</script>

<style scoped>
.checkbox-group {
  width: 100%;
}
</style>
