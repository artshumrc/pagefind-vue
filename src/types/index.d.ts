/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'pagefind-vue' {
  import { DefineComponent } from 'vue'

  export const Search: DefineComponent<{
    pagefind: any
    tabbedFilter?: string
    defaultTab?: string
    excludeFilters?: string[]
    checkboxToDropdownBreakpoint?: number
  }>
}
