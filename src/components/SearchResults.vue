<template>
  <section
    class="border-bottom fade-section results-section"
    :class="{ visible: true }"
    role="tabpanel"
  >
    <div v-if="activeFiltersText" class="active-filters-text">
      {{ activeFiltersText }}
    </div>
    <h2>{{ totalResultsCount }} Result<span v-if="totalResultsCount !== 1">s</span></h2>
    <hr class="results-headder-content-separator" />
    <ul id="results-list">
      <li v-for="result in componentPageResults" :key="result?.raw_url">
        <template v-if="result">
          <slot name="result" :result="result">
            <div class="result">
              <a :href="result.raw_url">
                <h3>{{ result.meta.title }}</h3>
              </a>
              <div class="flex-row">
                <img v-if="result.meta.image" :src="result.meta.image" alt="" width="150" />
                <p class="result-excerpt" v-html="result.excerpt"></p>
              </div>
            </div>
          </slot>
        </template>
      </li>
    </ul>
    <Pagination
      :current-page="componentCurrentPage"
      :total-items="props.results.length"
      :items-per-page="props.itemsPerPage"
      :reset-scroll-on-page-change="props.resetScrollOnPageChange"
      @page-change="handlePageChange"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import Pagination from './Pagination.vue'
import type { ResultData } from './types'

interface SearchResult {
  data: () => Promise<ResultData | null>
}

const props = defineProps({
  results: {
    type: Array as () => SearchResult[],
    default: () => [], // Provide a default empty array
  },
  pageResults: {
    type: Array as () => (ResultData | null)[],
    default: () => [],
  },
  itemsPerPage: {
    type: Number,
    default: 10,
  },
  currentPage: Number,
  totalResults: Number,
  activeFiltersText: {
    type: String,
    default: '',
  },
  resetScrollOnPageChange: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update-page', 'update-url-params', 'perform-search'])

const componentCurrentPage = ref<number>(props.currentPage || 1)
const componentPageResults = ref<(ResultData | null)[]>(props.pageResults)

// Computed property for total results count
const totalResultsCount = computed(() => {
  return props.totalResults !== undefined && props.totalResults !== null
    ? props.totalResults
    : props.results.length
})

onMounted(async () => {
  await updateCurrentPageResults()
})

// Add watcher for results length changes
watch(
  () => props.results.length,
  () => {
    // Reset to page 1 when results change
    componentCurrentPage.value = 1
    emit('update-url-params', 1)
    updateCurrentPageResults()
  },
)

watch(componentCurrentPage, async () => {
  await updateCurrentPageResults()
})

// these watchers are needed to update the state of this component
// when `currentPage` in `Search.vue` is reset by `clearSearch`.
watch(
  () => props.pageResults,
  (newPageResults) => {
    componentPageResults.value = newPageResults
  },
)

watch(
  () => props.currentPage,
  (newPage) => {
    if (newPage) componentCurrentPage.value = newPage
    updateCurrentPageResults()
  },
  { immediate: true, flush: 'sync' },
)

const handlePageChange = (page: number) => {
  componentCurrentPage.value = page
  emit('update-page', page)
  emit('update-url-params', page)
  updateCurrentPageResults()
}

async function updateCurrentPageResults() {
  const start = (componentCurrentPage.value - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage

  // have to await each result to get data, so only await the page results
  const newPageResults = props.results.slice(start, end)
  const processed = await Promise.all(newPageResults.map((result) => result.data()))

  componentPageResults.value = processed
}
</script>

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

.results-section {
  padding: 1rem;
}

.active-filters-text {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.result {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin-bottom: 1rem;
  justify-content: center;
}

.flex-row {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}

#results-list > li {
  list-style-type: none;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-style: normal;
}

:deep(.result-excerpt mark) {
  color: black;
}

h2 {
  margin-top: 0;
  margin-bottom: 0;
}
</style>
