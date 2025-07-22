<template>
  <aside class="filters-sidebar fade-section" :class="{ visible: mounted }">
    <h2 style="margin-bottom: 1rem">Filters</h2>

    <!-- Handle FilterGroup[] format -->
    <template v-if="isFilterGroupArray(filtersDefinition)">
      <div
        v-for="filterGroup in filtersDefinition"
        :key="filterGroup.label"
        class="filter-group-container"
      >
        <div
          v-if="filterGroup.collapsible !== false"
          class="filter-group-header filter-group-button"
          @click="toggleGroup(filterGroup.label)"
          tabindex="0"
          role="button"
          :aria-expanded="openGroups.has(filterGroup.label) ? 'true' : 'false'"
          @keydown.enter="toggleGroup(filterGroup.label)"
          @keydown.space.prevent="toggleGroup(filterGroup.label)"
        >
          <slot
            name="collapse-title"
            :direction="openGroups.has(filterGroup.label) ? 'up' : 'down'"
            :label="filterGroup.label"
          >
            <h2 class="filter-group-title">
              {{ filterGroup.label }}
              <span class="collapse-icon">
                <ChevronIcon
                  :direction="openGroups.has(filterGroup.label) ? 'up' : 'down'"
                  size="20"
                />
              </span>
            </h2>
          </slot>
        </div>
        <div v-else class="filter-group-header">
          <h2 class="filter-group-title">{{ filterGroup.label }}</h2>
        </div>

        <Transition name="collapse">
          <div
            v-if="filterGroup.collapsible === false || openGroups.has(filterGroup.label)"
            class="filter-group-content"
          >
            <div
              v-for="groupName in Object.keys(filterGroup.filters)"
              :key="groupName"
              class="filter-group"
            >
              <template
                v-if="
                  filteredFilters[groupName] &&
                  Object.values(filteredFilters[groupName]).some((value) => value > 0)
                "
              >
                <h3>{{ getFilterGroupLabel(groupName, filterGroup) }}</h3>
                <FilterComponent
                  :name="groupName"
                  :options="filteredKeywordFilters[groupName]"
                  :selected-filters="selectedFilters"
                  :filter-type="getFilterType(groupName, filterGroup)"
                  :checkbox-filter-threshold="checkboxFilterThreshold"
                  @update:filters="handleSingleSelect"
                />
              </template>
            </div>
          </div>
        </Transition>
      </div>
    </template>

    <!-- Handle group-less FiltersDefinition format -->
    <template v-else>
      <div v-for="groupName in sortedGroups" :key="groupName" class="filter-group">
        <template
          v-if="
            filteredFilters[groupName] &&
            Object.values(filteredFilters[groupName]).some((value) => value > 0)
          "
        >
          <h3>{{ getFilterGroupLabel(groupName) }}</h3>
          <FilterComponent
            :name="groupName"
            :options="filteredKeywordFilters[groupName]"
            :selected-filters="selectedFilters"
            :filter-type="getFilterType(groupName)"
            :checkbox-filter-threshold="checkboxFilterThreshold"
            @update:filters="handleSingleSelect"
          />
        </template>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FilterComponent from './FilterComponent.vue'
import type { FiltersDefinition, FilterGroup } from './types'
import ChevronIcon from '../components/icons/ChevronIcon.vue'

const props = defineProps<{
  filteredFilters: Record<string, { [key: string]: number }>
  filteredKeywordFilters: { [key: string]: { [key: string]: number } }
  selectedFilters: { [key: string]: string[] }
  checkboxFilterThreshold: number
  multiSelectFilters?: string[]
  filtersDefinition?: FiltersDefinition | FilterGroup[]
  sortedGroups?: string[]
}>()

const emit = defineEmits(['update:filters'])

const mounted = ref(false)
const openGroups = ref<Set<string>>(new Set())

onMounted(() => {
  mounted.value = true
  initializeOpenGroups()
})

// Check if filtersDefinition is an array of FilterGroup
const isFilterGroupArray = (def: any): def is FilterGroup[] => {
  return Array.isArray(def)
}

// Initialize open groups based on initiallyOpen property
const initializeOpenGroups = () => {
  if (isFilterGroupArray(props.filtersDefinition)) {
    const initiallyOpenGroups = props.filtersDefinition
      .filter((group) => group.initiallyOpen !== false)
      .map((group) => group.label)
    openGroups.value = new Set(initiallyOpenGroups)
  }
}

// Toggle group open/closed state
const toggleGroup = (groupLabel: string) => {
  if (openGroups.value.has(groupLabel)) {
    openGroups.value.delete(groupLabel)
  } else {
    openGroups.value.add(groupLabel)
  }
}

const handleSingleSelect = (group: string, value: string | string[]) => {
  emit('update:filters', group, value)
}

// Get the proper widget type from filtersDefinition
const getFilterType = (groupName: string, filterGroup?: FilterGroup): string | undefined => {
  if (filterGroup) {
    // When using FilterGroup array, look within the group's filters
    const filterDef = filterGroup.filters[groupName]
    if (typeof filterDef === 'string') {
      return filterDef
    } else if (filterDef && typeof filterDef === 'object') {
      return filterDef.type
    }
  } else if (props.filtersDefinition && !isFilterGroupArray(props.filtersDefinition)) {
    // Legacy format
    const filterDef = props.filtersDefinition[groupName]
    if (typeof filterDef === 'string') {
      return filterDef
    } else if (filterDef && typeof filterDef === 'object') {
      return filterDef.type
    }
  }

  return undefined
}

// Get filter group label (if customized)
const getFilterGroupLabel = (groupName: string, filterGroup?: FilterGroup): string => {
  if (filterGroup) {
    // When using FilterGroup array, look within the group's filters
    const filterDef = filterGroup.filters[groupName]
    if (filterDef && typeof filterDef === 'object' && filterDef.label) {
      return filterDef.label
    }
  } else if (props.filtersDefinition && !isFilterGroupArray(props.filtersDefinition)) {
    // Legacy format
    const filterDef = props.filtersDefinition[groupName]
    if (filterDef && typeof filterDef === 'object' && filterDef.label) {
      return filterDef.label
    }
  }

  return groupName
}
</script>

<style scoped>
.filters-sidebar {
  padding: 1rem;
  border-right: 1px solid #ccc;
  grid-column: 1;
}

.filter-group-header {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.filter-group-button {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.filter-group-button:hover {
  background-color: #e9ecef;
}

.filter-group-title {
  margin: 0;
  font-size: 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.collapse-icon {
  transition: transform 0.2s ease;
  font-size: 0.8rem;
}

.filter-group-content {
  padding-left: 1rem;
  overflow: hidden;
}

.collapse-enter-active,
.collapse-leave-active {
  transition:
    max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 1000px;
  opacity: 1;
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

.filter-group input[type='checkbox'] {
  cursor: pointer;
}

.filter-group input[type='text'] {
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
