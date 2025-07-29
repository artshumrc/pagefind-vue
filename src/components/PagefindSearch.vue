<!-- This is named "PagefindSearch" because it Vue convention to not have single-word components. It is exported and consumed as `Search`, however. -->
<template>
  <div class="search-container">
    <section v-if="showKeywordInput" class="fade-section" :class="{ visible: mounted }">
      <form class="search-form" @submit.prevent="performSearch(searchQuery)">
        <slot
          name="search-input"
          :search-query="searchQuery"
          :update-search-query="(value) => (searchQuery = value)"
        >
          <div class="input-wrapper">
            <label for="search" class="visually-hidden">Search</label>
            <div class="search-input-container">
              <MagnifyingGlass class="search-icon" size="24" color="#666" />
              <input
                id="search"
                name="search"
                size="1"
                autocomplete="off"
                v-model="searchQuery"
                placeholder="Search..."
              />
            </div>
          </div>
        </slot>
      </form>
    </section>

    <div
      class="filters-tabs-header"
      v-if="
        mounted && (Object.keys(filteredFilters).length > 0 || filtersDefinition || tabbedFilter)
      "
    >
      <div class="tabs-clear-row">
        <h2 class="filters-header-title">{{ filtersTitle }}</h2>
        <div class="tabs-results-align">
          <div class="tabs-container">
            <Tabs
              v-if="tabbedFilter"
              v-model="activeTab"
              :tabs="tabs"
              :visible="mounted"
              :filter-name="tabbedFilter"
            />
          </div>
        </div>
        <button type="button" class="clear-button" @click="clearSearch">Clear</button>
      </div>
    </div>

    <div class="content-layout">
      <Filters
        v-if="mounted && (Object.keys(filteredFilters).length > 0 || filtersDefinition)"
        :filtered-filters="filteredFilters"
        :filtered-keyword-filters="filteredKeywordFilters"
        :selected-filters="selectedFilters"
        :sorted-groups="sortedFilterGroups"
        :filters-definition="filtersDefinition"
        :custom-sort-functions="customSortFunctions"
        :checkbox-filter-threshold="checkboxFilterThreshold"
        @update:filters="handleFilterUpdate"
      >
        <template #collapse-title="slotProps">
          <slot name="collapse-title" v-bind="slotProps" />
        </template>
      </Filters>

      <Results
        v-if="mounted"
        :page-results="pageResults"
        :results="results"
        :items-per-page="itemsPerPage"
        :current-page="currentPage"
        :total-results="totalResults"
        :active-filters-text="activeFiltersText"
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
import MagnifyingGlass from './icons/MagnifyingGlass.vue'
import type { FiltersDefinition, Filter, FilterGroup, ResultData, SortOption } from './types'

const props = withDefaults(
  defineProps<{
    pagefind: any
    itemsPerPage?: number
    filtersDefinition?: FiltersDefinition | FilterGroup[]
    tabbedFilter?: string
    defaultTab?: string
    excludeFilters?: string[]
    excludeFilterOptions?: Record<string, string[]>
    customSortFunctions?: Record<string, (a: any, b: any) => number>
    filterGroupSortFunction?: (a: string, b: string, filters: Filter) => number
    defaultSortFunction?: (a: [string, number], b: [string, number]) => number
    resultSort?: SortOption
    showKeywordInput?: boolean
    checkboxFilterThreshold?: number
    filtersTitle?: string
  }>(),
  {
    showKeywordInput: true,
    itemsPerPage: 10,
    checkboxFilterThreshold: 8,
    filtersTitle: 'Filters',
  },
)

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
// Store per-tab filters
const tabFilters = ref<{ [tabValue: string]: { [key: string]: string[] } }>({})
const showKeywordInput = props.showKeywordInput
const isInitializing = ref(true)

