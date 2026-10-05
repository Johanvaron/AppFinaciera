import { mount } from '@vue/test-utils'
import { Wallet } from 'lucide-vue-next'
import StatCard from './StatCard.vue'

describe('StatCard', () => {
  it('shows a 9-digit figure whole: it may shrink with the card, never end in an ellipsis', () => {
    const wrapper = mount(StatCard, { props: { label: 'Saldo total', value: '$ 123.456.789', detail: '+10 % vs septiembre', icon: Wallet } })
    const figure = wrapper.find('.num')
    expect(figure.text()).toBe('$ 123.456.789')
    expect(figure.classes()).not.toContain('truncate')
    expect(figure.classes()).toContain('stat-card-figure')
    expect(wrapper.text()).toContain('Saldo total')
    expect(wrapper.text()).toContain('+10 % vs septiembre')
  })

  it('the lead figure of a row gets the larger size', () => {
    const wrapper = mount(StatCard, { props: { label: 'Disponible', value: '-$ 319.000', icon: Wallet, large: true } })
    expect(wrapper.find('.num').classes()).toContain('stat-card-figure-large')
    expect(wrapper.find('.num').text()).toBe('-$ 319.000')
  })
})
