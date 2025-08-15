<template>
  <div class="filterable-dropdown-container" ref="containerRef">
    <div class="input-wrapper">
      <input
        ref="visibleInput"
        :id="`${name}_visible_input`"
        type="text"
        :class="['filterable-dropdown-input', { valid: isValid }]"
        :title="displayValue"
        :value="displayValue"
        @input="handleInput"
        @focus="handleFocus"
        @click="handleClick"
        @blur="handleBlur"
        @keydown="handleInputKeydown"
        role="combobox"
        :aria-expanded="showOptions"
        :aria-controls="`${name}_ul`"
        :aria-activedescendant="activeId"
        autocomplete="off"
      />
      <button
        v-if="displayValue"
        class="clear-button"
        @click="clearSelection"
        aria-label="Clear selection"
      >
        <XIcon size="16" color="#000" />
      </button>
      <ChevronIcon direction="down" class="dropdown-icon" color="#000" />
    </div>

    <input :id="`${name}_hidden_input`" type="hidden" :name="name" :value="modelValue" />

    <!-- Use v-if instead of v-show for immediate DOM destruction during close -->
    <div v-if="showOptions">
      <template v-if="filteredOptionsLength === 0">
        <ul class="filterable-dropdown-options">
          <li class="filterable-dropdown-no-results">No matches found</li>
        </ul>
      </template>
      <template v-else>
        <ul
          :id="`${name}_ul`"
          ref="optionsListRef"
          class="filterable-dropdown-options"
          @focusin="handleUlFocusIn"
          @focusout="handleUlFocusOut"
          role="listbox"
        >
          <li v-for="option in filteredOptions" :key="option.value">
            <button
              class="filterable-dropdown-option"
              @mousedown.prevent
              @click="handleOptionSelect(option)"
              @keyup.down="navigateOptions('next', $event)"
              @keyup.up="navigateOptions('prev', $event)"
              role="option"
              :aria-selected="isOptionSelected(option)"
              :id="`${name}_option_${option.value}`"
              :disabled="option.count === 0"
            >
              {{ option.label }} ({{ option.count }})
            </button>
          </li>
        </ul>
      </template>
    </div>

    <div :id="`${name}_errors`"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import ChevronIcon from './icons/ChevronIcon.vue'
import XIcon from './icons/XIcon.vue'

import type { Option } from './types'

const props = defineProps<{
  name: string
  options: Option[]
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

const showOptions = ref(false)
const searchText = ref('')
const activeId = ref('')
const isValid = ref(false)
const isFocusWithinUl = ref(false)
const isTabbing = ref(false)

const visibleInput = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const optionsListRef = ref<HTMLUListElement | null>(null)

// DOM reference caching for performance
const cachedOptionButtons = ref<HTMLButtonElement[]>([])
const buttonCacheValid = ref(false)

// Clear button cache when options change
const clearButtonCache = () => {
  if (!showOptions.value) {
    return
  }

  cachedOptionButtons.value = []
  buttonCacheValid.value = false
}

// Get cached button references or rebuild cache
const getOptionButtons = (): HTMLButtonElement[] => {
  if (!showOptions.value) {
    return []
  }

  if (buttonCacheValid.value && cachedOptionButtons.value.length > 0) {
    return cachedOptionButtons.value
  }

  // Rebuild cache using the ref instead of document query
  if (optionsListRef.value) {
    cachedOptionButtons.value = Array.from(
      optionsListRef.value.querySelectorAll('button'),
    ) as HTMLButtonElement[]
    buttonCacheValid.value = true
  }

  return cachedOptionButtons.value
}

// Event listener management for outside clicks.
// Creating and destroying global click listeners only when
// the dropdown is opened or closed improved performance by ~1 second.
let globalClickHandler: ((event: Event) => void) | null = null

const addGlobalClickListener = () => {
  if (globalClickHandler) return // Already added

  globalClickHandler = (event: Event) => {
    const target = event.target as HTMLElement
    // Don't close if clicking inside the component
    if (!isWithinComponent(target)) {
      isClosing.value = true

      showOptions.value = false
      validateInput()

      nextTick(() => {
        isClosing.value = false
      })
    }
  }

  document.addEventListener('click', globalClickHandler)
}

const removeGlobalClickListener = () => {
  if (globalClickHandler) {
    document.removeEventListener('click', globalClickHandler)
    globalClickHandler = null
  }
}

// Keyboard event listener management for performance
let keydownHandler: ((event: KeyboardEvent) => void) | null = null
let keyupHandler: ((event: KeyboardEvent) => void) | null = null

const addKeyboardListeners = () => {
  if (keydownHandler || keyupHandler) return // Already added

  keydownHandler = (event: KeyboardEvent) => {
    // Only handle keyboard events if target is within active options
    const target = event.target as HTMLElement
    if (isWithinOptionsArea(target)) {
      handleOptionsKeydown(event)
    }
  }

  keyupHandler = (event: KeyboardEvent) => {
    // Handle escape key globally when dropdown is focused
    const target = event.target as HTMLElement
    if (event.key === 'Escape' && isWithinOptionsArea(target)) {
      handleEscape()
    }
  }

  document.addEventListener('keydown', keydownHandler)
  document.addEventListener('keyup', keyupHandler)
}

const removeKeyboardListeners = () => {
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler)
    keydownHandler = null
  }
  if (keyupHandler) {
    document.removeEventListener('keyup', keyupHandler)
    keyupHandler = null
  }
}

