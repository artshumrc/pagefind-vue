<template>
  <div v-if="!pagefind" class="loading">Loading search...</div>
  <Search
    v-else
    :pagefind="pagefind"
    :tabbed-filter="tabbedFilter"
    :default-tab="defaultTab"
    :exclude-filters="excludeFilters"
    :custom-sort-functions="customSortFunctions"
  >
  </Search>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Search from './components/PagefindSearch.vue'
import type { FilterSortFunction, CustomSortFunctions } from './components/types'

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

const abundanceSortList = ['Very rare', 'Extremely rare', 'Very common', 'Common']

const tabbedFilter = 'Classification'
const defaultTab = 'Species'
const excludeFilters = ['Entry Type']

// Create a direct sort function instead of a function that returns a sort function
function sortByList(list: string[]): FilterSortFunction {
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

// Define customSortFunctions with the correct type
const customSortFunctions: CustomSortFunctions = {
  Abundance: sortByList(abundanceSortList),
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
