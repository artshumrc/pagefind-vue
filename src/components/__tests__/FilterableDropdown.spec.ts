import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterableDropdown from '../FilterableDropdown.vue'
import type { Option } from '../types'

describe('FilterableDropdown unit tests', () => {
  const options: Option[] = [
    { value: '1', label: 'Option 1', count: 10 },
    { value: '2', label: 'Option 2', count: 5 },
    { value: '3', label: 'Option 3', count: 0 },
  ]

  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(FilterableDropdown, {
      props: {
        name: 'test-dropdown',
        options,
        modelValue: '',
      },
    })
  })

  it('renders with the provided options', async () => {
    // Open the dropdown
    await wrapper.find('input[role="combobox"]').trigger('focus')

    // Check each option is rendered
    const optionElements = wrapper.findAll('.filterable-dropdown-option')
    expect(optionElements.length).toBe(3)
    expect(optionElements[0].text()).toContain('Option 1 (10)')
    expect(optionElements[1].text()).toContain('Option 2 (5)')
    expect(optionElements[2].text()).toContain('Option 3 (0)')
  })

  it('selects an option when clicked', async () => {
    // Open the dropdown
    await wrapper.find('input[role="combobox"]').trigger('focus')

    // Click the first option
    await wrapper.findAll('.filterable-dropdown-option')[0].trigger('click')

    // Check that the value was updated
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['1'])

    // Input should now display the selected option's label
    const input = wrapper.find('input[role="combobox"]')
    expect((input.element as HTMLInputElement).value).toBe('Option 1')
  })

  it('filters options based on input text', async () => {
    const input = wrapper.find('input[role="combobox"]')

    // Focus and enter filter text
    await input.trigger('focus')
    await input.setValue('Option 2')

    // Check that only matching options are displayed
    const optionElements = wrapper.findAll('.filterable-dropdown-option')
    for (const option of optionElements) {
      expect(option.text()).toContain('Option 2')
    }
  })

  it('clears selection when clear button is clicked', async () => {
    // First select an option
    wrapper = mount(FilterableDropdown, {
      props: {
        name: 'test-dropdown',
        options,
        modelValue: '1',
      },
    })

    // Clear button should be visible
    const clearButton = wrapper.find('.clear-button')
    expect(clearButton.exists()).toBe(true)

    // Click the clear button
    await clearButton.trigger('click')

    // Check that the value was cleared
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])

    // Input should now be empty
    const input = wrapper.find('input[role="combobox"]')
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('shows "No matches found" when filter has no results', async () => {
    const input = wrapper.find('input[role="combobox"]')

    // Focus and enter filter text
    await input.trigger('focus')
    await input.setValue('xyz')

    // Check for no results message
    expect(wrapper.find('.filterable-dropdown-no-results').exists()).toBe(true)
    expect(wrapper.find('.filterable-dropdown-no-results').text()).toBe('No matches found')
  })

  it('disables options with zero count', async () => {
    // Open the dropdown
    await wrapper.find('input[role="combobox"]').trigger('focus')

    // Check that the option with count 0 is disabled
    const disabledOption = wrapper.findAll('.filterable-dropdown-option')[2]
    expect(disabledOption.attributes('disabled')).toBeDefined()
  })
})
