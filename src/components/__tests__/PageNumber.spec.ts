import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Search from '../PagefindSearch.vue' // update with your correct path

function makePagefindMock(total = 25) {
  return {
    search: async (_query: any, _opts: any) => {
      const results = Array.from({ length: total }, (_, i) => ({
        data: async () => ({
          id: i + 1,
          title: `Result #${i + 1}`,
          meta: {
            title: `Result #${i + 1}`,
          },
        }),
      }))
      return {
        results,
        total,
      }
    },
    filters: async () => ({}),
  }
}

describe('Search pagination', () => {
  it('updates the current page when Next and Previous buttons are clicked', async () => {
    const wrapper = mount(Search, {
      props: {
        pagefind: makePagefindMock(25),
        itemsPerPage: 10,
      },
      attachTo: document.body
    })
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const nextButton = buttons.find(btn => btn.text() === 'Next')
    const prevButton = buttons.find(btn => btn.text() === 'Previous')

    let resultEls = wrapper.findAll('li')
    let resultTexts = resultEls.map(el => el.text())
    expect(resultTexts).toEqual(
      Array.from({length: 10}, (_, i) => `Result #${i+1}`)
    );

    await nextButton!.trigger('click')
    await flushPromises();
    resultEls = wrapper.findAll('li')
    resultTexts = resultEls.map(el => el.text())

    expect(resultTexts).toEqual(
      Array.from({length: 10}, (_, i) => `Result #${i+11}`)
    );


    await nextButton!.trigger('click')
    await flushPromises();
    resultEls = wrapper.findAll('li')
    resultTexts = resultEls.map(el => el.text())

    expect(resultTexts).toEqual(
      Array.from({length: 5}, (_, i) => `Result #${i+21}`)
    );

    //going back from 3 shouldn't take you directly to one
    await prevButton!.trigger('click')
    await flushPromises();
    resultEls = wrapper.findAll('li')
    resultTexts = resultEls.map(el => el.text())

    expect(resultTexts).toEqual(
      Array.from({length: 10}, (_, i) => `Result #${i+11}`)
    );
  })
})
