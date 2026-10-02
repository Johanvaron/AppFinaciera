import { mount } from '@vue/test-utils'
import UiMoneyInput from './UiMoneyInput.vue'

function mountInput(initial: number | null) {
  const wrapper = mount(UiMoneyInput, {
    props: {
      modelValue: initial,
      'onUpdate:modelValue': (value: number | null) => wrapper.setProps({ modelValue: value }),
    },
  })
  return wrapper
}
const emitted = (wrapper: ReturnType<typeof mountInput>) => wrapper.emitted('update:modelValue')!.map(([value]) => value)

describe('UiMoneyInput', () => {
  it('emits integer pesos for what gets typed', async () => {
    const wrapper = mountInput(null)
    await wrapper.find('input').setValue('1.250.000')
    await wrapper.find('input').setValue('200k')
    expect(emitted(wrapper)).toEqual([1250000, 200000])
  })

  it('emits null, never 0, for something that is not an amount', async () => {
    const wrapper = mountInput(78000)
    await wrapper.find('input').setValue('abc')
    expect(emitted(wrapper)).toEqual([null])
    // The typed text stays so the person can fix it.
    expect(wrapper.find('input').element.value).toBe('abc')
  })

  it('emits null when the field is emptied', async () => {
    const wrapper = mountInput(78000)
    await wrapper.find('input').setValue('')
    expect(emitted(wrapper)).toEqual([null])
  })

  it('shows the starting value and tidies what was typed on blur', async () => {
    const wrapper = mountInput(514381)
    const input = wrapper.find('input')
    expect(input.element.value).toBe('514.381')
    await input.setValue('1,5m')
    await input.trigger('blur')
    expect(input.element.value).toBe('1.500.000')
  })

  it('follows a value set from outside (form reset, editing another row)', async () => {
    const wrapper = mountInput(514381)
    await wrapper.setProps({ modelValue: 319000 })
    expect(wrapper.find('input').element.value).toBe('319.000')
    await wrapper.setProps({ modelValue: null })
    expect(wrapper.find('input').element.value).toBe('')
  })
})
