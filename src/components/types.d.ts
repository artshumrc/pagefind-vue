export interface Option {
  value: string
  label: string
  count: number
}

export interface FilterDefinitionObject {
  type: string // Widget type: 'checkboxes', 'dropdown', etc.
  label?: string // Optional custom label for the filter group
  // Could be extended with additional properties as needed
}

// FiltersDefinition can accept either a string (legacy) or object (new approach)
export type FiltersDefinition = {
  [key: string]: string | FilterDefinitionObject
}

export type FilterGroup = {
  label: string // Label for the filter group
  collapsible?: boolean // Whether the group is collapsible
  initiallyOpen?: boolean // Whether the group is initially expanded
  filters: FiltersDefinition // Definition of filters within the group
}

export interface Filter {
  [key: string]: {
    [key: string]: number
  }
}

export interface Tab {
  label: string
  value: string
  count: number
}

export type FilterSortFunction = (a: [string, number], b: [string, number]) => number

export interface CustomSortFunctions {
  [key: string]: FilterSortFunction
}

export interface ResultData {
  url: string
  raw_url: string
  excerpt: string
  meta: {
    title: string
    [key: string]: any
  }
  filters?: Record<string, string[]>
}

export type SortOption = {
  [key: string]: 'asc' | 'desc'
}
