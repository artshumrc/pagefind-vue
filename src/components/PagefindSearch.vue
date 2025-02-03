<template>
  <div class="search-container">
    <section class="border-bottom fade-section" :class="{ visible: mounted }">
      <form class="search-form" @submit.prevent="performSearch(searchQuery)">
        <div class="input-wrapper">
          <label for="search" class="visually-hidden">Search</label>
          <input id="search" name="search" size="1" autocomplete="off" v-model="searchQuery" />
        </div>
        <button type="button" class="clear-button" @click="clearSearch">Clear</button>
      </form>
    </section>

    <Tabs
      v-if="tabbedFilter"
      v-model="activeTab"
      :tabs="tabs"
      :visible="mounted"
      :filter-name="tabbedFilter"
    />

    <div class="content-layout">
      <Filters
        v-if="mounted && Object.keys(filteredFilters).length > 0"
        :checkbox-to-dropdown-breakpoint="checkboxToDropdownBreakpoint || 5"
        :filtered-filters="filteredFilters"
        :filtered-keyword-filters="filteredKeywordFilters"
        :selected-filters="selectedFilters"
        :sorted-groups="sortedFilterGroups"
        :filters-definition="filtersDefinition"
        @update:filters="handleFilterUpdate"
      />

      <Results
        v-if="mounted"
        :page-results="pageResults"
        :results="results"
        :items-per-page="itemsPerPage"
        :current-page="currentPage"
        @update-url-params="updateUrlParams"
        @perform-search="performSearch"
      >
        <template #result="{ result }">
          <slot name="result" :result="result" />
        </template>
      </Results>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import Tabs from './Tabs.vue'
import Filters from './SearchFilters.vue'
import Results from './SearchResults.vue'
import type { FiltersDefinition, Filter, ResultData } from './types'

const props = defineProps<{
  pagefind: any
  itemsPerPage?: number
  filtersDefinition?: FiltersDefinition
  tabbedFilter?: string
  defaultTab?: string
  excludeFilters?: string[]
  checkboxToDropdownBreakpoint?: number
}>()

const searchQuery = ref('')
const results = ref<any[]>([]) // raw search results
const pageResults = ref<(ResultData | null)[]>([]) // results scoped to current page
const filters = ref<Filter>({})
const mounted = ref(false)
const tabs = ref<{ label: string; value: string; count: number }[]>([])
const itemsPerPage = props.itemsPerPage || 10
const currentPage = ref(1)
const totalResults = ref(0)
const activeTab = ref('')
const selectedFilters = ref<{ [key: string]: string[] }>({})

const validFilterKeys = computed(() => {
  // Any filters not returned from this should not be sent to Pagefind
  return filters.value
    ? Object.keys(filters.value).filter((key) => !props.excludeFilters?.includes(key))
    : []
})

onMounted(async () => {
  if (props.pagefind) {
    const initialFilters = await props.pagefind.filters()
    filters.value = initialFilters
  }

  const searchParams = new URLSearchParams(window.location.search)
  const pageParam = searchParams.get('page')

  // Load all filter values from URL
  selectedFilters.value = {}
  for (const [param, value] of searchParams.entries()) {
    // validate which filters should be sent to Pagefind
    if (validFilterKeys.value.includes(param)) {
      if (!selectedFilters.value[param]) {
        selectedFilters.value[param] = []
      }
      selectedFilters.value[param].push(value)
    }
  }

  if (pageParam) {
    const page = parseInt(pageParam)
    currentPage.value = page > 0 ? page : 1
  }

  if (props.tabbedFilter && !activeTab.value) {
    activeTab.value = props.defaultTab || ''
  }

  // Get text search query from URL
  const search = searchParams.get('search')
  if (search) {
    searchQuery.value = search
  }

  await performSearch(search)
  mounted.value = true
})

const filteredFilters = computed(() => {
  if (!filters.value) return {}

  if (props.filtersDefinition) {
    // If the user has supplied filtersDefinition,
    // limit the filters to only those defined
    return Object.fromEntries(
      Object.entries(filters.value).filter(
        ([key]) => key !== props.tabbedFilter && props.filtersDefinition?.hasOwnProperty(key),
      ),
    )
  }

  // If no filtersDefinition, return all filters
  // and handle them with default behavior
  return Object.fromEntries(
    Object.entries(filters.value).filter(
      ([key]) =>
        key !== props.tabbedFilter &&
        (!props.excludeFilters || !props.excludeFilters.includes(key)),
    ),
  )
})

