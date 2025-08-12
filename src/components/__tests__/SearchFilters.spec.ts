import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SearchFilters from '../SearchFilters.vue'
import type { FilterGroup, FiltersDefinition } from '../types'

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
}

const mockFilteredKeywordFilters = {
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
}

describe('SearchFilters with FilterGroup Array', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Filter Group Array Structure', () => {
    it('renders filter groups with collapsible sections', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Content Filters',
          collapsible: true,
          initiallyOpen: true,
          filters: {
            category: 'dropdown',
            tags: 'checkboxes',
          },
        },
        {
          label: 'Author Information',
          collapsible: true,
          initiallyOpen: false,
          filters: {
            author: 'dropdown',
          },
        },
      ]

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      // Check that both filter groups are rendered
      const filterGroupHeaders = wrapper.findAll('.filter-group-header')
      expect(filterGroupHeaders).toHaveLength(2)

      // Check group labels
      expect(wrapper.text()).toContain('Content Filters')
      expect(wrapper.text()).toContain('Author Information')

      // Check that collapsible groups have proper buttons
      const collapsibleButtons = wrapper.findAll('.filter-group-button')
      expect(collapsibleButtons).toHaveLength(2)

      // Check ARIA attributes
      expect(collapsibleButtons[0].attributes('aria-expanded')).toBe('true') // initiallyOpen: true
      expect(collapsibleButtons[1].attributes('aria-expanded')).toBe('false') // initiallyOpen: false
    })

    it('handles non-collapsible filter groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Static Filters',
          collapsible: false,
          filters: {
            category: 'dropdown',
          },
        },
      ]

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      // Non-collapsible groups should not have button functionality
      const filterGroupButtons = wrapper.findAll('.filter-group-button')
      expect(filterGroupButtons).toHaveLength(0)

      // But should still render the content
      expect(wrapper.text()).toContain('Static Filters')
      expect(wrapper.find('.filter-group-content').exists()).toBe(true)
    })

    it('toggles group visibility when clicking collapsible headers', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Collapsible Group',
          collapsible: true,
          initiallyOpen: false,
          filters: {
            category: 'dropdown',
          },
        },
      ]

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      const collapsibleButton = wrapper.find('.filter-group-button')

      // Initially closed
      expect(collapsibleButton.attributes('aria-expanded')).toBe('false')
      expect(wrapper.find('.filter-group-content').exists()).toBe(false)

      // Click to open
      await collapsibleButton.trigger('click')
      await nextTick()

      expect(collapsibleButton.attributes('aria-expanded')).toBe('true')
      expect(wrapper.find('.filter-group-content').exists()).toBe(true)

      // Click to close
      await collapsibleButton.trigger('click')
      await nextTick()

      expect(collapsibleButton.attributes('aria-expanded')).toBe('false')
      expect(wrapper.find('.filter-group-content').exists()).toBe(false)
    })

    it('handles keyboard navigation for collapsible groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Keyboard Test Group',
          collapsible: true,
          initiallyOpen: false,
          filters: {
            category: 'dropdown',
          },
        },
      ]

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      const collapsibleButton = wrapper.find('.filter-group-button')

      // Test Enter key
      await collapsibleButton.trigger('keydown.enter')
      await nextTick()
      expect(collapsibleButton.attributes('aria-expanded')).toBe('true')

      // Test Space key
      await collapsibleButton.trigger('keydown.space')
      await nextTick()
      expect(collapsibleButton.attributes('aria-expanded')).toBe('false')
    })

    it('renders custom filter labels from FilterDefinitionObject', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Custom Labels Group',
          collapsible: false,
          filters: {
            category: {
              type: 'dropdown',
              label: 'Custom Category Label',
            },
            tags: {
              type: 'checkboxes',
              label: 'Custom Tags Label',
            },
          },
        },
      ]

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      expect(wrapper.text()).toContain('Custom Category Label')
      expect(wrapper.text()).toContain('Custom Tags Label')
    })

    it('only renders groups that have available filter items', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Empty Group',
          collapsible: false,
          filters: {
            nonexistent: 'dropdown',
          },
        },
        {
          label: 'Valid Group',
          collapsible: false,
          filters: {
            category: 'dropdown',
          },
        },
      ]

      // Create filteredFilters that excludes the nonexistent filter (as PagefindSearch would do)
      const filteredFiltersWithoutNonexistent = {
        category: mockFilters.category,
        // nonexistent is intentionally excluded
      }

      const filteredKeywordFiltersWithoutNonexistent = {
        category: mockFilteredKeywordFilters.category,
        // nonexistent is intentionally excluded
      }

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: filteredFiltersWithoutNonexistent,
          filteredKeywordFilters: filteredKeywordFiltersWithoutNonexistent,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      // Find the specific filter group containers
      const filterGroupContainers = wrapper.findAll('.filter-group-container')

      // Check that only the valid group is visible
      expect(filterGroupContainers.length).toBe(2) // Both containers exist in DOM

      // The first container (Empty Group) should be hidden (style display: none)
      const emptyGroupContainer = filterGroupContainers.find((container) =>
        container.text().includes('Empty Group'),
      )
      const validGroupContainer = filterGroupContainers.find((container) =>
        container.text().includes('Valid Group'),
      )

      // Empty group should be hidden via v-show (display: none)
      expect(emptyGroupContainer?.isVisible()).toBe(false)
      // Valid group should be visible
      expect(validGroupContainer?.isVisible()).toBe(true)
    })

    it('emits filter updates correctly', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Test Group',
          collapsible: false,
          filters: {
            category: 'dropdown',
          },
        },
      ]

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      // Find and interact with a filter component
      const filterComponent = wrapper.findComponent({ name: 'FilterComponent' })
      expect(filterComponent.exists()).toBe(true)

      // Simulate filter update
      await filterComponent.vm.$emit('update:filters', 'category', 'Technology')

      // Check that the event was properly emitted up
      expect(wrapper.emitted('update:filters')).toBeTruthy()
      expect(wrapper.emitted('update:filters')![0]).toEqual(['category', 'Technology'])
    })
  })

  describe('Legacy FiltersDefinition Support', () => {
    it('still works with legacy FiltersDefinition format', async () => {
      const legacyFiltersDefinition: FiltersDefinition = {
        category: 'dropdown',
        author: 'dropdown',
        tags: 'checkboxes',
      }

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: legacyFiltersDefinition,
          sortedGroups: ['category', 'author', 'tags'],
        },
      })

      await nextTick()

      // Should render without filter group headers
      expect(wrapper.findAll('.filter-group-header')).toHaveLength(0)

      // Should render individual filter groups
      const filterGroups = wrapper.findAll('.filter-group')
      expect(filterGroups.length).toBeGreaterThan(0)

      // Should contain the filter names as headers
      expect(wrapper.text()).toContain('category')
      expect(wrapper.text()).toContain('author')
      expect(wrapper.text()).toContain('tags')
    })

    it('handles legacy FiltersDefinition with custom labels', async () => {
      const legacyFiltersDefinition: FiltersDefinition = {
        category: {
          type: 'dropdown',
          label: 'Content Category',
        },
        author: {
          type: 'dropdown',
          label: 'Article Author',
        },
      }

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: legacyFiltersDefinition,
          sortedGroups: ['category', 'author'],
        },
      })

      await nextTick()

      expect(wrapper.text()).toContain('Content Category')
      expect(wrapper.text()).toContain('Article Author')
    })
  })

  describe('Mixed Widget Types in Filter Groups', () => {
    it('renders different widget types within the same group', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Mixed Widgets Group',
          collapsible: false,
          filters: {
            category: 'dropdown',
            tags: 'checkboxes',
          },
        },
      ]

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 5, // This should make tags use checkboxes
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      // Should render FilterComponent instances for both types
      const filterComponents = wrapper.findAllComponents({ name: 'FilterComponent' })
      expect(filterComponents.length).toBeGreaterThanOrEqual(2)

      // Both category and tags should be present
      expect(wrapper.text()).toContain('category')
      expect(wrapper.text()).toContain('tags')
    })
  })

  describe('Chevron Icon Integration', () => {
    it('displays chevron icons for collapsible groups', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Chevron Test Group',
          collapsible: true,
          initiallyOpen: false,
          filters: {
            category: 'dropdown',
          },
        },
      ]

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: filterGroups,
        },
      })

      await nextTick()

      const chevronIcon = wrapper.findComponent({ name: 'ChevronIcon' })
      expect(chevronIcon.exists()).toBe(true)
      expect(chevronIcon.props('direction')).toBe('down') // Initially closed

      // Click to toggle
      await wrapper.find('.filter-group-button').trigger('click')
      await nextTick()

      expect(chevronIcon.props('direction')).toBe('up') // Now open
    })
  })

  describe('Slot Support', () => {
    it('supports custom collapse title slot', async () => {
      const filterGroups: FilterGroup[] = [
        {
          label: 'Slot Test Group',
          collapsible: true,
          initiallyOpen: false,
          filters: {
            category: 'dropdown',
          },
        },
      ]

      const wrapper = mount(SearchFilters, {
        props: {
          filteredFilters: mockFilters,
          filteredKeywordFilters: mockFilteredKeywordFilters,
          selectedFilters: {},
          checkboxFilterThreshold: 8,
          filtersDefinition: filterGroups,
        },
        slots: {
          'collapse-title': `
            <template #collapse-title="{ direction, label }">
              <div class="custom-header">
                {{ label }} - {{ direction }}
              </div>
            </template>
          `,
        },
      })

      await nextTick()

      expect(wrapper.find('.custom-header').exists()).toBe(true)
      expect(wrapper.text()).toContain('Slot Test Group - down')
    })
  })
})
