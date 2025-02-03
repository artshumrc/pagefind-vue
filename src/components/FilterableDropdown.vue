<template>
  <div class="filterable-dropdown-container" ref="containerRef">
    <div class="input-wrapper">
      <input
        ref="visibleInput"
        :id="`${name}_visible_input`"
        type="text"
        :class="['filterable-dropdown-input', { valid: isValid }]"
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
      <ChevronIcon direction="down" class="dropdown-icon" />
    </div>

    <input :id="`${name}_hidden_input`" type="hidden" :name="name" :value="modelValue" />

    <ul
      :id="`${name}_ul`"
      class="filterable-dropdown-options"
      :style="{ display: showOptions ? 'block' : 'none' }"
      @focusin="handleUlFocusIn"
      @keyup.esc="handleEscape"
      @keydown="handleOptionsKeydown"
      role="listbox"
    >
      <li v-if="filteredOptions.length === 0" class="filterable-dropdown-no-results">
        No matches found
      </li>
      <li v-else v-for="option in filteredOptions" :key="option.value">
        <button
          :class="'filterable-dropdown-option'"
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

    <div :id="`${name}_errors`"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
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

const displayValue = computed(() => searchText.value)

const filteredOptions = computed(() => {
  const filter = searchText.value.toLowerCase()
  return props.options
    .filter((option) => option.label.toLowerCase().includes(filter))
    .sort((a, b) => b.count - a.count)
})

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
  },
  { immediate: true },
)

const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  searchText.value = input.value
  isValid.value = false
  showOptions.value = true
}

const handleFocus = () => {
  searchText.value = ''
  showOptions.value = true
  isTabbing.value = false
}

const handleClick = (event: Event) => {
  const input = event.target as HTMLInputElement
  input.select()
  searchText.value = ''
  showOptions.value = true
}

const handleBlur = (event: FocusEvent) => {
  // Wait to check if focus moved within component
  // nextTick did not work, a timeout did
  setTimeout(() => {
    const isStillFocused = containerRef.value?.contains(document.activeElement)
    if (!isStillFocused || document.activeElement === visibleInput.value) {
      if (showOptions.value) {
        const selectedOption = props.options.find((opt) => opt.value === props.modelValue)
        if (selectedOption) {
          searchText.value = selectedOption.label
        } else {
          searchText.value = ''
        }
      }
      showOptions.value = false
      validateInput()
    }
  }, 0)
}

const handleUlFocusIn = () => {
  isFocusWithinUl.value = true
  showOptions.value = true
}

const handleEscape = () => {
  showOptions.value = false
}

const handleOptionSelect = (option: Option) => {
  if (option.count === 0) return

  emit('update:modelValue', option.value)
  searchText.value = option.label
  validateInput()
  visibleInput.value?.focus()

  // Delay hiding options slightly or else they do not close _sometimes_.
  // this was a tough edge case, don't remove this timeout.
  setTimeout(() => {
    showOptions.value = false
  }, 0)
}

const handleOptionsKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const button = event.target as HTMLButtonElement
    const optionValue = button.closest('li')?.querySelector('button')?.id?.split('_option_')[1]
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
      showOptions.value = false
      validateInput()

      // If shift+tab, focus the input
      if (event.shiftKey) {
        visibleInput.value?.focus()
        return
      }

      // Find the next focusable element after the component
      const focusableElements =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      const elements = Array.from(document.querySelectorAll(focusableElements))
      const currentIndex = elements.findIndex((el) => containerRef.value?.contains(el))
      const nextElement = elements.find(
        (_, index) => index > currentIndex && !containerRef.value?.contains(elements[index]),
      )

      if (nextElement instanceof HTMLElement) {
        nextElement.focus()
      }
    } else {
      // If no selection, let tab behave normally
      // But close options when tabbing out of the last option
      const buttons = Array.from(
        document.querySelectorAll(`#${props.name}_ul button`),
      ) as HTMLButtonElement[]
      const currentButton = event.target as HTMLButtonElement

      if (currentButton === buttons[buttons.length - 1] && !event.shiftKey) {
        showOptions.value = false
        validateInput()
      }
    }
  }

  if (event.key.length === 1 || event.key === 'Space' || event.key === 'Backspace') {
    event.preventDefault()
    event.stopPropagation()
    visibleInput.value?.focus()
    if (event.key === 'Backspace') {
      searchText.value = searchText.value.slice(0, -1)
    } else if (event.key === 'Space') {
      searchText.value += ' '
    } else {
      searchText.value += event.key
    }
    showOptions.value = true
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    const firstButton = document.querySelector(`#${props.name}_ul button`) as HTMLButtonElement
    firstButton?.focus()
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
  const buttons = Array.from(
    document.querySelectorAll(`#${props.name}_ul button`),
  ) as HTMLButtonElement[]
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
  showOptions.value = false
  validateInput()
  visibleInput.value?.focus()
}