const emit = defineEmits(['update:searchQuery'])

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
    // Skip 'page' and 'search' params, validate other filters
    if (param === 'page' || param === 'search') {
      continue
    }

    // Only validate against excludeFilters if they exist, otherwise accept all filters
    // This allows URL params to be restored even before filters.value is fully populated
    const shouldExclude = props.excludeFilters?.includes(param) ?? false
    if (!shouldExclude) {
      if (!selectedFilters.value[param]) {
        selectedFilters.value[param] = []
      }
      selectedFilters.value[param].push(value)

      if (props.tabbedFilter && param === props.tabbedFilter) {
        activeTab.value = value
      }
    }
  }

  if (props.tabbedFilter && !activeTab.value) {
    activeTab.value = props.defaultTab || ''
  }

  if (pageParam) {
    const page = parseInt(pageParam)
    currentPage.value = page > 0 ? page : 1
  }

  // Get text search query from URL
  const search = searchParams.get('search')
  if (search) {
    searchQuery.value = search
  }

  await performSearch(search, true) // initial load
  isInitializing.value = false
  mounted.value = true
})

const filteredFilters = computed(() => {
  if (!filters.value) return {}

  let result = {}

  if (props.filtersDefinition) {
    // Helper function to check if a filter key exists in filtersDefinition
    const isFilterDefined = (key: string): boolean => {
      if (!props.filtersDefinition) return false
      if (Array.isArray(props.filtersDefinition)) {
        // FilterGroup[] format - check within each group's filters
        return props.filtersDefinition.some(
          (group) => group.filters && group.filters.hasOwnProperty(key),
        )
      } else {
        // Legacy FiltersDefinition format
        return (props.filtersDefinition as FiltersDefinition)?.hasOwnProperty(key) ?? false
      }
    }

    // If the user has supplied filtersDefinition,
    // limit the filters to only those defined
    result = Object.fromEntries(
      Object.entries(filters.value).filter(
        ([key]) =>
          key !== props.tabbedFilter &&
          isFilterDefined(key) &&
          (!props.excludeFilters || !props.excludeFilters.includes(key)),
      ),
    )
  } else {
    // If no filtersDefinition, return all filters
    // and handle them with default behavior
    result = Object.fromEntries(
      Object.entries(filters.value).filter(
        ([key]) =>
          key !== props.tabbedFilter &&
          (!props.excludeFilters || !props.excludeFilters.includes(key)),
      ),
    )
  }

  // Filter out excluded filter options
  if (props.excludeFilterOptions) {
    return Object.fromEntries(
      Object.entries(result).map(([key, options]) => {
        const excludedOptions = props.excludeFilterOptions?.[key] || []
        if (excludedOptions.length > 0) {
          // Remove excluded options from this filter group
          return [
            key,
            Object.fromEntries(
              Object.entries(options as Record<string, number>).filter(
                ([option]) => !excludedOptions.includes(option),
              ),
            ),
          ]
        }
        return [key, options]
      }),
    )
  }

  return result
})

function defaultSort(a: [string, number], b: [string, number]): number {
  // Sort by facet count descending
  return b[1] - a[1]
}

function customSort(groupName: string) {
  const customSortFunction = props.customSortFunctions?.[groupName]
  // Use the custom filter-specific sort function if it exists
  if (customSortFunction) {
    return customSortFunction
  }
  // Use the default sort function provided by the user if it exists
  if (props.defaultSortFunction) {
    return props.defaultSortFunction
  }
  // Fall back to built-in default sort if no user-defined sorts are provided
  return defaultSort
}

const filteredKeywordFilters = computed(() => {
  if (!filters.value) return {}

  // First filter by key (filter group)
  let filteredByKey = Object.entries(filters.value).filter(
    ([key]) =>
      key !== props.tabbedFilter && (!props.excludeFilters || !props.excludeFilters.includes(key)),
  )

  // Then filter out excluded options within each group
  if (props.excludeFilterOptions) {
    filteredByKey = filteredByKey.map(([key, options]) => {
      const excludedOptions = props.excludeFilterOptions?.[key] || []
      if (excludedOptions.length > 0) {
        // Remove excluded options from this filter group
        return [
          key,
          Object.fromEntries(
            Object.entries(options as Record<string, number>).filter(
              ([option]) => !excludedOptions.includes(option),
            ),
          ),
        ]
      }
      return [key, options]
    })
  }

  // Finally, sort the filter options
  let f = Object.fromEntries(
    filteredByKey.map(([key, group]) => [
      key,
      Object.fromEntries(Object.entries(group).sort(customSort(key))),
    ]),
  )
  return f
})

