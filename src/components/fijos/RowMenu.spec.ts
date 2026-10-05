import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import RowMenu from './RowMenu.vue'

const ITEMS = [
  { key: 'edit', label: 'Editar', icon: Pencil },
  { key: 'remove', label: 'Eliminar', icon: Trash2, danger: true },
]
const PANEL_HEIGHT = 248
const WINDOW_HEIGHT = 640

describe('RowMenu: where the panel opens', () => {
  let wrapper: VueWrapper

  /** Opens the menu with its button at that distance from the top of a 640px window. */
  async function openAt(buttonTop: number) {
    vi.stubGlobal('innerHeight', WINDOW_HEIGHT)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const isPanel = this.getAttribute('role') === 'menu'
      const top = isPanel ? 0 : buttonTop
      const height = isPanel ? PANEL_HEIGHT : 40
      return { top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) }
    })
    wrapper = mount(RowMenu, { attachTo: document.body, props: { label: 'Acciones de Moto', items: ITEMS } })
    await wrapper.find('button').trigger('click')
    await nextTick()
    await nextTick()
    return wrapper.find('[role="menu"]').classes()
  }

  afterEach(() => {
    wrapper.unmount()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens below the button when there is room', async () => {
    const classes = await openAt(120)
    expect(classes).toContain('top-full')
    expect(classes).not.toContain('bottom-full')
  })

  it('opens above the button of a row near the bottom bar, so "Eliminar" can be reached', async () => {
    const classes = await openAt(500)
    expect(classes).toContain('bottom-full')
    expect(classes).not.toContain('top-full')
  })

  it('counts the bottom bar: 250px under the button are not enough for a 248px panel', async () => {
    // 640 - 350 (button bottom) = 290 free, minus the 80 kept for the bottom bar = 210 < 248.
    expect(await openAt(310)).toContain('bottom-full')
  })
})
