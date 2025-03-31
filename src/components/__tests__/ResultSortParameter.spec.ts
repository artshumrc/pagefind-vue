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

describe('PagefindSearch result sort parameter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should apply resultSort when provided to search function', async () => {
    mockPagefind.search.mockClear()

    const customResultSort = { Date: 'asc' as 'asc' }

    const wrapper = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        resultSort: customResultSort,
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

    const vm = wrapper.vm as any
    await vm.performSearch('test query')

    //
    expect(mockPagefind.search).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({
        sort: customResultSort,
      }),
    )

    // Alternatively, without a result sort prop
    mockPagefind.search.mockClear()

    const wrapperDefault = mount(PagefindSearch, {
      props: {
        pagefind: mockPagefind,
        // Result sort removed from here
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

    const vmDefault = wrapperDefault.vm as any
    await vmDefault.performSearch('test query')

    // Search should be called with default sort
    expect(mockPagefind.search).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({
        sort: { classification: 'asc' }, // this is currently the default in the component
      }),
    )
  })
})