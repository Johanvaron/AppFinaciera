import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Category, TransactionType } from '@shared/contract'
import MovimientosFilters from './MovimientosFilters.vue'

const MERCADO = 10
const SALARIO = 20
const categories: Category[] = [
  { id: MERCADO, name: 'Mercado', kind: 'expense', group: 'variables', color: 'green', archived: false },
  { id: SALARIO, name: 'Salario', kind: 'income', group: 'ingresos', color: 'teal', archived: false },
]

/** A parent that owns the v-models, like MovimientosView does. */
function mountWithParent(initialType: TransactionType | '', initialCategory: number | null) {
  const type = ref<TransactionType | ''>(initialType)
  const categoryId = ref<number | null>(initialCategory)
  const Parent = defineComponent({
    setup: () => () =>
      h(MovimientosFilters, {
        search: '',
        type: type.value,
        categoryId: categoryId.value,
        accountId: null,
        categories,
        accounts: [],
        active: false,
        'onUpdate:type': (value: TransactionType | '') => (type.value = value),
        'onUpdate:categoryId': (value: number | null) => (categoryId.value = value),
      }),
  })
  const wrapper = mount(Parent)
  return { type, categoryId, typeSelect: wrapper.get('select[aria-label="Tipo"]') }
}

describe('MovimientosFilters: changing the type', () => {
  it.each([
    ['', 'income'],
    ['', 'transfer'],
    ['expense', 'income'],
    ['expense', 'transfer'],
  ] as const)('from "%s" to "%s" drops an expense category that can no longer match', async (from, to) => {
    const { type, categoryId, typeSelect } = mountWithParent(from, MERCADO)
    await typeSelect.setValue(to)
    await nextTick()
    expect(type.value).toBe(to)
    expect(categoryId.value).toBeNull()
  })

  it('keeps the category when it belongs to the new type', async () => {
    const { categoryId, typeSelect } = mountWithParent('', MERCADO)
    await typeSelect.setValue('expense')
    await nextTick()
    expect(categoryId.value).toBe(MERCADO)
  })

  it('keeps the category when going back to all types', async () => {
    const { categoryId, typeSelect } = mountWithParent('income', SALARIO)
    await typeSelect.setValue('')
    await nextTick()
    expect(categoryId.value).toBe(SALARIO)
  })
})