const filteredKeywordFilters = computed(() => {
  if (!filters.value) return {}

  return Object.fromEntries(
    Object.entries(filters.value)
      .filter(
        ([key]) =>
          key !== props.tabbedFilter &&
          (!props.excludeFilters || !props.excludeFilters.includes(key)),
      )
      .map(([key, group]) => [
        key,
        Object.fromEntries(Object.entries(group).sort(([, a], [, b]) => b - a)),
      ]),
  )
})

const sortedFilterGroups = computed(() => {
  if (!filters.value) return []
  return Object.keys(filteredFilters.value).sort(
    (a, b) => Object.keys(filters.value[b]).length - Object.keys(filters.value[a]).length,
  )
})

watch(searchQuery, async (newQuery) => {
  currentPage.value = 1 // reset to first page on new search
  await performSearch(newQuery || null)
})

watch(
  () => activeTab.value,
  async (newValue) => {
    if (newValue) {
      if (props.tabbedFilter) {
        selectedFilters.value[props.tabbedFilter] = [newValue]
      }
      updateUrlParams(currentPage.value)
      await performSearch(searchQuery.value)
    }
  },
)

/**
 * Updates the URL parameters to reflect the current search state, including page number,
 * search query, and selected filters. This keeps the URL in sync with the search UI.
 * Aside from the page number, all other values are acquired from state (ref) variables.
 */
const updateUrlParams = (page: number) => {
  const url = new URL(window.location.href)
  // Clear all existing filter params first
  for (const key of Array.from(url.searchParams.keys())) {
    if (key !== 'page') {
      url.searchParams.delete(key)
    }
  }

  url.searchParams.set('page', page.toString())
  if (searchQuery.value) {
    url.searchParams.set('search', searchQuery.value)
  }

  // Only add non-empty filter values
  Object.entries(selectedFilters.value).forEach(([group, values]) => {
    if (values && values.length > 0) {
      values.forEach((value) => {
        if (value) {
          url.searchParams.append(group, value)
        }
      })
    }
  })

  window.history.replaceState({}, '', url)
}

async function updateCurrentPageResults() {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage

  // have to await each result to get data, so only await the page results for better performance
  const newPageResults = results.value.slice(start, end)
  const processed = await Promise.all(newPageResults.map((result) => result.data()))

  pageResults.value = processed
}

/**
 * Updates the internal state with new search results and filter data,
 * then refreshes the displayed page results.
 */
const updateFiltersAndResults = async (searchResults: any) => {
  results.value = searchResults.results
  totalResults.value = searchResults.total
  filters.value = searchResults.filters // Add this line to update filters
  await updateCurrentPageResults()
}

/**
 * Resets the search interface to its initial state, clearing all filters,
 * search query, and URL parameters.
 */
const clearSearch = async () => {
  // Reset all state first
  searchQuery.value = ''
  selectedFilters.value = {}
  if (props.defaultTab) {
    activeTab.value = props.defaultTab
  }
  currentPage.value = 1
  pageResults.value = []
  results.value = []

  // Clear URL parameters
  const url = new URL(window.location.href)
  url.searchParams.forEach((_, key) => {
    url.searchParams.delete(key)
  })
  url.searchParams.set('page', '1')
  window.history.replaceState({}, '', url)

  // Clear filter inputs
  document.querySelectorAll('.choice-filter-input').forEach((input) => {
    ;(input as HTMLInputElement).value = ''
  })

  // Wait for state updates befure updating results or else the Pagination component state will not be updated
  await nextTick()
  await performSearch(null)
}

// passed to FilterableDropdown
/**
 * Handles updates to filter selections, managing the addition and removal
 * of filter values and triggering a new search.
 * When any filter is updated, this function is called.
 */
const handleFilterUpdate = (group: string, value: string) => {
  // Initialize the group if it doesn't exist
  if (!selectedFilters.value[group]) {
    selectedFilters.value[group] = []
  }

  if (!value) {
    // If value is empty, remove the filter group entirely or results will be 0
    delete selectedFilters.value[group]
  } else {
    const index = selectedFilters.value[group].indexOf(value)

    if (index === -1) {
      // Add value if not present
      selectedFilters.value[group].push(value)
    } else {
      // Remove just this value
      selectedFilters.value[group].splice(index, 1)
      if (selectedFilters.value[group].length === 0) {
        delete selectedFilters.value[group]
      }
    }
  }

  performSearch(searchQuery.value)
}

