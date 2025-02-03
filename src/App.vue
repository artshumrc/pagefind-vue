<template>
  <div v-if="!pagefind" class="loading">Loading search...</div>
  <Search
    v-else
    :pagefind="pagefind"
    :tabbed-filter="tabbedFilter"
    :default-tab="defaultTab"
    :exclude-filters="excludeFilters"
  >
  </Search>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Search from './components/PagefindSearch.vue'

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

const tabbedFilter = 'Classification'
const defaultTab = 'Species'
const excludeFilters = ['Entry Type']
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