const isWithinOptionsArea = (element: Element | null): boolean => {
  if (!showOptions.value || !element || !optionsListRef.value) {
    return false
  }
  return optionsListRef.value.contains(element)
}

// Debounce
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): T & { cancel: () => void } => {
  let timeout: ReturnType<typeof setTimeout> | null = null

  const debounced = ((...args: any[]) => {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }) as T & { cancel: () => void }

  debounced.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

const displayValue = computed(() => searchText.value)

// Cached filtered options to prevent expensive recalculation during teardown
const cachedFilteredOptions = ref<Option[]>([])
const lastFilterText = ref('')
const lastOptionsLength = ref(0)
const isClosing = ref(false)

const filteredOptions = computed(() => {
  if (!showOptions.value || isClosing.value) {
    return cachedFilteredOptions.value.length > 0 ? cachedFilteredOptions.value : []
  }

  const currentFilter = searchText.value.toLowerCase()
  const currentOptionsLength = props.options.length

  if (
    currentFilter === lastFilterText.value &&
    currentOptionsLength === lastOptionsLength.value &&
    cachedFilteredOptions.value.length > 0
  ) {
    return cachedFilteredOptions.value
  }

  // Only perform expensive filtering when actually needed and dropdown is open
  let filtered: Option[]

  // PERFORMANCE FIX: For large datasets, use more efficient filtering
  if (props.options.length > 1000) {
    // Skip toLowerCase() calls for exact matches
    if (!currentFilter) {
      filtered = props.options
    } else {
      filtered = []
      for (let i = 0; i < props.options.length; i++) {
        const option = props.options[i]
        if (option.label.toLowerCase().includes(currentFilter)) {
          filtered.push(option)
        }
      }
    }
  } else {
    filtered = props.options.filter((option) => option.label.toLowerCase().includes(currentFilter))
  }

  // Cache the results and inputs for next comparison
  cachedFilteredOptions.value = filtered
  lastFilterText.value = currentFilter
  lastOptionsLength.value = currentOptionsLength

  return filtered
})

// Cache filteredOptions length to avoid multiple evaluations in template
const filteredOptionsLength = computed(() => {
  if (!showOptions.value || isClosing.value) {
    return 0
  }
  return filteredOptions.value.length
})

const debouncedClearCache = debounce(clearButtonCache, 16) // 16ms = ~1 frame at 60fps

watch(
  [() => props.modelValue, () => props.options],
  ([newValue]) => {
    const selectedOption = props.options.find((opt) => opt.value === newValue)
    if (selectedOption) {
      searchText.value = selectedOption.label
      isValid.value = true
    } else {
      searchText.value = ''
      isValid.value = false
    }
    if (showOptions.value) {
      debouncedClearCache()
    }
  },
  { immediate: true },
)

watch(filteredOptions, () => {
  if (showOptions.value) {
    debouncedClearCache()
  }
})

const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  searchText.value = input.value
  isValid.value = false
  showOptions.value = true
  addGlobalClickListener() // Add listener when dropdown opens
  // Use debounced cache clearing during input to prevent excessive DOM queries
  debouncedClearCache()
}

const handleFocus = () => {
  searchText.value = ''
  showOptions.value = true
  isTabbing.value = false
  addGlobalClickListener() // Add listener when dropdown opens
}

const handleClick = () => {
  const input = visibleInput.value
  if (!input) return
  input.select()
  searchText.value = ''
  showOptions.value = true
  addGlobalClickListener() // Add listener when dropdown opens
}

// Optimized focus management
const isWithinComponent = (element: Element | null): boolean => {
  if (!showOptions.value || !element || !containerRef.value) {
    return false
  }
  return containerRef.value.contains(element)
}

