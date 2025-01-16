# pagefind-vue

## `FilterableDropdown.vue` CSS variables

These are the CSS variables available to be overidden and their default values:

```css
:root {
  --pagefind-vue-fd-input-border: 1px solid #ccc;
  --pagefind-vue-fd-input-border-radius: 0.25rem;
  --pagefind-vue-fd-font-size: 1rem;
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
