import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent, nextTick, ref } from 'vue'
import { ApiRequestError } from '@/lib/api'
import DeleteConfirmModal from './DeleteConfirmModal.vue'

const IN_USE = 'La cuenta tiene 12 movimientos: no se puede eliminar.'

/** One `remove` call whose answer the test decides when to deliver. */
function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.trim() === label)
const alerts = () => [...document.querySelectorAll('[role="dialog"] [role="alert"]')].map((el) => el.textContent?.trim())
const dialogs = () => document.querySelectorAll('[role="dialog"]').length
/** Lets a settled mutation run its handlers and the DOM catch up. */
const settle = async () => {
  await new Promise((done) => setTimeout(done, 0))
  await nextTick()
}

describe('DeleteConfirmModal', () => {
  let wrapper: VueWrapper
  const remove = vi.fn<() => Promise<unknown>>()
  const archive = vi.fn<() => Promise<unknown>>()
  const open = ref(false)
  const archived = ref(false)

  const Host = defineComponent({
    components: { DeleteConfirmModal },
    setup: () => ({ open, archived, remove, archive }),
    template: `
      <DeleteConfirmModal
        v-model:open="open"
        title="Eliminar cuenta"
        name="Nequi"
        :archived="archived"
        :remove="remove"
        :archive="archive"
        deleted-text="Cuenta eliminada"
        archived-text="Cuenta archivada"
      />
    `,
  })

  async function show() {
    open.value = true
    await nextTick()
    await nextTick()
  }

  beforeEach(async () => {
    remove.mockReset()
    archive.mockReset().mockResolvedValue(undefined)
    open.value = false
    archived.value = false
    wrapper = mount(Host, { attachTo: document.body, global: { plugins: [createPinia(), VueQueryPlugin] } })
    await show()
  })

  afterEach(() => wrapper.unmount())

  /** Confirm, close before the answer arrives and open again (on another item). */
  async function confirmCloseReopen() {
    const first = deferred()
    remove.mockReturnValueOnce(first.promise)
    button('Eliminar')!.click()
    await nextTick()
    open.value = false
    await nextTick()
    await show()
    return first
  }

  it('a late success of a closed dialog does not close the one reopened', async () => {
    const first = await confirmCloseReopen()
    first.resolve()
    await settle()
    expect(open.value).toBe(true)
    expect(dialogs()).toBe(1)
    expect(alerts()).toEqual([])
    expect(button('Archivar')).toBeUndefined()
  })

  it('a late 409 of a closed dialog does not offer Archivar in the one reopened', async () => {
    const first = await confirmCloseReopen()
    first.reject(new ApiRequestError(409, IN_USE))
    await settle()
    expect(open.value).toBe(true)
    expect(alerts()).toEqual([])
    expect(button('Archivar')).toBeUndefined()
    expect(button('Eliminar')).toBeDefined()
  })

  it('closes after deleting', async () => {
    remove.mockResolvedValueOnce(undefined)
    button('Eliminar')!.click()
    await settle()
    expect(remove).toHaveBeenCalledTimes(1)
    expect(open.value).toBe(false)
  })
})
