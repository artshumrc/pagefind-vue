<template>
  <div v-if="!pagefind" class="loading">Loading search...</div>
  <Search
    v-else
    :pagefind="pagefind"
    :tabbed-filter="tabbedFilter"
    :default-tab="defaultTab"
    :exclude-filters="excludeFilters"
    :custom-sort-functions="customSortFunctions"
    :default-sort-function="customDefaultSort"
    :exclude-filter-options="excludOptions"
    :filter-group-sort-function="sortFilterGroupsByList"
    :filters-definition="filtersDefinition"
  >
  </Search>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Search from './components/PagefindSearch.vue'
import type {
  FilterSortFunction as FilterOptionsSortFunction,
  CustomSortFunctions,
  FiltersDefinition,
  Filter,
} from './components/types'

let pagefindPath: string
if (import.meta.env.PROD) {
  pagefindPath = new URL('/pagefind/pagefind.js', import.meta.url).href
} else {
  pagefindPath = '../../fixtures/pagefind/pagefind.js' // this needs to be the path relative from the file it is actually imported
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pagefind = ref<any>(null)

onMounted(async () => {
  try {
    const pf = await import(/* @vite-ignore */ pagefindPath)
    await pf.init()
    pagefind.value = pf
  } catch (error) {
    console.error('Failed to initialize pagefind:', error)
  }
})

// Define filters configuration
const filtersDefinition: FiltersDefinition = {
  'Crystal system': {
    type: 'checkboxes',
    label: 'Crystal System',
  },
  Abundance: 'checkboxes',
  Distribution: 'checkboxes',
  'Status at Tsumeb': {
    type: 'checkboxes',
    label: 'Status at Tsumeb',
  },
  Occurence: {
    type: 'dropdown',
    label: 'Paragenesis',
  },
}

const abundanceSortList = ['Very rare', 'Extremely rare', 'Very common', 'Common']
const excludOptions = {
  Abundance: ['N/A'],
}

const tabbedFilter = 'Classification'
const defaultTab = 'Species'
const excludeFilters = ['Entry Type']

// Create a direct sort function instead of a function that returns a sort function
function sortByList(list: string[]): FilterOptionsSortFunction {
  return (a: [string, number], b: [string, number]): number => {
    // Check if either value is in the priority list
    const indexA = list.indexOf(a[0])
    const indexB = list.indexOf(b[0])

    // Case 1: Both strings are in the priority list
    if (indexA >= 0 && indexB >= 0) {
      return indexA - indexB // Sort by priority list order
    }

    // Case 2: Only a is in the priority list
    if (indexA >= 0) {
      return -1 // a comes first
    }

    // Case 3: Only b is in the priority list
    if (indexB >= 0) {
      return 1 // b comes first
    }

    // Case 4: Neither is in priority list, sort by facet count
    return b[1] - a[1]
  }
}

const sortedFilterList = ['Occurence', 'Crystal system', 'Abundance', 'Status at Tsumeb']
function sortFilterGroupsByList(a: string, b: string, filters: Filter): number {
  // Check if either value is in the priority list
  const indexA = sortedFilterList.indexOf(a)
  const indexB = sortedFilterList.indexOf(b)

  // Case 1: Both strings are in the priority list
  if (indexA >= 0 && indexB >= 0) {
    return indexA - indexB // Sort by priority list order
  }

  // Case 2: Only a is in the priority list
  if (indexA >= 0) {
    return -1 // a comes first
  }

  // Case 3: Only b is in the priority list
  if (indexB >= 0) {
    return 1 // b comes first
  }

  // Case 4: Neither is in priority list, sort by number of filter options
  return Object.keys(filters[b] || {}).length - Object.keys(filters[a] || {}).length
}

// Define customSortFunctions with the correct type
const customSortFunctions: CustomSortFunctions = {
  Abundance: sortByList(abundanceSortList),
}

function customDefaultSort(a: [string, number], b: [string, number]): number {
  // Sort by facet count ascending (internal default is descending)
  return b[1] - a[1]
}
</script>

<style scoped>
body {
  background-color: rgb(48, 48, 48);
}

.loading {
  text-align: center;
  padding: 2rem;
  font-style: italic;
}
</style>