async function performSearch(query: string | null) {
  if (!props.pagefind) return

  try {
    const searchFilters = getSearchFilters()

    // Sync URL before performing search
    updateUrlParams(currentPage.value)

    // Perform main search with all filters
    const searchResults = await props.pagefind
      .search(query || null, {
        sort: { classification: 'asc' },
        filters: searchFilters,
      })
      .catch((error: Error) => {
        console.error('Main search failed:', error)
        return { results: [], filters: {}, total: 0 }
      })

    // Calculate tab counts if needed
    if (props.tabbedFilter) {
      // Perform secondary search without tab filter
      const filtersWithoutTab = { ...searchFilters }
      delete filtersWithoutTab[props.tabbedFilter]

      const searchMinusTab = await props.pagefind
        .search(query || null, {
          sort: { classification: 'asc' },
          filters: filtersWithoutTab,
        })
        .catch((error: Error) => {
          console.error('Tab count search failed:', error)
          return { filters: {} }
        })

      // Update UI with results
      await updateFiltersAndResults(searchResults)
      calculateTabCounts(searchMinusTab.filters)

      // Handle tab selection
      if (!activeTab.value && tabs.value.length > 0) {
        activeTab.value = props.defaultTab || tabs.value[0].value
      }
    } else {
      // Update UI with results for non-tabbed search
      await updateFiltersAndResults(searchResults)
    }
  } catch (error) {
    console.error('Search failed:', error)
    results.value = []
    pageResults.value = []
    totalResults.value = 0
  }
}

function getSearchFilters() {
  const searchFilters: { [key: string]: string[] } = {}

  // Add tab filter if using tabs and one is selected
  if (props.tabbedFilter && activeTab.value) {
    searchFilters[props.tabbedFilter] = [activeTab.value]
  }

  // Add other selected filters
  Object.entries(selectedFilters.value).forEach(([group, values]) => {
    if (values.length > 0) {
      searchFilters[group] = values
    }
  })

  return searchFilters
}

/**
 * Calculates and updates the counts for each tab based on the current search results,
 * excluding the tabbed filter itself to get accurate counts.
 */
function calculateTabCounts(filtersMinusTab: Filter = {}) {
  if (!props.tabbedFilter) return
  tabs.value = Object.entries(filtersMinusTab[props.tabbedFilter] || {}).map(([value, count]) => ({
    label: value,
    value,
    count,
  }))
}
</script>

<style scoped>
/* TODO: check if all these are still needed here */
.visually-hidden {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.search-input {
  width: 100%;
}

form {
  width: 100%;
}

.search-form {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: center;
  justify-content: center;
}

.input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

#search {
  width: 100%;
  color: black;
  font-size: 1rem;
}

#results-list > li {
  list-style-type: none;
}

.search-container {
  width: 100%;
}

section.results-section {
  padding: 1rem;
}

/* recreating AOS fade in in a few lines, maybe remove it as a dependency completely? */
.fade-section {
  opacity: 0;
  transition: opacity 1s ease-out;
}

.fade-section.visible {
  opacity: 1;
}
/* end AOS */

.content-layout {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) 3fr;
  gap: 2rem;
  align-items: start;
}

.results-section {
  grid-column: 2;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-style: normal;
  text-wrap-mode: nowrap;
  min-width: fit-content;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tabs {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.tabs button {
  padding: 0.5rem 1rem;
  cursor: pointer;
  border: 1px solid #ccc;
  background: none;
  border-radius: 4px;
}

.tabs button.active {
  background: #eee;
  border-color: #999;
}

.tab-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin: 1rem 0;
}

[role='tab'] {
  padding: 0.5rem 1rem;
  cursor: pointer;
  border: 1px solid #ccc;
  background: none;
  border-radius: 4px;
}

[role='tab'][aria-selected='true'] {
  background: #eee;
  color: black;
  border-color: #999;
  font-weight: bold !important;
}

[role='tab']:focus {
  outline: 2px solid #4caf50;
  outline-offset: 2px;
}

#results-list mark {
  color: black;
}

@media (max-width: 768px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .results-section {
    grid-column: span 1;
  }
}
</style>
