import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PagefindSearch from '../PagefindSearch.vue'
import type { FilterGroup } from '../types'

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
    'web-development': 12,
    'machine-learning': 8,
    design: 5,
    tutorial: 15,
    research: 3,
    beginner: 20,
    advanced: 7,
    intermediate: 10,
  },
  difficulty: {
    beginner: 25,
    intermediate: 15,
    advanced: 10,
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

// Helper function to mount component and wait for it to be ready
async function mountAndWait(props: any) {
  const wrapper = mount(PagefindSearch, {
    props: {
      pagefind: mockPagefind,
      ...props,
    },
    global: {
      stubs: {
        Tabs: true,
        Results: true,
      },
    },
  })

  await nextTick()
  await nextTick() // Additional tick to ensure async operations complete
  await new Promise((resolve) => setTimeout(resolve, 100)) // Wait for async onMounted

  return wrapper
}

describe('PagefindSearch with Filter Groups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset URL parameters for each test
    window.history.replaceState({}, '', window.location.pathname)
  })

  describe('Filter Groups Integration', () => {
    it('renders filter groups correctly when filtersDefinition is an array', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Content Organization',
          collapsible: true,
          initiallyOpen: true,
          filters: {
            category: 'dropdown',
            tags: 'checkboxes',
          },
        },
        {
          label: 'Metadata',
          collapsible: true,
          initiallyOpen: false,
          filters: {
            author: 'dropdown',
            difficulty: 'dropdown',
          },
        },
      ]

      const wrapper = await mountAndWait({
        filtersDefinition: filterGroups,
      })

      // Check that Filters component is rendered
      const filtersComponent = wrapper.find('.filters-sidebar')
      expect(filtersComponent.exists()).toBe(true)

      // Check that filter groups are rendered
      expect(wrapper.text()).toContain('Content Organization')
      expect(wrapper.text()).toContain('Metadata')

      // Check that the filter groups have the expected structure
      const filterGroupContainers = wrapper.findAll('.filter-group-container')
      expect(filterGroupContainers).toHaveLength(2)

      // Check collapsible state
      const filterButtons = wrapper.findAll('.filter-group-button')
      expect(filterButtons[0].attributes('aria-expanded')).toBe('true') // initiallyOpen: true
      expect(filterButtons[1].attributes('aria-expanded')).toBe('false') // initiallyOpen: false
    })

    it('filters only show filters defined in filter groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Selected Filters Only',
          collapsible: false,
          filters: {
            category: 'dropdown',
            author: 'dropdown',
            // Note: tags and difficulty are excluded
          },
        },
      ]

      const wrapper = await mountAndWait({
        filtersDefinition: filterGroups,
      })

      // Check that only the defined filters are rendered
      expect(wrapper.text()).toContain('category')
      expect(wrapper.text()).toContain('author')
      expect(wrapper.text()).not.toContain('difficulty') // should be excluded

      // tags filter should not appear as an h3 heading (it's used as options)
      const filterHeadings = wrapper.findAll('h3').map((h) => h.text())
      expect(filterHeadings).toContain('category')
      expect(filterHeadings).toContain('author')
      expect(filterHeadings).not.toContain('difficulty')
      expect(filterHeadings).not.toContain('tags')
    })

    it('handles mixed string and object filter definitions', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Mixed Definitions',
          collapsible: false,
          filters: {
            category: 'dropdown', // string format
            author: {
              type: 'dropdown',
              label: 'Content Author',
            }, // object format
          },
        },
      ]

      const wrapper = await mountAndWait({
        filtersDefinition: filterGroups,
      })

      // Both filters should be available
      expect(wrapper.text()).toContain('category')
      expect(wrapper.text()).toContain('Content Author') // custom label
      expect(wrapper.text()).not.toContain('author') // original key should not be visible as label
    })

    it('supports collapsible filter groups with proper state management', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Collapsible Group 1',
          collapsible: true,
          initiallyOpen: true,
          filters: {
            category: 'dropdown',
          },
        },
        {
          label: 'Collapsible Group 2',
          collapsible: true,
          initiallyOpen: false,
          filters: {
            author: 'dropdown',
          },
        },
      ]

      const wrapper = await mountAndWait({
        filtersDefinition: filterGroups,
      })

      // Check that collapsible groups are rendered with correct initial states
      const filterButtons = wrapper.findAll('.filter-group-button')
      expect(filterButtons).toHaveLength(2)

      // First group should be open initially
      expect(filterButtons[0].attributes('aria-expanded')).toBe('true')
      // Second group should be closed initially
      expect(filterButtons[1].attributes('aria-expanded')).toBe('false')

      // Toggle the second group
      await filterButtons[1].trigger('click')
      await nextTick()

      expect(filterButtons[1].attributes('aria-expanded')).toBe('true')
    })

    it('maintains filter state when using filter groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Test Group',
          collapsible: false,
          filters: {
            category: 'dropdown',
            author: 'dropdown',
          },
        },
      ]

      const wrapper = await mountAndWait({
        filtersDefinition: filterGroups,
      })

      // Simulate filter selection by clicking on a dropdown option
      const categoryDropdown = wrapper.find('#category_visible_input')
      await categoryDropdown.trigger('focus')
      await nextTick()

      const technologyOption = wrapper.find('#category_option_Technology')
      await technologyOption.trigger('click')
      await nextTick()

      // Check that search was triggered with the filter
      expect(mockPagefind.search).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          filters: expect.objectContaining({
            category: ['Technology'],
          }),
        }),
      )
    })

    it('handles filter updates correctly with filter groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Update Test Group',
          collapsible: false,
          filters: {
            category: 'dropdown',
            tags: 'checkboxes',
          },
        },
      ]

      const wrapper = await mountAndWait({
        filtersDefinition: filterGroups,
      })

      // Test category filter update (dropdown)
      const categoryDropdown = wrapper.find('#category_visible_input')
      await categoryDropdown.trigger('focus')
      await nextTick()

      const technologyOption = wrapper.find('#category_option_Technology')
      await technologyOption.trigger('click')
      await nextTick()

      // Test tags filter update (checkbox)
      const firstCheckbox = wrapper.find('input[type="checkbox"]')
      await firstCheckbox.setValue(true)
      await nextTick()

      // Check that both filters were processed
      expect(mockPagefind.search).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          filters: expect.objectContaining({
            category: ['Technology'],
          }),
        }),
      )
    })

    it('clears filters correctly when using filter groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Clear Test Group',
          collapsible: false,
          filters: {
            category: 'dropdown',
            author: 'dropdown',
          },
        },
      ]

      const wrapper = await mountAndWait({
        filtersDefinition: filterGroups,
      })

      // Set a filter first
      const categoryDropdown = wrapper.find('#category_visible_input')
      await categoryDropdown.trigger('focus')
      await nextTick()

      const technologyOption = wrapper.find('#category_option_Technology')
      await technologyOption.trigger('click')
      await nextTick()

      // Clear search
      const clearButton = wrapper.find('.clear-button')
      await clearButton.trigger('click')
      await nextTick()

      // Should have called search with no filters
      expect(mockPagefind.search).toHaveBeenLastCalledWith(
        null,
        expect.objectContaining({
          filters: {},
        }),
      )
    })

    it('preserves filter groups when combined with tabbed filters', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Regular Filters',
          collapsible: false,
          filters: {
            author: 'dropdown',
            tags: 'checkboxes',
          },
        },
      ]

      const wrapper = await mountAndWait({
        filtersDefinition: filterGroups,
        tabbedFilter: 'category',
        defaultTab: 'Technology',
      })

      // Both tabbed filters and grouped filters should work together
      const filtersComponent = wrapper.find('.filters-sidebar')
      expect(filtersComponent.exists()).toBe(true)

      // The tabbedFilter should not appear in the grouped filters
      expect(wrapper.text()).not.toContain('category') // category is the tabbed filter
      expect(wrapper.text()).toContain('author')
      expect(wrapper.text()).toContain('tags') // appears as checkbox options
    })
  })

  describe('Backward Compatibility', () => {
    it('still works with legacy filtersDefinition format', async () => {
      const legacyFiltersDefinition = {
        category: 'dropdown',
        author: 'dropdown',
        tags: 'checkboxes',
      }

      const wrapper = await mountAndWait({
        filtersDefinition: legacyFiltersDefinition,
      })

      // Should work without filter group headers
      expect(wrapper.findAll('.filter-group-header')).toHaveLength(0)

      // Should render individual filter groups
      const filterGroups = wrapper.findAll('.filter-group')
      expect(filterGroups.length).toBeGreaterThan(0)

      // Should contain the filter names as headers
      expect(wrapper.text()).toContain('category')
      expect(wrapper.text()).toContain('author')
    })

    it('handles undefined filtersDefinition gracefully', async () => {
      const wrapper = await mountAndWait({
        // No filtersDefinition provided
      })

      // Should render all available filters without groups
      const filtersComponent = wrapper.find('.filters-sidebar')
      expect(filtersComponent.exists()).toBe(true)

      // Should include all filters from mockFilters (except any that might be tabbed)
      const filterHeadings = wrapper.findAll('h3').map((h) => h.text())
      expect(filterHeadings).toEqual(
        expect.arrayContaining(['category', 'author', 'tags', 'difficulty']),
      )
    })
  })

  describe('URL Parameter Handling with Filter Groups', () => {
    it('loads filter values from URL parameters correctly with filter groups', async () => {
      // Set URL parameters
      const url = new URL(window.location.href)
      url.searchParams.set('category', 'Technology')
      url.searchParams.set('author', 'John Doe')
      window.history.replaceState({}, '', url)

      const filterGroups: FilterGroup[] = [
        {
          label: 'URL Test Group',
          collapsible: false,
          filters: {
            category: 'dropdown',
            author: 'dropdown',
          },
        },
      ]

      await mountAndWait({
        filtersDefinition: filterGroups,
      })

      // Check that filters were applied correctly by examining search calls
      expect(mockPagefind.search).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          filters: expect.objectContaining({
            category: ['Technology'],
            author: ['John Doe'],
          }),
        }),
      )
    })

    it('updates URL parameters correctly with filter groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'URL Update Test Group',
          collapsible: false,
          filters: {
            category: 'dropdown',
            author: 'dropdown',
          },
        },
      ]

      const wrapper = await mountAndWait({
        filtersDefinition: filterGroups,
      })

      // Set a filter
      const categoryDropdown = wrapper.find('#category_visible_input')
      await categoryDropdown.trigger('focus')
      await nextTick()

      const technologyOption = wrapper.find('#category_option_Technology')
      await technologyOption.trigger('click')
      await nextTick()

      // Check that URL was updated
      const urlParams = new URLSearchParams(window.location.search)
      expect(urlParams.get('category')).toBe('Technology')
    })
  })

  describe('Error Handling with Filter Groups', () => {
    it('handles malformed filter group definitions gracefully', async () => {
      const malformedFilterGroups = [
        {
          label: 'Incomplete Group',
          collapsible: true,
          filters: {},
        },
        {
          label: 'Valid Group',
          collapsible: false,
          filters: {
            category: 'dropdown',
          },
        },
      ] as FilterGroup[]

      const wrapper = await mountAndWait({
        filtersDefinition: malformedFilterGroups,
      })

      // Should not crash and should render what it can
      expect(wrapper.exists()).toBe(true)
      const filtersComponent = wrapper.find('.filters-sidebar')
      expect(filtersComponent.exists()).toBe(true)

      // Should render the valid group
      expect(wrapper.text()).toContain('Valid Group')
    })

    it('handles empty filter groups array', async () => {
      const emptyFilterGroups: FilterGroup[] = []

      const wrapper = await mountAndWait({
        filtersDefinition: emptyFilterGroups,
      })

      // Should render without errors
      expect(wrapper.exists()).toBe(true)
      const filtersComponent = wrapper.find('.filters-sidebar')
      expect(filtersComponent.exists()).toBe(true)
    })
  })
})
