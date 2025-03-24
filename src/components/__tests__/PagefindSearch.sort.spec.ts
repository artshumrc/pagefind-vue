import { describe, it, expect, vi, beforeEach } from 'vitest'
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

const mockPagefind = {
  search: vi.fn().mockResolvedValue({
    results: [],
    filters: mockFilters,
    total: 0,
  }),
  filters: vi.fn().mockResolvedValue(mockFilters),
}

describe('PagefindSearch filter options user-passed sort function logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use default sorting (by count descending) when no custom sorts are provided', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
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

    // Verify filteredKeywordFilters computed property sorts by count
    const vm = wrapper.vm as any

    expect(Object.keys(vm.filteredKeywordFilters.category)).toEqual([
      'Art',
      'Technology',
      'Science',
    ])
    expect(Object.keys(vm.filteredKeywordFilters.author)).toEqual([
      'Alice Johnson',
      'John Doe',
      'Jane Smith',
    ])
  })

  it('should use defaultSortFunction prop when provided', async () => {
    // Custom alphabetical sort
    const defaultSortFunction = (a: [string, number], b: [string, number]) => {
      return a[0].localeCompare(b[0])
    }

    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        defaultSortFunction,
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

    // Verify filteredKeywordFilters computed property uses the custom default sort
    const vm = wrapper.vm as any

    expect(Object.keys(vm.filteredKeywordFilters.category)).toEqual([
      'Art',
      'Science',
      'Technology',
    ])
    expect(Object.keys(vm.filteredKeywordFilters.author)).toEqual([
      'Alice Johnson',
      'Jane Smith',
      'John Doe',
    ])
  })

  it('should use filter-specific custom sort function when provided', async () => {
    // Sort authors by name length
    const authorSort = (a: [string, number], b: [string, number]) => {
      return a[0].length - b[0].length
    }

    // Sort categories alphabetically reversed
    const categorySort = (a: [string, number], b: [string, number]) => {
      return b[0].localeCompare(a[0])
    }

    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        customSortFunctions: {
          author: authorSort,
          category: categorySort,
        },
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

    // Verify filteredKeywordFilters computed property uses the custom sorts
    const vm = wrapper.vm as any

    // Categories should be sorted in reverse alphabetical order
    expect(Object.keys(vm.filteredKeywordFilters.category)).toEqual([
      'Technology',
      'Science',
      'Art',
    ])

    // Authors should be sorted by name length
    expect(Object.keys(vm.filteredKeywordFilters.author)).toEqual([
      'John Doe',
      'Jane Smith',
      'Alice Johnson',
    ])
  })

  it('should prioritize filter-specific sort functions over defaultSortFunction', async () => {
    // Global default sort (alphabetical)
    const defaultSortFunction = (a: [string, number], b: [string, number]) => {
      return a[0].localeCompare(b[0])
    }

    // Custom sort for category only (by count)
    const categorySort = (a: [string, number], b: [string, number]) => {
      return b[1] - a[1]
    }

    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        defaultSortFunction,
        customSortFunctions: {
          category: categorySort,
        },
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

    // Verify filteredKeywordFilters computed property uses the proper sorts
    const vm = wrapper.vm as any

    // Categories should use specific sort (by count)
    expect(Object.keys(vm.filteredKeywordFilters.category)).toEqual([
      'Art',
      'Technology',
      'Science',
    ])

    // Authors should use default sort (alphabetical)
    expect(Object.keys(vm.filteredKeywordFilters.author)).toEqual([
      'Alice Johnson',
      'Jane Smith',
      'John Doe',
    ])
  })

  it('should exclude specified filter options when using excludeFilterOptions', async () => {
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        excludeFilterOptions: {
          category: ['Art'],
          author: ['Jane Smith'],
        },
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

    // Verify filteredKeywordFilters computed property excludes the specified options
    const vm = wrapper.vm as any

    // Category should not include 'Art'
    expect(Object.keys(vm.filteredKeywordFilters.category)).toEqual(['Technology', 'Science'])
    expect(Object.keys(vm.filteredKeywordFilters.category)).not.toContain('Art')

    // Author should not include 'Jane Smith'
    expect(Object.keys(vm.filteredKeywordFilters.author)).toEqual(['Alice Johnson', 'John Doe'])
    expect(Object.keys(vm.filteredKeywordFilters.author)).not.toContain('Jane Smith')
  })

  it('should sort filter groups using filterGroupSortFunction when provided', async () => {
    // Custom alphabetical sort for filter groups
    const filterGroupSortFunction = (a: string, b: string) => {
      return a.localeCompare(b)
    }

    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        filterGroupSortFunction,
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

    // Verify sortedFilterGroups computed property uses the custom sort
    const vm = wrapper.vm as any

    // Filter groups should be sorted alphabetically
    expect(vm.sortedFilterGroups).toEqual(['author', 'category'])

    // Now test with a reverse alphabetical sort
    const reverseAlphabeticalSort = (a: string, b: string) => {
      return b.localeCompare(a)
    }

    await wrapper.setProps({
      filterGroupSortFunction: reverseAlphabeticalSort,
    })

    // Filter groups should now be sorted in reverse alphabetical order
    expect(vm.sortedFilterGroups).toEqual(['category', 'author'])
  })
})
