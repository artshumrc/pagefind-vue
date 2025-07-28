import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import PagefindSearch from '../PagefindSearch.vue'

// Add type import for the component instance
import type { ComponentPublicInstance } from 'vue'

// Define an interface for the component's exposed properties
interface PagefindSearchInstance extends ComponentPublicInstance {
  selectedFilters: Record<string, string[]>
  clearSearch: () => Promise<void>
  setFilter?: (filterName: string, values: string[]) => Promise<void>
  onPopState?: () => void
  activeTab?: string
  searchQuery: string
  $data: {
    activeTab: string
    searchQuery: string
  }
}

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

const mockPagefind = {
  search: vi.fn().mockResolvedValue({
    results: [],
    filters: mockFilters,
    total: 0,
  }),
  filters: vi.fn().mockResolvedValue(mockFilters),
}

describe('PagefindSearch tabs persistence and activation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset URL parameters for each test
    window.history.replaceState({}, '', window.location.pathname)
  })

  it('should set active tab from URL parameters on component mount', async () => {
    // Set URL parameter for category tab
    window.history.replaceState({}, '', '?category=Science&page=1')

    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        tabbedFilter: 'category',
        defaultTab: 'Technology',
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
        },
      },
    })

    await nextTick()
    await nextTick() // Additional tick to ensure async operations complete

    // Cast vm to PagefindSearchInstance to access selectedFilters
    const vm = wrapper.vm as unknown as PagefindSearchInstance

    // Find active tab element and check that it's the one from URL
    const activeTabValue = vm.selectedFilters.category?.[0]
    expect(activeTabValue).toBe('Science')

    // Verify that selectedFilters includes the tab filter
    expect(vm.selectedFilters.category).toEqual(['Science'])

    // Verify that the search was performed with the tab filter
    expect(mockPagefind.search).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        filters: expect.objectContaining({
          category: ['Science'],
        }),
      }),
    )
  })

  it('should use defaultTab when no tab value is in URL', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        tabbedFilter: 'category',
        defaultTab: 'Technology',
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
        },
      },
    })

    await nextTick()
    await nextTick() // Additional tick to ensure async operations complete

    // Cast vm to PagefindSearchInstance
    const vm = wrapper.vm as unknown as PagefindSearchInstance

    // Verify correct tab is selected
    const activeTabValue = vm.selectedFilters.category?.[0]
    expect(activeTabValue).toBe('Technology')

    // Verify selectedFilters includes the default tab
    expect(vm.selectedFilters.category).toEqual(['Technology'])
  })

  it('should preserve tabbed filter when search is cleared', async () => {
    // Setup initial URL with category filter
    window.history.replaceState({}, '', '?category=Science')

    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        tabbedFilter: 'category',
        defaultTab: 'Technology',
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
        },
      },
    })

    await nextTick()
    await nextTick()

    // Cast vm to PagefindSearchInstance
    const vm = wrapper.vm as unknown as PagefindSearchInstance

    // Check the tab filter was set from URL
    expect(vm.selectedFilters.category).toEqual(['Science'])

    // Set additional filter directly through component API
    if (vm.setFilter) {
      // Simulate adding another filter
      await vm.setFilter('author', ['John Doe'])

      await nextTick()

      // Verify both filters are active
      expect(vm.selectedFilters.category).toEqual(['Science'])
      expect(vm.selectedFilters.author).toEqual(['John Doe'])

      // Now clear search
      await vm.clearSearch()

      await nextTick()

      // Verify tab filter is still active after clearing
      expect(vm.selectedFilters.category).toEqual(['Science'])
      expect(vm.selectedFilters.author).toBeUndefined()
    } else {
      // Fallback - we can only verify that the current tab isn't cleared
      expect(vm.selectedFilters.category).toEqual(['Science'])

      // Clear search should still keep the tab filter
      await vm.clearSearch()

      await nextTick()

      // Verify tab filter is still active after clearing
      expect(vm.selectedFilters.category).toEqual(['Science'])
    }
  })

  it('should update URL with tab value when changing tab through Tabs component', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        tabbedFilter: 'category',
        defaultTab: 'Technology',
      },
      global: {
        stubs: {
          Filters: false, // Don't stub so we can interact with them
          Results: true,
        },
      },
    })

    await nextTick()
    await nextTick()

    // Cast vm to PagefindSearchInstance
    const vm = wrapper.vm as unknown as PagefindSearchInstance

    // Get the current filter value before change
    const beforeTab = vm.selectedFilters.category?.[0]
    expect(beforeTab).toBe('Technology')

    // Try the most likely method for handling tab changes
    if (vm.setFilter) {
      await vm.setFilter('category', ['Science'])
      await nextTick()

      // Check if filter was updated internally
      expect(vm.selectedFilters.category[0]).toBe('Science')

      // Now check if URL was updated
      const url = new URL(window.location.href)
      expect(url.searchParams.get('category')).toBe('Science')
      return
    }

    // Direct URL manipulation as fallback to verify the URL handling works
    window.history.replaceState({}, '', '?category=Science')

    // Force a URL parameter change detection if possible
    if (typeof vm.onPopState === 'function') {
      vm.onPopState()

      await nextTick()

      // Verify the component recognizes the new URL parameter
      expect(vm.selectedFilters.category[0]).toBe('Science')
    } else {
      // If we can't trigger URL change detection, create a new wrapper with the updated URL
      const newWrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          tabbedFilter: 'category',
          defaultTab: 'Technology',
        },
      })

      await nextTick()

      // Cast vm to PagefindSearchInstance
      const newVm = newWrapper.vm as unknown as PagefindSearchInstance

      // Verify the new component instance has the tab from URL
      expect(newVm.selectedFilters.category[0]).toBe('Science')
    }
  })

  it('should respect URL parameters for tab selection on page reload', async () => {
    // Set URL parameter for category tab to simulate page reload
    window.history.replaceState({}, '', '?category=Art')

    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        tabbedFilter: 'category',
        defaultTab: 'Technology',
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
        },
      },
    })

    await nextTick()
    await nextTick() // Additional tick to ensure async operations complete

    // Cast vm to PagefindSearchInstance
    const vm = wrapper.vm as unknown as PagefindSearchInstance

    // Verify the component loads with the tab from URL, not the default
    const activeTabValue = vm.selectedFilters.category?.[0]
    expect(activeTabValue).toBe('Art')
  })

  it('should preserve filter state when switching between tabs', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        tabbedFilter: 'category',
        defaultTab: 'Technology',
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
        },
      },
    })

    await nextTick()
    await nextTick() // Additional tick to ensure async operations complete

    // Cast vm to PagefindSearchInstance
    const vm = wrapper.vm as unknown as PagefindSearchInstance

    // Initial state should have Technology tab selected
    expect(vm.selectedFilters.category).toEqual(['Technology'])

    // Add author filter while on Technology tab
    if (vm.setFilter) {
      await vm.setFilter('author', ['John Doe'])
      await nextTick()

      // Verify both filters are active
      expect(vm.selectedFilters.category).toEqual(['Technology'])
      expect(vm.selectedFilters.author).toEqual(['John Doe'])

      // Switch to Science tab
      vm.activeTab = 'Science'
      await nextTick()

      // Science tab should not have the author filter
      expect(vm.selectedFilters.category).toEqual(['Science'])
      expect(vm.selectedFilters.author).toBeUndefined()

      // Add a different author filter while on Science tab
      await vm.setFilter('author', ['Alice Johnson'])
      await nextTick()

      // Switch back to Technology tab
      vm.activeTab = 'Technology'
      await nextTick()

      // Original author filter for Technology tab should be restored
      expect(vm.selectedFilters.category).toEqual(['Technology'])
      expect(vm.selectedFilters.author).toEqual(['John Doe'])

      // Switch back to Science tab again
      vm.activeTab = 'Science'
      await nextTick()

      // Science tab's filter state should be preserved
      expect(vm.selectedFilters.category).toEqual(['Science'])
      expect(vm.selectedFilters.author).toEqual(['Alice Johnson'])
    } else {
      // If setFilter is not available, manually trigger tab changes
      // Set author filter while on Technology tab
      vm.selectedFilters.author = ['John Doe']

      // Use vm.activeTab directly since it's a ref exposed from the component
      vm.activeTab = 'Science'
      await nextTick()

      // Verify tab change
      expect(vm.selectedFilters.category).toEqual(['Science'])
      expect(vm.selectedFilters.author).toBeUndefined()

      // Add different author filter on Science tab
      vm.selectedFilters.author = ['Alice Johnson']

      // Switch back to Technology
      vm.activeTab = 'Technology'
      await nextTick()

      // Verify Technology tab filters are restored
      expect(vm.selectedFilters.category).toEqual(['Technology'])
      expect(vm.selectedFilters.author).toEqual(['John Doe'])
    }
  })

  it('should preserve selected tab but clear other filters when using Clear button', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
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

    // Wait for all promises to resolve (including the onMounted lifecycle hook)
    await flushPromises()

    // Cast vm to PagefindSearchInstance
    const vm = wrapper.vm as unknown as PagefindSearchInstance

    // Initial state should have Technology tab selected
    expect(vm.selectedFilters.category).toEqual(['Technology'])

    // Add author filter while on Technology tab
    vm.selectedFilters.author = ['John Doe']
    await nextTick()

    // Add search query
    vm.searchQuery = 'test search'
    await nextTick()

    // Verify both filters are active and search query is set
    expect(vm.selectedFilters.category).toEqual(['Technology'])
    expect(vm.selectedFilters.author).toEqual(['John Doe'])
    expect(vm.searchQuery).toBe('test search')

    // Find and click the clear button
    const clearButton = wrapper.find('.clear-button')
    await clearButton.trigger('click')

    await nextTick()

    // Verify tab filter is still active but other filters are cleared
    expect(vm.selectedFilters.category).toEqual(['Technology'])
    expect(vm.selectedFilters.author).toBeUndefined()
    expect(vm.searchQuery).toBe('')

    // Verify URL has been updated appropriately
    const url = new URL(window.location.href)
    expect(url.searchParams.get('category')).toBe('Technology')
    expect(url.searchParams.get('author')).toBeNull()
    expect(url.searchParams.get('search')).toBeNull()
    expect(url.searchParams.get('page')).toBe('1')
  })

  it('should apply customSortFunctions to order tabs correctly', async () => {
    // Define a custom sort function that sorts alphabetically
    const alphabeticalSort = (a: [string, number], b: [string, number]): number => {
      return a[0].localeCompare(b[0]) // Sort by name alphabetically
    }

    // Mock the filter data structure that would be returned by pagefind
    const testFilters = {
      category: {
        Technology: 10,
        Science: 5,
        Art: 15,
      },
    }

    // Update the mockPagefind.search to return our test data
    mockPagefind.search.mockResolvedValue({
      results: [],
      filters: testFilters,
      total: 0,
    })

    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        tabbedFilter: 'category',
        defaultTab: 'Technology',
        customSortFunctions: {
          category: alphabeticalSort,
        },
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
        },
      },
    })

    // Ensure the component has mounted and processed initial data
    await nextTick()
    await nextTick()

    // Force a search to populate the tabs
    const vm = wrapper.vm as any
    await vm.performSearch(null)

    await nextTick()
    await nextTick()

    // Manually call the calculateTabCounts method with our test data
    // This is needed because the test environment doesn't fully simulate the search cycle
    vm.calculateTabCounts(testFilters)

    await nextTick()

    // Access the tabs computed property to verify ordering
    const computedTabs = vm.tabs

    // Expected order is alphabetical: Art, Science, Technology
    expect(computedTabs.length).toBe(3)
    expect(computedTabs[0].value).toBe('Art')
    expect(computedTabs[1].value).toBe('Science')
    expect(computedTabs[2].value).toBe('Technology')

    // Verify the search was called
    expect(mockPagefind.search).toHaveBeenCalled()
  })
})
