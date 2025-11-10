<template>
  <div v-if="!pagefind" class="loading">Loading search...</div>
  <Search
    v-else
    :pagefind="pagefind"
    :filters-definition="filtersDefinition"
    :custom-sort-functions="customSortFunctions"
    :search-debounce-ms="500"
    filters-title="Search Amendments"
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
import type { CustomSortFunctions, FilterGroup, FilterSortFunction as FilterOptionsSortFunction, } from './components/types'
import { stringify } from 'querystring'
import { argv0 } from 'process'

let pagefindPath: string
if (import.meta.env.PROD) {
  pagefindPath = new URL('/pagefind-amend/pagefind.js', import.meta.url).href
} else {
  // In development, use a direct path that will be correctly resolved by Vite
  pagefindPath = '/fixtures/pagefind-amend/pagefind.js'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pagefind = ref<any>(null)

const filtersDefinition: FilterGroup[] = [
    {
    label: 'Search by Topic or Type',
    collapsible: false,
    filters: {
      topics: {
        label: 'Search by Topic',
        type: 'checkboxes',
      },
      type: {
        label: 'Search by Type',
        type: 'dropdown',
      }
    },
  },
       {
    label: 'Search by Date or Congress',
    collapsible: false,
    filters: {
      year: {
        label: 'Search by Date',
        type: 'dropdown',
      },
      congress: {
        label: 'Search by Congress',
        type: 'dropdown',
      }
    },
  },
  {
    label: 'Search by Sponsor or State',
    collapsible: false,
    filters: {
      sponsors: {
        label: 'Sponsors',
        type: 'dropdown',
      },
        state_of_origin: {
        label: 'State of Origin',
        type: 'dropdown',
      },

    },
  },
  {
    label: 'Additional Filters',
    collapsible: true,
    initiallyOpen: false,
    filters: {
      chamber: {
        label: 'Chamber',
        type: 'dropdown',
      },
     sponsor_or_proponent: {
        label: 'Sponsor or Proponent',
        type: 'dropdown',
      },
            cosponsors: {
        label: 'Cosponsors',
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
  }
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

function getCongressNumber(congress: string): number {
  const match = congress.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

function sortCongressList(a: [string, number], b: [string, number]): number {
  const congress1 = a[0]
  const congress2 = b[0]

  if (congress1.startsWith("Unknown")) {
    return -1
  } else if (congress2.startsWith("Unknown")) {
    return 1
  } else {
    const congressNum1 = getCongressNumber(congress1);
    const congressNum2 = getCongressNumber(congress2);
    return congressNum1 - congressNum2;
  }
}

const customSortFunctions: CustomSortFunctions = {
  congress: sortCongressList,
}
</script>

<style>

@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&family=Space+Grotesk:wght@300..700&display=swap');
:root {
  --color-fg-primary: #1a1a1a;   /* dark text */
  --color-fg-secondary: #909090; /* muted text */
  --color-bg-primary: #e4e2d4;   /* main background */
  --color-bg-secondary: #fff; /* card / table background */
  --color-bg-tertiary: #f1efe7; /* alternating table bg */
  --color-accent: #F4794D;
  --color-accent-contrast: #1D54ED;     /* optional accent color */

  /* extra colors */
  --blue: #527DF1;
  --ltblue: #7194F4;
  --drkorange:#F4683D;
  --lightorange:#EFC3B4;
  --drkgray: #444356;

  /* fonts */
  --body-font: 'Space Grotesk', sans-serif;
  --input-font: 'IBM Plex Sans', sans-serif;

  /* visible text input */
  --pagefind-vue-input-border: 1px solid var(--color-fg-secondary);
  --pagefind-vue-input-border-radius: 0.25rem;
  --pagefind-vue-input-font-size: 1rem;
  --pagefind-vue-input-color: black;
  --pagefind-vue-input-bg:  var(--color-bg-secondary);
  --pagefind-vue-input-padding: 0.25em 1em;

  /* dropdown container */
  --pagefind-vue-options-max-height: 200px;
  --pagefind-vue-options-z-index: 1000;
  --pagefind-vue-options-bg: var(--color-bg-secondary);
  --pagefind-vue-options-border: 1px solid var(--color-fg-secondary);

  /* individual option */
  --pagefind-vue-option-text-align: left;
  --pagefind-vue-option-padding: 0.4rem;
  --pagefind-vue-option-color: black;
  --pagefind-vue-option-font-size: 1rem;
  --pagefind-vue-option-hover-bg: #b6b6b6;
  --pagefind-vue-option-selected-bg: var(--blue);
  --pagefind-vue-option-selected-color: white;
  --pagefind-vue-option-disabled-bg: #f5f5f5;

  /* text displayed when no results match input */
  --pagefind-vue-no-results-font-style: italic;
}

/* UNIVERSAL STYLES ---------------------------------------------------------------------------- */
* {
	box-sizing: border-box;
	padding:0;
	margin:0;
	overflow-wrap: break-word;
}

body {
  background: var(--color-bg-primary);
  margin: 3em;
}

p, h1, h2, h3, h4, h2 span, li, span {
  font-family: var(--body-font);
}

a {
	text-decoration: none;
	cursor: pointer;
	color: black;
}

/* AMEND STYLES --------------- */

input, .label-text, .filterable-dropdown-container, .filterable-dropdown-option {
  font-family: var(--input-font);
}

.filterable-dropdown-option {
  align-items: flex-start;
}

button {
  background: var(--color-bg-secondary);
  border: 1px solid black;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25em;
  transition: all 0.2s ease;
  display: flex;
  font-size: 0.75rem;
  transform: scale(1);
}

.pagination button {
    justify-content: center;
}


.tabs-clear-row h2.filters-header-title {
  text-transform: uppercase;
  font-size: 1.5em;
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;

}

.filter-group-title h2 {
  font-size: 1.1em;
}

.filter-group h3 {
  font-size: 1em;
  font-weight: normal;
}

.checkbox-container {
  background: var(--color-bg-secondary);
  border-radius: 0;
}

/* search bar */
div.search-input-container {
  margin: 1rem 1rem 0 1rem;
  padding: 0 .9rem 0 -1rem;
}

div.search-input-container input#search {
  width: 100%;
  min-height: 2.4em;
  border: 1px solid var(--color-fg-secondary);
  border-radius: 0.25em;
  margin: 0.15em 0 0.25em;
  font-family: var(--input-font);

}

.active-filters-text[data-v-a73318e6] {
  text-transform: uppercase;
  color: var(--drkgray);
  font-family: var(--body-font);
  font-weight: bold
}


ul#results-list > li:nth-child(even) {
  background: var(--color-bg-secondary);
}

ul#results-list > li:nth-child(odd) {
  background: var(--color-bg-tertiary);
}

ul#results-list {
  border-radius: 0.4em;
  font-family: var(--body-font);
}


</style>

