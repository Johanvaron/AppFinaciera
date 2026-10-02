/**
 * Server state for the whole app (TanStack Query). Views read through these
 * hooks and write through useApiMutation; nothing else caches API data.
 */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { CategoryKind, Month } from '@shared/contract'
import { api, ApiRequestError, type TransactionFilters } from './api'
import { useToasts } from './toasts'

export const useAccounts = () => useQuery({ queryKey: ['accounts'], queryFn: api.accounts.list })

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: api.categories.list })

export const useTransactions = (query: MaybeRefOrGetter<TransactionFilters>) =>
  useQuery({
    queryKey: computed(() => ['transactions', toValue(query)]),
    queryFn: () => api.transactions.list(toValue(query)),
    placeholderData: (previous) => previous,
  })

export const useFixedMonth = (month: MaybeRefOrGetter<Month>) =>
  useQuery({
    queryKey: computed(() => ['fixed', toValue(month)]),
    queryFn: () => api.fixed.month(toValue(month)),
    placeholderData: (previous) => previous,
  })

export const useBudgets = (month: MaybeRefOrGetter<Month>) =>
  useQuery({
    queryKey: computed(() => ['budgets', toValue(month)]),
    queryFn: () => api.budgets.month(toValue(month)),
    placeholderData: (previous) => previous,
  })

export const useSummary = (month: MaybeRefOrGetter<Month>) =>
  useQuery({
    queryKey: computed(() => ['summary', toValue(month)]),
    queryFn: () => api.summary(toValue(month)),
    placeholderData: (previous) => previous,
  })

export const useMonthlyReport = (params: MaybeRefOrGetter<{ months?: number; until?: Month }>) =>
  useQuery({
    queryKey: computed(() => ['reports', 'monthly', toValue(params)]),
    queryFn: () => api.reports.monthly(toValue(params)),
    placeholderData: (previous) => previous,
  })

export const useCategoryReport = (params: MaybeRefOrGetter<{ from: Month; to: Month; kind?: CategoryKind }>) =>
  useQuery({
    queryKey: computed(() => ['reports', 'categories', toValue(params)]),
    queryFn: () => api.reports.categories(toValue(params)),
    placeholderData: (previous) => previous,
  })

/** Message to show a person for any thrown error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message
  return 'Algo salió mal. Intenta de nuevo.'
}

/** Field errors of a 422, to paint them next to each input. */
export function errorFields(error: unknown): Record<string, string> {
  return error instanceof ApiRequestError ? error.fields : {}
}

/**
 * Any write. Every figure in the app derives from the same few tables, so a
 * write invalidates ALL cached queries (on success AND on error) instead of
 * guessing which ones.
 * Errors show a toast unless `silentError` (when the form paints them itself).
 */
export function useApiMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  options: { success?: string; silentError?: boolean } = {},
) {
  const queryClient = useQueryClient()
  const toasts = useToasts()
  return useMutation({
    mutationFn,
    onError: (error) => {
      if (!options.silentError) toasts.error(errorMessage(error))
    },
    // A failed write may have been applied in part (a batch that stops halfway): refresh either way.
    onSettled: async (_data, error) => {
      await queryClient.invalidateQueries()
      if (!error && options.success) toasts.success(options.success)
    },
  })
}
