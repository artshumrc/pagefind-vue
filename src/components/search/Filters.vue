<template>
  <aside class="filters-sidebar fade-section" :class="{ 'visible': mounted }">
    <h2 style="margin-bottom: 1rem;">Filters</h2>

    <div v-for="(filterGroup, groupName) in filteredFilters" 
         :key="groupName" 
         class="filter-group">
      <template v-if="filterGroup && Object.values(filterGroup).some(value => value > 0)">
        <h3>{{ groupName }}</h3>
        <FilterComponent
          :name="groupName"
          :options="filteredKeywordFilters[groupName]"
          :selected-filters="selectedFilters"
          :checkbox-to-dropdown-breakpoint="checkboxToDropdownBreakpoint"
          :filter-type="filtersDefinition?.[groupName]"
          @update:filters="handleSingleSelect"
        />
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import FilterComponent from './FilterComponent.vue';
import type { FiltersDefinition } from './types';

const props = defineProps<{
  filteredFilters: Record<string, { [key: string]: number }>;
  filteredKeywordFilters: { [key: string]: { [key: string]: number } };
  selectedFilters: { [key: string]: string[] };
  checkboxToDropdownBreakpoint: number;
  multiSelectFilters?: string[];
  filtersDefinition?: FiltersDefinition;
}>();

const emit = defineEmits(['update:filters']);

const mounted = ref(false);

onMounted(() => {
  mounted.value = true;
});

const handleSingleSelect = (group: string, value: string | string[]) => {
  emit('update:filters', group, value);
};
</script>

<style scoped>
.filters-sidebar {
  padding: 1rem;
  border-right: 1px solid #ccc;
  grid-column: 1;
}

.filter-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.filter-group div {
  text-align: left;
  width: 100%;
}

.filter-group h3 {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.filter-group ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.filter-group li {
  margin: 0.5rem 0;
}

.filter-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.filter-group input[type="checkbox"] {
  cursor: pointer;
}

.filter-group input[type="text"] {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .filters-sidebar {
    border-right: none;
    border-bottom: 1px solid #ccc;
  }
}
</style>
