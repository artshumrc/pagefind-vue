import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PagefindSearch from '../PagefindSearch.vue'
import type { FilterGroup, FiltersDefinition } from '../types'

// Add type import for the component instance
import type { ComponentPublicInstance } from 'vue'

interface PagefindSearchInstance extends ComponentPublicInstance {
  selectedFilters: Record<string, string[]>
  filteredFilters: Record<string, Record<string, number>>
  sortedFilterGroups: string[]
}

// Helper function to mount component and wait for async operations
async function mountAndWait(component: any, options: any = {}) {
  const wrapper = mount(component, options)
  await nextTick()
  // Give time for async operations to complete
  await new Promise((resolve) => setTimeout(resolve, 10))
  return wrapper
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
  tags: {
    javascript: 12,
    vue: 8,
    css: 5,
  },
  level: {
    beginner: 20,
    intermediate: 15,
    advanced: 8,
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

describe('PagefindSearch Filter Groups Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', window.location.pathname)
  })

  describe('filteredFilters computed property with FilterGroups', () => {
    it('filters correctly when using FilterGroup array format', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Group 1',
          filters: {
            category: 'dropdown',
            tags: 'checkboxes',
          },
        },
        {
          label: 'Group 2',
          filters: {
            author: 'dropdown',
            // level is intentionally excluded
          },
        },
      ]

      const wrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      const instance = wrapper.vm as unknown as unknown as PagefindSearchInstance

      // Should only include filters defined in the filter groups
      expect(Object.keys(instance.filteredFilters)).toEqual(
        expect.arrayContaining(['category', 'tags', 'author']),
      )
      expect(Object.keys(instance.filteredFilters)).not.toContain('level')
    })

    it('excludes tabbed filter from filteredFilters', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Group 1',
          filters: {
            category: 'dropdown',
            author: 'dropdown',
          },
        },
      ]

      const wrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
          tabbedFilter: 'category', // category should be excluded from regular filters
        },
      })

      await nextTick()

      const instance = wrapper.vm as unknown as PagefindSearchInstance

      // category should not be in filteredFilters since it's the tabbedFilter
      expect(Object.keys(instance.filteredFilters)).not.toContain('category')
      expect(Object.keys(instance.filteredFilters)).toContain('author')
    })

    it('handles excludeFilters property with filter groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Group 1',
          filters: {
            category: 'dropdown',
            author: 'dropdown',
            tags: 'checkboxes',
          },
        },
      ]

      const wrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
          excludeFilters: ['author'], // author should be excluded
        },
      })

      await nextTick()

      const instance = wrapper.vm as unknown as PagefindSearchInstance

      expect(Object.keys(instance.filteredFilters)).toContain('category')
      expect(Object.keys(instance.filteredFilters)).toContain('tags')
      expect(Object.keys(instance.filteredFilters)).not.toContain('author')
    })

    it('applies excludeFilterOptions with filter groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Group 1',
          filters: {
            category: 'dropdown',
          },
        },
      ]

      const wrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
          excludeFilterOptions: {
            category: ['Science', 'Art'], // Should exclude Science and Art options
          },
        },
      })

      await nextTick()

      const instance = wrapper.vm as unknown as PagefindSearchInstance

      // Should only contain Technology
      expect(instance.filteredFilters.category).toEqual({
        Technology: 10,
      })
      expect(instance.filteredFilters.category).not.toHaveProperty('Science')
      expect(instance.filteredFilters.category).not.toHaveProperty('Art')
    })
  })

  describe('sortedFilterGroups computed property with FilterGroups', () => {
    it('maintains order defined in FilterGroup array', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Second Group',
          filters: {
            author: 'dropdown',
          },
        },
        {
          label: 'First Group',
          filters: {
            category: 'dropdown',
            tags: 'checkboxes',
          },
        },
      ]

      const wrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      const instance = wrapper.vm as unknown as PagefindSearchInstance

      // Should maintain the order from the FilterGroup array
      expect(instance.sortedFilterGroups).toEqual(['author', 'category', 'tags'])
    })

    it('only includes filters that actually exist in filteredFilters', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Mixed Group',
          filters: {
            category: 'dropdown',
            nonexistent: 'dropdown', // This doesn't exist in mockFilters
            author: 'dropdown',
          },
        },
      ]

      const wrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      const instance = wrapper.vm as unknown as PagefindSearchInstance

      // Should only include existing filters
      expect(instance.sortedFilterGroups).toEqual(expect.arrayContaining(['category', 'author']))
      expect(instance.sortedFilterGroups).not.toContain('nonexistent')
    })

    it('falls back to alphabetical order when no filtersDefinition is provided', async () => {
      const wrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          // No filtersDefinition provided
        },
      })

      await nextTick()

      const instance = wrapper.vm as unknown as PagefindSearchInstance

      // Should be in alphabetical order
      const sorted = [...instance.sortedFilterGroups].sort((a, b) => a.localeCompare(b))
      expect(instance.sortedFilterGroups).toEqual(sorted)
    })

    it('uses filterGroupSortFunction when provided', async () => {
      const customSortFunction = (a: string, b: string) => {
        // Sort in reverse alphabetical order
        return b.localeCompare(a)
      }

      const wrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filterGroupSortFunction: customSortFunction,
          // No filtersDefinition provided, so custom sort should be used
        },
      })

      await nextTick()

      const instance = wrapper.vm as unknown as PagefindSearchInstance

      // Should be in reverse alphabetical order
      const reverseSorted = [...Object.keys(instance.filteredFilters)].sort((a, b) =>
        b.localeCompare(a),
      )
      expect(instance.sortedFilterGroups).toEqual(reverseSorted)
    })
  })

  describe('Filter definition type detection', () => {
    it('correctly identifies string filter type in FilterGroup', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'String Type Group',
          filters: {
            category: 'dropdown', // string format
          },
        },
      ]

      const wrapper = await mountAndWait(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
        },
        global: {
          stubs: {
            SearchResults: true,
            Tabs: true,
          },
        },
      })

      // Wait for the component to be fully mounted and filters to be loaded
      await new Promise((resolve) => setTimeout(resolve, 50))

      const searchFiltersComponent = wrapper.findComponent({ name: 'SearchFilters' })
      expect(searchFiltersComponent.exists()).toBe(true)

      const filterComponents = searchFiltersComponent.findAllComponents({ name: 'FilterComponent' })

      expect(filterComponents.length).toBeGreaterThan(0)
      // The filter type should be passed correctly to FilterComponent
      expect(filterComponents[0].props('filterType')).toBe('dropdown')
    })

    it('correctly identifies object filter type in FilterGroup', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Object Type Group',
          filters: {
            category: {
              type: 'checkboxes',
              label: 'Content Category',
            },
          },
        },
      ]

      const wrapper = await mountAndWait(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
        },
        global: {
          stubs: {
            SearchResults: true,
            Tabs: true,
          },
        },
      })

      // Wait for the component to be fully mounted and filters to be loaded
      await new Promise((resolve) => setTimeout(resolve, 50))

      const searchFiltersComponent = wrapper.findComponent({ name: 'SearchFilters' })
      expect(searchFiltersComponent.exists()).toBe(true)

      const filterComponents = searchFiltersComponent.findAllComponents({ name: 'FilterComponent' })

      expect(filterComponents.length).toBeGreaterThan(0)
      expect(filterComponents[0].props('filterType')).toBe('checkboxes')
    })

    it('handles mixed string and object definitions in same group', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Mixed Definitions Group',
          filters: {
            category: 'dropdown', // string format
            author: {
              type: 'checkboxes',
              label: 'Article Author',
            }, // object format
          },
        },
      ]

      const wrapper = await mountAndWait(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
        },
        global: {
          stubs: {
            SearchResults: true,
            Tabs: true,
          },
        },
      })

      // Wait for the component to be fully mounted and filters to be loaded
      await new Promise((resolve) => setTimeout(resolve, 50))

      const searchFiltersComponent = wrapper.findComponent({ name: 'SearchFilters' })
      expect(searchFiltersComponent.exists()).toBe(true)

      const filterComponents = searchFiltersComponent.findAllComponents({ name: 'FilterComponent' })

      expect(filterComponents.length).toBeGreaterThanOrEqual(2)

      // Find the components by their name prop
      const categoryFilter = filterComponents.find((comp) => comp.props('name') === 'category')
      const authorFilter = filterComponents.find((comp) => comp.props('name') === 'author')

      expect(categoryFilter?.props('filterType')).toBe('dropdown')
      expect(authorFilter?.props('filterType')).toBe('checkboxes')
    })
  })

  describe('Filter label resolution', () => {
    it('uses custom labels from FilterDefinitionObject in FilterGroups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Custom Labels Group',
          filters: {
            category: {
              type: 'dropdown',
              label: 'Article Category',
            },
            author: {
              type: 'dropdown',
              label: 'Content Author',
            },
          },
        },
      ]

      const wrapper = await mountAndWait(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
        },
        global: {
          stubs: {
            SearchResults: true,
            Tabs: true,
          },
        },
      })

      // Wait for the component to be fully mounted and filters to be loaded
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Check that the filtersDefinition prop is passed correctly to SearchFilters
      const searchFiltersComponent = wrapper.findComponent({ name: 'SearchFilters' })
      expect(searchFiltersComponent.exists()).toBe(true)
      expect(searchFiltersComponent.props('filtersDefinition')).toEqual(filterGroups)
    })

    it('falls back to filter key when no custom label is provided', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'No Custom Labels Group',
          filters: {
            category: 'dropdown', // string format, no custom label
            author: {
              type: 'dropdown',
              // no label property
            },
          },
        },
      ]

      const wrapper = await mountAndWait(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: filterGroups,
        },
        global: {
          stubs: {
            SearchResults: true,
            Tabs: true,
          },
        },
      })

      // Wait for the component to be fully mounted and filters to be loaded
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Check that the filtersDefinition prop is passed correctly to SearchFilters
      const searchFiltersComponent = wrapper.findComponent({ name: 'SearchFilters' })
      expect(searchFiltersComponent.exists()).toBe(true)
      expect(searchFiltersComponent.props('filtersDefinition')).toEqual(filterGroups)
    })
  })

  describe('Legacy compatibility in filter processing', () => {
    it('processes legacy FiltersDefinition the same way as before', async () => {
      const legacyDefinition: FiltersDefinition = {
        category: 'dropdown',
        author: {
          type: 'checkboxes',
          label: 'Article Author',
        },
      }

      const wrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: legacyDefinition,
        },
      })

      await nextTick()

      const instance = wrapper.vm as unknown as PagefindSearchInstance

      // Should include both filters
      expect(Object.keys(instance.filteredFilters)).toContain('category')
      expect(Object.keys(instance.filteredFilters)).toContain('author')

      // Should maintain the same filtering behavior
      expect(instance.filteredFilters.category).toEqual(mockFilters.category)
      expect(instance.filteredFilters.author).toEqual(mockFilters.author)
    })

    it('handles transition from legacy to FilterGroup array seamlessly', async () => {
      // First mount with legacy format
      const legacyWrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: {
            category: 'dropdown',
            author: 'dropdown',
          },
        },
      })

      await nextTick()

      const legacyInstance = legacyWrapper.vm as unknown as PagefindSearchInstance

      // Now mount with FilterGroup array format
      const newWrapper = mount(PagefindSearch, {
        props: {
          pagefind: mockPagefind,
          filtersDefinition: [
            {
              label: 'Migrated Group',
              filters: {
                category: 'dropdown',
                author: 'dropdown',
              },
            },
          ],
        },
      })

      await nextTick()

      const newInstance = newWrapper.vm as unknown as PagefindSearchInstance

      // Should produce the same filteredFilters result
      expect(Object.keys(legacyInstance.filteredFilters)).toEqual(
        Object.keys(newInstance.filteredFilters),
      )
      expect(legacyInstance.filteredFilters.category).toEqual(newInstance.filteredFilters.category)
      expect(legacyInstance.filteredFilters.author).toEqual(newInstance.filteredFilters.author)
    })
  })
})