const sortedFilterGroups = computed(() => {
  if (!filters.value) return []

  // If filtersDefinition is provided, use its order
  if (props.filtersDefinition) {
    if (Array.isArray(props.filtersDefinition)) {
      // FilterGroup[] format - get all filter keys from all groups
      const allFilterKeys: string[] = []
      props.filtersDefinition.forEach((group) => {
        Object.keys(group.filters).forEach((key) => {
          if (filteredFilters.value.hasOwnProperty(key)) {
            allFilterKeys.push(key)
          }
        })
      })
      return allFilterKeys
    } else {
      // Legacy FiltersDefinition format
      return Object.keys(props.filtersDefinition).filter((key) =>
        filteredFilters.value.hasOwnProperty(key),
      )
    }
  }

  // If filterGroupSortFunction is provided, use it
  if (props.filterGroupSortFunction) {
    return Object.keys(filteredFilters.value).sort((a, b) =>
      props.filterGroupSortFunction!(a, b, filters.value),
    )
  }

  // Fall back to alphabetical order
  return Object.keys(filteredFilters.value).sort((a, b) => a.localeCompare(b))
})

const getFilterGroupLabel = (groupName: string, filterGroup?: FilterGroup): string => {
  if (filterGroup) {
    // When using FilterGroup array, look within the group's filters
    const filterDef = filterGroup.filters[groupName]
    if (filterDef && typeof filterDef === 'object' && filterDef.label) {
      return filterDef.label
    }
  } else if (props.filtersDefinition && !Array.isArray(props.filtersDefinition)) {
    // flat format
    const filterDef = props.filtersDefinition[groupName]
    if (filterDef && typeof filterDef === 'object' && filterDef.label) {
      return filterDef.label
    }
  }

  return groupName
}

const activeFiltersText = computed(() => {
  const activeFilters: string[] = []

  // Add search query if present
  if (searchQuery.value) {
    activeFilters.push(`Searchbar: "${searchQuery.value}"`)
  }

  // Add selected filters with their display labels
  Object.entries(selectedFilters.value).forEach(([groupName, values]) => {
    if (values && values.length > 0) {
      // Get the display label for this filter group
      let groupLabel = groupName

      if (props.filtersDefinition) {
        if (Array.isArray(props.filtersDefinition)) {
          // Find the FilterGroup that contains this filter
          const filterGroup = props.filtersDefinition.find(
            (group) => group.filters && group.filters.hasOwnProperty(groupName),
          )
          if (filterGroup) {
            groupLabel = getFilterGroupLabel(groupName, filterGroup)
          }
        } else {
          groupLabel = getFilterGroupLabel(groupName)
        }
      }

      values.forEach((value) => {
        activeFilters.push(`${groupLabel}: ${value}`)
      })
    }
  })

  return activeFilters.join('; ')
})

watch(searchQuery, async (newQuery) => {
  // Skip the watcher during initial setup to avoid overwriting URL params
  if (isInitializing.value) return

  currentPage.value = 1 // reset to first page on new search
  emit('update:searchQuery', newQuery)
  await nextTick() // wait for any changes to sort type, etc before searching
  await performSearch(newQuery || null)
})

