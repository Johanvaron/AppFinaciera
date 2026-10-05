import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent, h } from 'vue'
import { ApiRequestError } from './api'
import { useApiMutation } from './queries'
import { useToasts } from './toasts'

/** Runs useApiMutation inside a component, the only place a composable can live. */
function setup<T>(mutationFn: () => Promise<T>, options?: Parameters<typeof useApiMutation>[1]) {
  const queryClient = new QueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const pinia = createPinia()
  setActivePinia(pinia)
  let mutation!: ReturnType<typeof useApiMutation<void, T>>
  const Host = defineComponent({
    setup() {
      mutation = useApiMutation<void, T>(mutationFn, options)
      return () => h('div')
    },
  })
  const wrapper = mount(Host, { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } })
  return { mutation, invalidate, toasts: useToasts(), wrapper }
}

describe('useApiMutation', () => {
  it('refreshes every query and then confirms after a write that worked', async () => {
    const { mutation, invalidate, toasts, wrapper } = setup(() => Promise.resolve(7), { success: 'Movimiento eliminado' })
    await expect(mutation.mutateAsync()).resolves.toBe(7)
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(toasts.items.map((t) => [t.kind, t.message])).toEqual([['success', 'Movimiento eliminado']])
    wrapper.unmount()
  })

  it('refreshes every query after a write that failed, and says what happened', async () => {
    const failure = new ApiRequestError(409, 'Se eliminaron 2 de 5 movimientos')
    const { mutation, invalidate, toasts, wrapper } = setup(() => Promise.reject(failure), { success: 'Movimientos eliminados' })
    await expect(mutation.mutateAsync()).rejects.toBe(failure)
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(toasts.items.map((t) => [t.kind, t.message])).toEqual([['error', 'Se eliminaron 2 de 5 movimientos']])
    wrapper.unmount()
  })

  it('with silentError still refreshes but leaves the message to the form', async () => {
    const { mutation, invalidate, toasts, wrapper } = setup(() => Promise.reject(new ApiRequestError(422, 'Revisa los datos')), { silentError: true })
    await expect(mutation.mutateAsync()).rejects.toThrow('Revisa los datos')
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(toasts.items).toEqual([])
    wrapper.unmount()
  })
})
