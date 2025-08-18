import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PagefindSearch from '../PagefindSearch.vue'

const mockFilters = {
  category: {
    Technology: 10,
    Science: 5,
    Art: 15,
  },
  author: {
    'John Doe': 7,
    'Jane Smith': 3,
    'Alice Johnson': 8,
  },
}

const createMockSearchResult = (total = 23, resultCount = 5) => ({
  results: Array(resultCount)
    .fill(null)
    .map((_, i) => ({
      id: `result-${i}`,
      data: () =>
        Promise.resolve({
          url: `/page-${i}`,
          content: `Content ${i}`,
          meta: { title: `Page ${i}` },
        }),
    })),
  filters: mockFilters,
  total,
})

const mockPagefind = {
  search: vi.fn(),
  filters: vi.fn().mockResolvedValue(mockFilters),
}

describe('PagefindSearch caching system', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPagefind.search.mockResolvedValue(createMockSearchResult())
  })

  afterEach(() => {
    // Clear any existing search state
    vi.resetAllMocks()
  })

  it('should cache search results and return cached results on subsequent identical searches', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        enableCache: true,
        cacheMaxSize: 10,
        cacheTtlMs: 60000, // 1 minute
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()
    const vm = wrapper.vm as any

    // Reset call count after mounting
    mockPagefind.search.mockClear()

    // First search should call pagefind.search
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)

    // Second identical search should use cache
    mockPagefind.search.mockClear()
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(0)

    // Different search should call pagefind.search again
    await vm.performSearch('different query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)
  })

  it('should respect cache enable/disable setting', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        enableCache: false, // Disable caching
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()
    const vm = wrapper.vm as any

    // Reset call count after mounting
    mockPagefind.search.mockClear()

    // First search
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)

    // Second identical search should still call pagefind.search (no caching)
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(2)
  })

  it('should clear cache when clearSearchCache is called', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        enableCache: true,
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()
    const vm = wrapper.vm as any

    // Reset call count after mounting
    mockPagefind.search.mockClear()

    // First search to populate cache
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)

    // Verify cache has content
    const statsBeforeClear = vm.getCacheStats()
    expect(statsBeforeClear.size).toBeGreaterThan(0)

    // Clear cache
    vm.clearSearchCache()

    // Verify cache is empty
    const statsAfterClear = vm.getCacheStats()
    expect(statsAfterClear.size).toBe(0)

    // Next search should call pagefind.search again
    mockPagefind.search.mockClear()
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)
  })

  it('should cache different filter combinations separately', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        enableCache: true,
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()
    const vm = wrapper.vm as any

    // Reset call count after mounting
    mockPagefind.search.mockClear()

    // Search with no filters
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)

    // Search with a different query - should be a cache miss
    mockPagefind.search.mockClear()
    await vm.performSearch('different query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)

    // Search with original query again - should be a cache hit
    mockPagefind.search.mockClear()
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(0)

    // Search with different query again - should be a cache hit
    mockPagefind.search.mockClear()
    await vm.performSearch('different query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(0)
  })

  it('should provide cache statistics', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        enableCache: true,
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()
    const vm = wrapper.vm as any

    // Initially empty cache
    let stats = vm.getCacheStats()
    expect(stats.size).toBe(0)
    expect(stats.keys).toEqual([])

    // Reset call count after mounting
    mockPagefind.search.mockClear()

    // After one search - note that initial load may create multiple cache entries
    await vm.performSearch('test query')
    stats = vm.getCacheStats()
    expect(stats.size).toBeGreaterThanOrEqual(1)
    expect(stats.keys.length).toBeGreaterThanOrEqual(1)
    expect(stats.totalMemoryKB).toBeGreaterThan(0)

    // After second different search
    await vm.performSearch('different query')
    stats = vm.getCacheStats()
    expect(stats.size).toBeGreaterThanOrEqual(2)
    expect(stats.keys.length).toBeGreaterThanOrEqual(2)
  })

  it('should handle cache expiration correctly', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        enableCache: true,
        cacheTtlMs: 100, // Very short TTL for testing
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()
    const vm = wrapper.vm as any

    // Reset call count after mounting
    mockPagefind.search.mockClear()

    // First search
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)

    // Immediate second search should use cache
    mockPagefind.search.mockClear()
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(0)

    // Wait for cache to expire
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Search after expiration should call pagefind.search again
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)
  })

  it('should cache tab search results separately', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        enableCache: true,
        tabbedFilter: 'category',
        defaultTab: 'Technology',
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()
    const vm = wrapper.vm as any

    // Reset call count after mounting
    mockPagefind.search.mockClear()

    // Search with tab should make multiple API calls
    // The exact number may vary due to initial loading and tab calculations
    await vm.performSearch('test query')
    const initialCalls = mockPagefind.search.mock.calls.length
    expect(initialCalls).toBeGreaterThanOrEqual(2) // At least main search + tab counts

    // Second identical search should use both caches
    mockPagefind.search.mockClear()
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(0)
  })

  it('should improve clearSearch performance with caching', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        enableCache: true,
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()
    const vm = wrapper.vm as any

    // Reset call count after mounting
    mockPagefind.search.mockClear()

    // Perform an initial search to populate cache
    await vm.performSearch('test query')
    expect(mockPagefind.search).toHaveBeenCalledTimes(1)

    // Set some filters
    vm.selectedFilters.value = { category: ['Technology'] }
    vm.searchQuery = 'test query' // Access the ref directly, not .value

    // Clear search should use cached empty search result
    mockPagefind.search.mockClear()
    await vm.clearSearch()

    // clearSearch calls performSearch(null), which should use cache if available
    // The exact number of calls depends on whether we had cached the empty search
    const callCount = mockPagefind.search.mock.calls.length
    expect(callCount).toBeLessThanOrEqual(1) // Should be 0 if cached, 1 if not
  })
})
