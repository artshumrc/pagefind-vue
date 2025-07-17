# pagefind-vue

## Quickstart

```console
npm install
npm run dev
```

## Available CSS Variables

### `FilterableDropdown.vue`

These are the CSS variables available to be overidden and their default values:

```css
:root {
  /* visible text input */
  --pagefind-vue-input-border: 1px solid #ccc;
  --pagefind-vue-input-border-radius: 0.25rem;
  --pagefind-vue-input-font-size: 1rem;
  --pagefind-vue-input-color: black;
  --pagefind-vue-input-bg: white;
  --pagefind-vue-input-padding: 0.5rem;

  /* dropdown container */
  --pagefind-vue-options-max-height: 200px;
  --pagefind-vue-options-z-index: 1000;
  --pagefind-vue-options-bg: white;
  --pagefind-vue-options-border: 1px solid #ccc;
  --pagefind-vue-options-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  /* individual option */
  --pagefind-vue-option-text-align: left;
  --pagefind-vue-option-padding: 0.4rem;
  --pagefind-vue-option-color: black;
  --pagefind-vue-option-font-size: 1rem;
  --pagefind-vue-option-hover-bg: #b6b6b6;
  --pagefind-vue-option-selected-bg: #c1ffbe;
  --pagefind-vue-option-disabled-bg: #f5f5f5;

  /* text displayed when no results match input */
  --pagefind-vue-no-results-font-style: italic;
}
```

### `CheckboxSingle.vue`

```CSS
:root {
  --pagefind-vue-checkbox-option-margin: 0.5rem 0;

  --pagefind-vue-checkbox-label-padding: 0.1rem 1.5rem;
  --pagefind-vue-checkbox-label-font-size: 1rem;
  --pagefind-vue-checkbox-text-color: black;

  --pagefind-vue-checkbox-input-size: 1rem;
  --pagefind-vue-checkbox-accent: rgb(55, 0, 255);
}
```

## Customize Filters and Filter Options

### Sort Filter Display Order

To control the display order of the filters, consumers can pass a custom sort function. For example, see below for how to pass a custom search function that orders the display of filters according to a list of filter names:

```vue
<Search :filter-group-sort-function="sortFilterGroupsByList">
</Search>

<script>
  const sortedFilterList = ['Crystal system', 'Abundance', 'Status at Tsumeb', 'Occurence']
  function sortFilterGroupsByList(a: string, b: string, filters: Filter): number {
    // Check if either value is in the priority list
    const indexA = sortedFilterList.indexOf(a)
    const indexB = sortedFilterList.indexOf(b)

    // Case 1: Both strings are in the priority list
    if (indexA >= 0 && indexB >= 0) {
      return indexA - indexB // Sort by priority list order
    }

    // Case 2: Only a is in the priority list
    if (indexA >= 0) {
      return -1 // a comes first
    }

    // Case 3: Only b is in the priority list
    if (indexB >= 0) {
      return 1 // b comes first
    }

    // Case 4: Neither is in priority list, sort by number of filter options
    return Object.keys(filters[b] || {}).length - Object.keys(filters[a] || {}).length
}
</script>
```

### Sort Filter Options Display Order

By default, filter options are sorted by their facet count in descending order. However, you can provide custom sorting functions to control the order of filter options for specific filters.

#### Basic Usage

Pass a `customSortFunctions` object to the `Search` component, where each key is the filter name and the value is a sort function:

```vue
<Search :custom-sort-functions="customSortFunctions"></Search>
```

Each sort function receives two parameters of type `[string, number]`, representing the filter option name (as defined in the Pagefind HTMl attributes) and its count:

```typescript
const customSortFunctions = {
  // Sort alphabetically by filter option name
  // `Category` is the filter name; `a[0]` is the option name, `a[1]` is the option count
  Category: (a: [string, number], b: [string, number]): number => {
    return a[0].localeCompare(b[0])
  },

  // Sort by count in ascending order (rather than the default descending)
  Author: (a: [string, number], b: [string, number]): number => {
    return a[1] - b[1]
  },
}
```

#### Deterministic Sorting with a Predefined List

For cases where you need a specific, deterministic order for filter options not based on something dynamic like alphabetical or numerical sorting, you can create a sort function that uses a predefined list of values:

```typescript
// Define the exact order you want options to appear in
const abundanceSortList = ['Very rare', 'Extremely rare', 'Very common', 'Common']

// Create a function that returns a sort function configured with your list
function sortByList(list: string[]): FilterSortFunction {
  return (a: [string, number], b: [string, number]): number => {
    // Get the index for each item
    const indexA = list.indexOf(a[0])
    const indexB = list.indexOf(b[0])

    // Case 1: Both strings are in the priority list
    if (indexA >= 0 && indexB >= 0) {
      return indexA - indexB // Sort by priority list order
    }

    // Case 2: Only a is in the priority list
    if (indexA >= 0) {
      return -1 // a comes first
    }

    // Case 3: Only b is in the priority list
    if (indexB >= 0) {
      return 1 // b comes first
    }

    // Case 4: Neither is in priority list, provide a fallback (in this case, descending order by count)
    return b[1] - a[1]
  }
}

// Use the function in your customSortFunctions object
const customSortFunctions = {
  Abundance: sortByList(abundanceSortList),
}
```

### Exclude Sort Filter Options

To exclude options for a specific filter, pass an object whose keys are the filter names and whose values are arrays of filter option names to exclude, e.g.

```vue
<Search
  ...
  :=":exclude-filter-options="excludedOptions"">
  ...
</Search>

<script>
const excludedOptions = {
  Abundance: ["N/A", "Unknown"]
}
</script>
```

### Ordering Results

To provide a sort ordering, pass an object whose key(s) are sort names as defined by `data-pagefind-sort` and values are either `asc` or `desc` for ascending or descending sorting order.

```vue
<Search ... :result-sort="alphabeticalSortOrder">
  ...
</Search>

<script>
const alphabeticalSortOrder = { title: 'desc' }
</script>
```

The resultSort object can be changed dynamically when the keyword changes using a handler for the emitted event `onQueryChange`, as below:

```vue
<Search :resultSort="resultSort" @update:searchQuery="onQueryChange">
  </Search>

<script>
const defaultSort: SortOption = { classification: 'asc' }
let resultSort = ref<SortOption>(defaultSort)

function onQueryChange(newQuery: string) {
  if (newQuery && newQuery.length > 0) {
    resultSort.value = { relevance: 'desc' }
  } else if (!newQuery) {
    resultSort.value = defaultSort
  }
}
</script>
```

## Hiding the Search Bar

If you want to hide the keyword search bar, you can pass a `showKeywordInput` parameter with the value `false` to the Search component

```vue
<Search
  ...
  :=":showKeywordInput="false"">
  ...
</Search>
```

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
