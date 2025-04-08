import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CheckboxGroup from '../CheckboxGroup.vue'

describe('CheckboxGroup unit tests', () => {
  const defaultOptions = {
    'Option 1': 10,
    'Option 2': 5,
    'Option 3': 0,
    'Option 4': 7,
    'Option 5': 3,
  }

  it('renders filter input when options exceed threshold', async () => {
    const wrapper = mount(CheckboxGroup, {
      props: {
        name: 'test-group',
        options: defaultOptions,
        selectedFilters: {},
        checkboxFilterThreshold: 3, // Set threshold lower than number of options
      },
    })

    // Check if filter input is rendered
    expect(wrapper.find('.filter-input').exists()).toBe(true)
  })

  it('does not render filter input when options are below threshold', async () => {
    const wrapper = mount(CheckboxGroup, {
      props: {
        name: 'test-group',
        options: defaultOptions,
        selectedFilters: {},
        checkboxFilterThreshold: 10, // Set threshold higher than number of options
      },
    })

    // Check that filter input is not rendered
    expect(wrapper.find('.filter-input').exists()).toBe(false)
  })

  it('filters checkboxes based on input text', async () => {
    const wrapper = mount(CheckboxGroup, {
      props: {
        name: 'test-group',
        options: defaultOptions,
        selectedFilters: {},
        checkboxFilterThreshold: 3,
      },
    })

    // Initially all checkboxes are displayed
    expect(wrapper.findAll('div > div.checkbox-container > div').length).toBe(5)

    // Type in filter
    const input = wrapper.find('.filter-input')
    await input.setValue('Option 1')

    // Now only the matching checkbox should be displayed
    const checkboxes = wrapper.findAll('div > div.checkbox-container > div')
    expect(checkboxes.length).toBe(1)
    expect(checkboxes[0].text()).toContain('Option 1')
  })

  it('shows "No matching options" when filter has no results', async () => {
    const wrapper = mount(CheckboxGroup, {
      props: {
        name: 'test-group',
        options: defaultOptions,
        selectedFilters: {},
        checkboxFilterThreshold: 3,
      },
    })

    // Type in filter that won't match any options
    const input = wrapper.find('.filter-input')
    await input.setValue('xyz')

    // Check for no results message
    expect(wrapper.find('.no-results').exists()).toBe(true)
    expect(wrapper.find('.no-results').text()).toBe('No matching options')
  })

  it('clears filter when clear button is clicked', async () => {
    const wrapper = mount(CheckboxGroup, {
      props: {
        name: 'test-group',
        options: defaultOptions,
        selectedFilters: {},
        checkboxFilterThreshold: 3,
      },
    })

    // Type in filter
    const input = wrapper.find('.filter-input')
    await input.setValue('Option 1')

    // Only one checkbox should be visible
    expect(wrapper.findAll('div > div.checkbox-container > div').length).toBe(1)

    // Click clear button
    await wrapper.find('.clear-button').trigger('click')

    // All checkboxes should be visible again
    expect(wrapper.findAll('div > div.checkbox-container > div').length).toBe(5)

    // Input value should be empty
    expect((input.element as HTMLInputElement).value).toBe('')
  })
})
