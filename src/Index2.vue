<template>
  <div v-if="!pagefind" class="loading">Loading search...</div>
  <Search
    v-else
    :pagefind="pagefind"
    :default-sort-function="customDefaultSort"
    :result-sort="alphaSort"
    :show-search="false"
  >
  </Search>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Search from './components/PagefindSearch.vue'
import { SortOption } from './components/types'

let pagefindPath: string
if (import.meta.env.PROD) {
  pagefindPath = new URL('/pagefind/pagefind.js', import.meta.url).href
} else {
  pagefindPath = '../../fixtures/pagefind-darth/pagefind.js' // this needs to be the path relative from the file it is actually imported
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

function customDefaultSort(a: [string, number], b: [string, number]): number {
  // Sort by facet count ascending (internal default is descending)
  return a[1] - b[1]
}

const alphaSort: SortOption = {title: 'asc'}
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
