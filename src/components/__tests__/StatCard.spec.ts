import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCard from '../StatCard.vue'

describe('StatCard', () => {
  it('renders correctly with basic props', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: 'Ingresos',
        value: 1000000,
        type: 'income',
      },
    })

    expect(wrapper.text()).toContain('Ingresos')
    // El formato COP usa espacio no separable
    expect(wrapper.text()).toMatch(/\$\s*1[.,]000[.,]000/)
  })

  it('displays positive trend correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: 'Balance',
        value: 5000000,
        type: 'balance',
        trend: 15.5,
      },
    })

    expect(wrapper.text()).toContain('15.5%')
    expect(wrapper.find('.bg-success-100').exists()).toBe(true)
  })

  it('displays negative trend correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: 'Gastos',
        value: 800000,
        type: 'expense',
        trend: -10.2,
      },
    })

    expect(wrapper.text()).toContain('10.2%')
    expect(wrapper.find('.bg-danger-100').exists()).toBe(true)
  })

  it('renders without trend', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: 'Balance',
        value: 2000000,
        type: 'balance',
      },
    })

    expect(wrapper.text()).not.toContain('%')
  })

  it('formats currency correctly for Colombian pesos', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: 'Test',
        value: 1500000,
        type: 'default',
      },
    })

    // Should format to Colombian pesos
    expect(wrapper.text()).toMatch(/\$\s*1[.,]500[.,]000/)
  })

  it('applies correct icon for income type', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: 'Ingresos',
        value: 1000000,
        type: 'income',
      },
    })

    expect(wrapper.find('.bg-success-100').exists()).toBe(true)
    expect(wrapper.find('.text-success-600').exists()).toBe(true)
  })

  it('applies correct icon for expense type', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: 'Gastos',
        value: 500000,
        type: 'expense',
      },
    })

    expect(wrapper.find('.bg-danger-100').exists()).toBe(true)
    expect(wrapper.find('.text-danger-600').exists()).toBe(true)
  })

  it('applies correct icon for balance type', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: 'Balance',
        value: 2000000,
        type: 'balance',
      },
    })

    expect(wrapper.find('.bg-primary-100').exists()).toBe(true)
    expect(wrapper.find('.text-primary-600').exists()).toBe(true)
  })
})