watch(
  () => activeTab.value,
  async (newValue, oldValue) => {
    // Skip the watcher during initial setup to avoid overwriting URL params
    if (isInitializing.value) return

    if (newValue) {
      if (props.tabbedFilter) {
        // save current filters for previous tab (except tabbedFilter itself)
        if (oldValue) {
          const filtersToSave: { [key: string]: string[] } = {}
          Object.entries(selectedFilters.value).forEach(([k, v]) => {
            if (k !== props.tabbedFilter) filtersToSave[k] = [...v]
          })
          tabFilters.value[oldValue] = filtersToSave
        }
        // set tab filter
        selectedFilters.value = { [props.tabbedFilter]: [newValue] }
        // sestore filters for this tab if present
        if (tabFilters.value[newValue]) {
          Object.entries(tabFilters.value[newValue]).forEach(([k, v]) => {
            selectedFilters.value[k] = [...v]
          })
        }
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
  if (!results.value) {
    pageResults.value = []
    return
  }

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

  // Save the current tab value before clearing filters
  const currentTab = activeTab.value

  selectedFilters.value = {}

  // Restore the tab filter if we have a tabbed filter
  if (props.tabbedFilter && currentTab) {
    selectedFilters.value[props.tabbedFilter] = [currentTab]
    // Keep the active tab unchanged
    activeTab.value = currentTab
  }

  currentPage.value = 1
  pageResults.value = []
  results.value = []
  tabFilters.value = {}

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
  // If using tabs, only allow filters for the current tab
  if (props.tabbedFilter && group === props.tabbedFilter) {
    selectedFilters.value[group] = [value]
    return
  }

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

async function performSearch(query: string | null, isInitialLoad: boolean = false) {
  console.log('Performing search with query:', query)
  if (!props.pagefind) return

  try {
    const searchFilters = getSearchFilters()

    let desiredSort = props.resultSort || { classification: 'asc' }

    // Only sync URL during user-initiated searches, not during initial page load
    if (!isInitialLoad) {
      updateUrlParams(currentPage.value)
    }

    // Perform main search with all filters
    const searchResults = await props.pagefind
      .search(query || null, {
        sort: desiredSort,
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
          sort: props.resultSort || { classification: 'asc' },
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

  // Add other selected filters, excluding any that are in excludeFilters
  Object.entries(selectedFilters.value).forEach(([group, values]) => {
    if (values.length > 0 && !props.excludeFilters?.includes(group)) {
      searchFilters[group] = values
    }
  })

  return searchFilters
}

function sortTabs(tabs: { label: string; value: string; count: number }[], defaultTab?: string) {
  // Check if we have a custom sort function for tabs
  if (
    props.customSortFunctions &&
    props.tabbedFilter &&
    props.customSortFunctions[props.tabbedFilter]
  ) {
    // Use the customSortFunction for the tabs
    return tabs.sort((a, b) => {
      // Convert to format expected by customSortFunctions (key-value pair)
      return props.customSortFunctions![props.tabbedFilter!]([a.value, a.count], [b.value, b.count])
    })
  }

  if (defaultTab) {
    return [
      ...tabs.filter((tab) => tab.value === defaultTab),
      ...tabs.filter((tab) => tab.value !== defaultTab).sort((a, b) => b.count - a.count),
    ]
  }

  // Default behavior: sort by count descending
  return tabs.sort((a, b) => b.count - a.count)
}

function calculateTabCounts(filtersMinusTab: Filter = {}) {
  if (!props.tabbedFilter) return
  tabs.value = sortTabs(
    Object.entries(filtersMinusTab[props.tabbedFilter] || {}).map(([value, count]) => ({
      label: value,
      value,
      count,
    })),
    props.defaultTab,
  )
}
</script>

<style>
/* Global CSS variables that can be easily overridden */
:root {
  --pagefind-vue-input-border: 1px solid #ccc;
  --pagefind-vue-input-border-radius: 0.25rem;
  --pagefind-vue-input-font-size: 1rem;
  --pagefind-vue-input-color: black;
  --pagefind-vue-input-bg: white;
  --pagefind-vue-input-padding: 0.5rem;
  --pagefind-vue-options-max-height: 200px;
  --pagefind-vue-options-z-index: 1000;
  --pagefind-vue-options-bg: white;
  --pagefind-vue-options-border: 1px solid #ccc;
  --pagefind-vue-options-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --pagefind-vue-option-text-align: left;
  --pagefind-vue-option-padding: 0.4rem;
  --pagefind-vue-option-color: black;
  --pagefind-vue-option-font-size: 1rem;
  --pagefind-vue-option-hover-bg: #b6b6b6;
  --pagefind-vue-option-selected-bg: #c1ffbe;
  --pagefind-vue-option-disabled-bg: #f5f5f5;
  --pagefind-vue-no-results-font-style: italic;
}
</style>

<style scoped>
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

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  z-index: 1;
  pointer-events: none;
}

#search {
  width: 100%;
  color: black;
  font-size: 1rem;
  padding-left: 3rem;
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

.filters-tabs-header {
  margin: 1rem 0;
  padding: 0 1rem;
}

.tabs-clear-row {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) 3fr auto;
  align-items: center;
  gap: 2rem;
}

.tabs-results-align {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  grid-column: 2;
}

.filters-header-title {
  margin: 0;
  font-size: 1.2rem;
  justify-self: start;
  flex: 0 0 auto;
}

.tabs-container {
  flex: 1;
  justify-self: start;
}

.clear-button {
  margin-left: auto;
}

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
  margin: 0;
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

  .filters-tabs-header {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .results-section {
    grid-column: span 1;
  }
}
</style>