const handleBlur = (event: FocusEvent) => {
  // Use relatedTarget to check where focus is moving to
  const relatedTarget = event.relatedTarget as HTMLElement | null

  // If focus is moving within our component, don't close
  if (isWithinComponent(relatedTarget)) {
    return
  }

  isClosing.value = true

  // Focus is moving outside component - restore display value and close
  if (showOptions.value) {
    const selectedOption = props.options.find((opt) => opt.value === props.modelValue)
    if (selectedOption) {
      searchText.value = selectedOption.label
    } else {
      searchText.value = ''
    }
  }

  showOptions.value = false
  removeGlobalClickListener()
  removeKeyboardListeners() // Remove keyboard listeners when dropdown closes
  validateInput()

  // Reset closing flag after a tick to allow reopening
  nextTick(() => {
    isClosing.value = false
  })
}

if (showOptions.value) {
  const selectedOption = props.options.find((opt) => opt.value === props.modelValue)
  if (selectedOption) {
    searchText.value = selectedOption.label
  } else {
    searchText.value = ''
  }
}

showOptions.value = false

nextTick(() => {
  removeGlobalClickListener()
  removeKeyboardListeners() // Remove keyboard listeners when dropdown closes
  validateInput()
})

const handleUlFocusIn = () => {
  isFocusWithinUl.value = true
  showOptions.value = true
  addGlobalClickListener() // Add listener when dropdown opens
  addKeyboardListeners() // Add keyboard listeners when dropdown is focused
}

const handleUlFocusOut = (event: FocusEvent) => {
  const relatedTarget = event.relatedTarget as HTMLElement | null

  // If focus is moving within the options area, don't remove listeners
  if (isWithinOptionsArea(relatedTarget)) {
    return
  }

  // Focus is leaving the options area
  isFocusWithinUl.value = false
  removeKeyboardListeners()
}

const handleEscape = () => {
  isClosing.value = true

  showOptions.value = false
  removeGlobalClickListener() // Remove listener when dropdown closes
  removeKeyboardListeners() // Remove keyboard listeners when dropdown closes

  nextTick(() => {
    isClosing.value = false
  })
}

const handleOptionSelect = (option: Option) => {
  if (option.count === 0) return

  emit('update:modelValue', option.value)
  searchText.value = option.label
  validateInput()

  isClosing.value = true

  // Close dropdown and focus input using nextTick for proper timing
  nextTick(() => {
    showOptions.value = false
    removeGlobalClickListener()
    removeKeyboardListeners() // Remove keyboard listeners when dropdown closes
    visibleInput.value?.focus()

    isClosing.value = false
  })
}

const handleOptionsKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const button = event.target as HTMLButtonElement
    // Extract option value directly from button ID instead of DOM traversal
    const optionValue = button.id?.split('_option_')[1]
    const option = props.options.find((opt) => opt.value === optionValue)
    if (option) {
      handleOptionSelect(option)
    }
    return
  }

  if (event.key === 'Tab') {
    // Only handle tab specially if we have a selection
    if (props.modelValue) {
      event.preventDefault()

      isClosing.value = true

      showOptions.value = false
      removeGlobalClickListener()
      removeKeyboardListeners() // Remove keyboard listeners when dropdown closes
      validateInput()

      // If shift+tab, focus the input
      if (event.shiftKey) {
        visibleInput.value?.focus()
        nextTick(() => {
          isClosing.value = false
        })
        return
      }

      // Find the next focusable element after the component using simplified logic
      nextTick(() => {
        if (!showOptions.value) {
          return
        }

        const focusableElements =
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        const elements = Array.from(document.querySelectorAll(focusableElements))
        const currentIndex = elements.findIndex((el) => isWithinComponent(el))
        const nextElement = elements.find(
          (_, index) => index > currentIndex && !isWithinComponent(elements[index]),
        )

        if (nextElement instanceof HTMLElement) {
          nextElement.focus()
        }

        isClosing.value = false
      })
    } else {
      // If no selection, let tab behave normally
      // But close options when tabbing out of the last option
      const buttons = getOptionButtons()
      const currentButton = event.target as HTMLButtonElement

      if (currentButton === buttons[buttons.length - 1] && !event.shiftKey) {
        isClosing.value = true

        showOptions.value = false
        removeGlobalClickListener()
        removeKeyboardListeners() // Remove keyboard listeners when dropdown closes
        validateInput()

        nextTick(() => {
          isClosing.value = false
        })
      }
    }
  }

  if (event.key.length === 1 || event.key === 'Space' || event.key === 'Backspace') {
    event.preventDefault()
    event.stopPropagation()

    // Focus input and update search text directly
    const input = visibleInput.value
    if (input) {
      input.focus()

      if (event.key === 'Backspace') {
        searchText.value = searchText.value.slice(0, -1)
      } else if (event.key === 'Space') {
        searchText.value += ' '
      } else {
        searchText.value += event.key
      }

      showOptions.value = true
      addGlobalClickListener()
    }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!showOptions.value) {
      return
    }
    // Ensure DOM is updated before focusing first button
    nextTick(() => {
      const buttons = getOptionButtons()
      buttons[0]?.focus()
    })
  }
}