onMounted(() => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    // Don't close if clicking inside the component
    if (containerRef.value && !containerRef.value.contains(target)) {
      showOptions.value = false
      validateInput()
    }
  })
})
</script>

<style>
/* Global CSS variables that can be easily overridden */
:root {
  --pagefind-vue-fd-input-border: 1px solid #ccc;
  --pagefind-vue-fd-input-border-radius: 0.25rem;
  --pagefind-vue-fd-input-font-size: 1rem;
  --pagefind-vue-fd-input-color: black;
  --pagefind-vue-fd-input-bg: white;
  --pagefind-vue-fd-input-padding: 0.5rem;
  --pagefind-vue-fd-options-max-height: 200px;
  --pagefind-vue-fd-options-z-index: 1000;
  --pagefind-vue-fd-options-bg: white;
  --pagefind-vue-fd-options-border: 1px solid #ccc;
  --pagefind-vue-fd-options-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --pagefind-vue-fd-option-text-align: left;
  --pagefind-vue-fd-option-padding: 0.4rem;
  --pagefind-vue-fd-option-color: black;
  --pagefind-vue-fd-option-font-size: 1rem;
  --pagefind-vue-fd-option-hover-bg: #b6b6b6;
  --pagefind-vue-fd-option-selected-bg: #c1ffbe;
  --pagefind-vue-fd-option-disabled-bg: #f5f5f5;
  --pagefind-vue-fd-no-results-font-style: italic;
}
</style>

<style scoped>
.filterable-dropdown-container {
  position: relative;
}

.filterable-dropdown-input {
  width: 100%;
  padding: var(--pagefind-vue-fd-input-padding);
  box-sizing: border-box;
  border: var(--pagefind-vue-fd-input-border);
  border-radius: var(--pagefind-vue-fd-input-border-radius);
  font-size: var(--pagefind-vue-fd-font-size);
  color: var(--pagefind-vue-fd-input-color);
  background: var(--pagefind-vue-fd-input-bg);
}

.filterable-dropdown-options {
  position: absolute;
  width: 100%;
  max-height: var(--pagefind-vue-fd-options-max-height);
  overflow-y: auto;
  z-index: var(--pagefind-vue-fd-options-z-index);
  background: var(--pagefind-vue-fd-options-bg);
  border: var(--pagefind-vue-fd-options-border);
  border-top: none;
  margin: 0;
  padding: 0;
  list-style: none;
  box-shadow: var(--pagefind-vue-fd-options-shadow);
}

.filterable-dropdown-option {
  width: 100%;
  text-align: var(--pagefind-vue-fd-option-text-align);
  padding: var(--pagefind-vue-fd-option-padding);
  border: none;
  background: none; /* has same effect as setting bg on the container */
  cursor: pointer;
  color: var(--pagefind-vue-fd-option-color);
  font-size: var(--pagefind-vue-fd-option-font-size);
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
}

.filterable-dropdown-option:hover,
.filterable-dropdown-option:focus {
  background-color: var(--pagefind-vue-fd-option-hover-bg);
}

.filterable-dropdown-option[aria-selected='true'] {
  background-color: var(--pagefind-vue-fd-option-selected-bg);
}

.filterable-dropdown-option[disabled],
.filterable-dropdown-option[disabled]:hover {
  opacity: 0.5;
  cursor: default;
  background-color: var(--pagefind-vue-fd-option-disabled-bg);
}

.filterable-dropdown-no-results {
  padding: var(--pagefind-vue-fd-option-padding);
  color: var(--pagefind-vue-fd-option-color);
  font-style: var(--pagefind-vue-fd-no-results-font-style);
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
