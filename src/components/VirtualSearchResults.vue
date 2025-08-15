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

    <div v-if="isLoading" class="loading-indicator">
      <p>Loading results...</p>
    </div>

    <!-- Virtual scrolling for large datasets -->
    <RecycleScroller
      v-else
      class="scroller"
      :items="allResults"
      :item-size="estimatedResultHeight"
      key-field="raw_url"
      v-slot="{ item }"
    >
      <div class="result-item">
        <slot name="result" :result="item">
          <div class="result">
            <a :href="item.raw_url">
              <h3>{{ item.meta?.title || 'Untitled' }}</h3>
            </a>
            <div class="flex-row">
              <img v-if="item.meta?.image" :src="item.meta.image" alt="" width="150" />
              <p class="result-excerpt" v-html="item.excerpt"></p>
            </div>
          </div>
        </slot>
      </div>
    </RecycleScroller>

    <div class="results-info">
      <p>Showing {{ loadedResultsCount }} of {{ totalResultsCount }} results</p>
      <button
        v-if="canLoadMore"
        @click="loadMoreResults"
        :disabled="isLoadingMore"
        class="load-more-btn"
      >
        {{ isLoadingMore ? 'Loading...' : 'Load More' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import type { ResultData } from './types'

interface SearchResult {
  data: () => Promise<ResultData | null>
  raw_url?: string
}

const props = defineProps({
  results: {
    type: Array as () => SearchResult[],
    default: () => [],
  },
  totalResults: Number,
  activeFiltersText: {
    type: String,
    default: '',
  },
  itemsPerPage: {
    type: Number,
    default: 50, // Load more items for virtual scrolling
  },
})

const emit = defineEmits(['perform-search'])

const allResults = ref<ResultData[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const loadedResultsCount = ref(0)
const currentBatch = ref(0)
const estimatedResultHeight = 120 // Estimated height per result item

// Computed properties
const totalResultsCount = computed(() => {
  return props.totalResults !== undefined && props.totalResults !== null
    ? props.totalResults
    : props.results.length
})

const canLoadMore = computed(() => {
  return loadedResultsCount.value < Math.min(props.results.length, totalResultsCount.value)
})

// Methods
async function loadBatch(batchIndex: number, batchSize: number = props.itemsPerPage) {
  const start = batchIndex * batchSize
  const end = Math.min(start + batchSize, props.results.length)

  if (start >= props.results.length) return []

  const batch = props.results.slice(start, end)

  try {
    const settledResults = await Promise.allSettled(batch.map((result) => result.data()))

    return settledResults
      .map((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          return result.value
        } else {
          console.warn(
            `Failed to load result ${start + index}:`,
            result.status === 'rejected' ? result.reason : 'Null result',
          )
          return null
        }
      })
      .filter((result): result is ResultData => result !== null)
  } catch (error) {
    console.error('Error loading batch:', error)
    return []
  }
}

async function loadInitialResults() {
  isLoading.value = true
  try {
    const initialBatch = await loadBatch(0)
    allResults.value = initialBatch
    loadedResultsCount.value = initialBatch.length
    currentBatch.value = 0
  } catch (error) {
    console.error('Error loading initial results:', error)
  } finally {
    isLoading.value = false
  }
}

async function loadMoreResults() {
  if (isLoadingMore.value || !canLoadMore.value) return

  isLoadingMore.value = true
  try {
    const nextBatch = currentBatch.value + 1
    const moreBatch = await loadBatch(nextBatch)

    allResults.value.push(...moreBatch)
    loadedResultsCount.value += moreBatch.length
    currentBatch.value = nextBatch
  } catch (error) {
    console.error('Error loading more results:', error)
  } finally {
    isLoadingMore.value = false
  }
}

// Watchers
watch(
  () => props.results,
  () => {
    // Reset and reload when results change
    allResults.value = []
    loadedResultsCount.value = 0
    currentBatch.value = 0
    loadInitialResults()
  },
  { immediate: true },
)

onMounted(() => {
  loadInitialResults()
})
</script>

<style scoped>
.results-section {
  padding: 1rem;
  height: 100vh; /* Full height for virtual scrolling */
  display: flex;
  flex-direction: column;
}

.scroller {
  flex: 1;
  height: 500px; /* Fixed height for virtual scrolling */
}

.result-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.active-filters-text {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.loading-indicator {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
}

.results-info {
  text-align: center;
  padding: 1rem;
  border-top: 1px solid #eee;
  margin-top: auto;
}

.load-more-btn {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
}

.load-more-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.load-more-btn:hover:not(:disabled) {
  background-color: #0056b3;
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

.result-excerpt {
  margin: 0;
}

:deep(.result-excerpt mark) {
  color: black;
}

h2 {
  margin-top: 0;
  margin-bottom: 0;
}

h3 {
  margin: 0 0 0.5rem 0;
}
</style>