const validateInput = () => {
  if (!searchText.value) {
    isValid.value = true
    emit('update:modelValue', '')
    return
  }

  const matchingOption = props.options.find(
    (opt) => opt.label.toLowerCase() === searchText.value.toLowerCase(),
  )
  isValid.value = !!matchingOption

  if (!matchingOption) {
    emit('update:modelValue', '')
  }
}

const isOptionSelected = (option: Option) => option.value === props.modelValue

const navigateOptions = (direction: 'next' | 'prev', event: KeyboardEvent) => {
  if (!showOptions.value) {
    return
  }

  const buttons = getOptionButtons()
  const currentIndex = buttons.indexOf(event.target as HTMLButtonElement)
  let nextIndex

  if (direction === 'next') {
    nextIndex = currentIndex === buttons.length - 1 ? 0 : currentIndex + 1
  } else {
    nextIndex = currentIndex === 0 ? buttons.length - 1 : currentIndex - 1
  }

  buttons[nextIndex]?.focus()
}

const clearSelection = () => {
  emit('update:modelValue', '')
  searchText.value = ''
  isValid.value = true

  isClosing.value = true

  showOptions.value = false
  removeGlobalClickListener() // Remove listener when dropdown closes
  removeKeyboardListeners() // Remove keyboard listeners when dropdown closes
  validateInput()
  visibleInput.value?.focus()

  nextTick(() => {
    isClosing.value = false
  })
}

onMounted(() => {
  // Event listener management is now handled conditionally when dropdown opens/closes
})

onUnmounted(() => {
  // Clean up all event listeners when component is destroyed
  removeGlobalClickListener()
  removeKeyboardListeners()
  debouncedClearCache.cancel()

  cachedFilteredOptions.value = []
  cachedOptionButtons.value = []
  isClosing.value = false
})
</script>

<style scoped>
.filterable-dropdown-container {
  position: relative;
}

.filterable-dropdown-input {
  width: 100%;
  padding: var(--pagefind-vue-input-padding);
  padding-right: 4rem;
  box-sizing: border-box;
  border: var(--pagefind-vue-input-border);
  border-radius: var(--pagefind-vue-input-border-radius);
  font-size: var(--pagefind-vue-font-size);
  color: var(--pagefind-vue-input-color);
  background: var(--pagefind-vue-input-bg);
}

.filterable-dropdown-options {
  position: absolute;
  width: 100%;
  max-height: var(--pagefind-vue-options-max-height);
  overflow-y: auto;
  z-index: var(--pagefind-vue-options-z-index, 1000);
  background: var(--pagefind-vue-options-bg);
  border: var(--pagefind-vue-options-border);
  border-top: none;
  margin: 0;
  padding: 0;
  list-style: none;
  box-shadow: var(--pagefind-vue-options-shadow);
}

.filterable-dropdown-options li {
  margin: 0;
  padding: 0;
  list-style: none;
  border: none;
}

.filterable-dropdown-option {
  width: 100%;
  text-align: var(--pagefind-vue-option-text-align);
  padding: var(--pagefind-vue-option-padding);
  border: none;
  background: none; /* has same effect as setting bg on the container */
  cursor: pointer;
  color: var(--pagefind-vue-option-color);
  font-size: var(--pagefind-vue-option-font-size);
  /* Reset button styles because these should appear like <select> options */
  margin: 0;
  font-family: inherit;
  line-height: inherit; /* implementers can use padding */
  font-style: normal;
  font-weight: normal;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  border-radius: 0;
  box-shadow: none;
  min-height: 28px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.filterable-dropdown-option:hover,
.filterable-dropdown-option:focus {
  background-color: var(--pagefind-vue-option-hover-bg);
}

.filterable-dropdown-option[aria-selected='true'] {
  background-color: var(--pagefind-vue-option-selected-bg);
}

.filterable-dropdown-option[disabled],
.filterable-dropdown-option[disabled]:hover {
  opacity: 0.5;
  cursor: default;
  background-color: var(--pagefind-vue-option-disabled-bg);
}

.filterable-dropdown-no-results {
  padding: var(--pagefind-vue-option-padding);
  color: var(--pagefind-vue-option-color);
  font-style: var(--pagefind-vue-no-results-font-style);
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.dropdown-icon {
  position: absolute;
  right: 0.5rem;
  top: 0;
  bottom: 0;
  margin: auto;
  pointer-events: none;
}

.clear-button {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0;
  margin: 0;
  line-height: 1;
  pointer-events: auto;
}
</style>
