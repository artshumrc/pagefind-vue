import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PagefindSearch from '../PagefindSearch.vue'

const mockPagefind = {
  search: vi.fn().mockResolvedValue({
    total: 0,
  }),
  filters: vi.fn().mockResolvedValue({}),
}

describe('PagefindSearch show search parameter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show or hide the search field as appropriate', async () => {
    mockPagefind.search.mockClear()

    //check that the search field is hidden when showSearch is false
    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        showSearch: false,
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()

    expect(wrapper.find('.search-form').exists()).toBe(false)

    mockPagefind.search.mockClear()

    //check that the search field is shown when showSearch is true
    const wrapperDefault = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        showSearch: true,
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()

    expect(wrapperDefault.find('.search-form').exists()).toBe(true)

    //check that the search field is shown when no parameter is given
    const wrapperNoParam = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
      },
      global: {
        stubs: {
          Filters: true,
          Results: true,
          Tabs: true,
        },
      },
    })

    await nextTick()

    expect(wrapperNoParam.find('.search-form').exists()).toBe(true)
  })
})
