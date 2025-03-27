export interface Option {
  value: string
  label: string
  count: number
}

export interface ResultData {
  meta: {
    title: string
    image?: string
    image_alt?: string
  }
  raw_url: string
  excerpt: string
}

export interface FiltersDefinition {
  [key: string]: 'checkboxes' | 'filterableDropdown'
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

export type SortOption = {
  [key: string]: 'asc' | 'desc';
};