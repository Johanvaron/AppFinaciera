import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import UiModal from './UiModal.vue'

/** A page with an opener button, a form modal and a confirmation that opens on top of it. */
const Host = defineComponent({
  components: { UiModal },
  setup() {
    return { form: ref(false), confirm: ref(false), mounted: ref(true) }
  },
  template: `
    <button id="opener" @click="form = true">Abrir</button>
    <UiModal v-if="mounted" v-model:open="form" title="Formulario">
      <input id="first" />
      <input id="marked" data-autofocus />
      <button id="ask" @click="confirm = true">Borrar</button>
    </UiModal>
    <UiModal v-model:open="confirm" title="Confirmar">
      <p>¿Seguro?</p>
      <template #footer><button id="yes">Sí</button></template>
    </UiModal>
  `,
})

const press = (key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  ;(document.activeElement ?? document.body).dispatchEvent(event)
  return event
}
const titles = () => [...document.querySelectorAll('[role="dialog"]')].map((d) => d.getAttribute('aria-label'))
const focusedId = () => (document.activeElement as HTMLElement | null)?.id

describe('UiModal: keyboard and focus', () => {
  let wrapper: VueWrapper

  async function openForm() {
    wrapper = mount(Host, { attachTo: document.body })
    const opener = document.querySelector<HTMLElement>('#opener')!
    opener.focus()
    opener.click()
    await nextTick()
    await nextTick()
  }

  afterEach(() => wrapper.unmount())

  it('starts on the field marked data-autofocus, not on the first one', async () => {
    await openForm()
    expect(focusedId()).toBe('marked')
  })

  it('Esc closes only the modal on top, then the one under it', async () => {
    await openForm()
    document.querySelector<HTMLElement>('#ask')!.click()
    await nextTick()
    await nextTick()
    expect(titles()).toEqual(['Formulario', 'Confirmar'])

    press('Escape')
    await nextTick()
    expect(titles()).toEqual(['Formulario'])

    press('Escape')
    await nextTick()
    expect(titles()).toEqual([])
  })

  it('gives the focus back to what opened it', async () => {
    await openForm()
    press('Escape')
    await nextTick()
    expect(focusedId()).toBe('opener')
  })

  it('gives the focus back when it is unmounted while open', async () => {
    await openForm()
    ;(wrapper.vm as unknown as { mounted: boolean }).mounted = false
    await nextTick()
    expect(focusedId()).toBe('opener')
  })

  it('keeps Tab inside the dialog', async () => {
    await openForm()
    const close = document.querySelector<HTMLElement>('[aria-label="Cerrar"]')!
    const last = document.querySelector<HTMLElement>('#ask')!

    last.focus()
    expect(press('Tab').defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(close)

    expect(press('Tab', { shiftKey: true }).defaultPrevented).toBe(true)
    expect(focusedId()).toBe('ask')

    // In the middle the browser moves the focus by itself.
    document.querySelector<HTMLElement>('#first')!.focus()
    expect(press('Tab').defaultPrevented).toBe(false)
  })
})
