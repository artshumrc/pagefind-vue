<template>
  <div v-if="!pagefind" class="loading">Loading search...</div>
  <Search
    v-else
    :pagefind="pagefind"
    :filters-definition="filtersDefinition"
    :search-debounce-ms="500"
    :custom-sort-functions="customSortFunctions"
  >
    <template #collapse-title="{ direction, label }">
      <h2 style="padding: 0; margin: 0">
        {{ label }}
        <span class="collapse-icon">
          <ChevronIcon :direction="direction as 'up' | 'down' | 'left' | 'right'" size="22" />
        </span>
      </h2>
    </template>

    <template #result="{ result, searchQuery }">
      <AmendSearchResult :result="result" :search-query="searchQuery" />
    </template>
  </Search>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Search from './components/PagefindSearch.vue'
import AmendSearchResult from './components/AmendSearchResult.vue'
import ChevronIcon from './components/icons/ChevronIcon.vue'
import type { FilterGroup, CustomSortFunctions } from './components/types'

let pagefindPath: string
if (import.meta.env.PROD) {
  pagefindPath = new URL('/pagefind-amend/pagefind.js', import.meta.url).href
} else {
  pagefindPath = '../../fixtures/pagefind-amend/pagefind.js' // this needs to be the path relative from the file it is actually imported
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pagefind = ref<any>(null)

function sortCongressNumerically(a: [string, number], b: [string, number]): number {
  // Extract the numerical part from the beginning of the string
  const getCongressNumber = (str: string): number => {
    const match = str.match(/^(\d+)/)
    return match ? parseInt(match[1], 10) : Infinity
  }

  const numA = getCongressNumber(a[0])
  const numB = getCongressNumber(b[0])

  // Sort numerically by the extracted numbers
  return numA - numB
}

// Define customSortFunctions with the Congress sort function
const customSortFunctions: CustomSortFunctions = {
  congress: sortCongressNumerically,
}

const filtersDefinition: FilterGroup[] = [
  {
    label: 'Sponsorship',
    collapsible: true,
    filters: {
      sponsor_or_proponent: {
        label: 'Sponsor or Proponent',
        type: 'dropdown',
      },
      sponsors: {
        label: 'Sponsors',
        type: 'dropdown',
      },
      cosponsors: {
        label: 'Cosponsors',
        type: 'dropdown',
      },
    },
  },
  {
    label: 'Legislation',
    collapsible: true,
    filters: {
      congress: {
        label: 'Congress',
        type: 'dropdown',
      },
      chamber: {
        label: 'Chamber',
        type: 'dropdown',
      },
      state_of_origin: {
        label: 'State of Origin',
        type: 'dropdown',
      },
      committee_of_referral: {
        label: 'Committee of Referral',
        type: 'dropdown',
      },
      bill: {
        label: 'Bill',
        type: 'dropdown',
      },
    },
  },
  {
    label: 'Topics/Type/Year',
    collapsible: true,
    filters: {
      topics: {
        label: 'Topic',
        type: 'checkboxes',
      },
      type: {
        label: 'Type',
        type: 'dropdown',
      },
      year: {
        label: 'Year',
        type: 'dropdown',
      },
    },
  },
]

onMounted(async () => {
  try {
    const pf = await import(/* @vite-ignore */ pagefindPath)
    await pf.init()
    pagefind.value = pf
  } catch (error) {
    console.error('Failed to initialize pagefind:', error)
  }
})
</script>
