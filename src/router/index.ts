import type { Component } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ArrowLeftRight, ChartColumn, LayoutDashboard, ListChecks, PiggyBank, Settings } from 'lucide-vue-next'
import AppShell from '@/components/layout/AppShell.vue'

interface NavItem {
  to: string
  label: string
  /** Label for the phone tab bar. */
  short: string
  icon: Component
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/resumen', label: 'Resumen', short: 'Resumen', icon: LayoutDashboard },
  { to: '/fijos', label: 'Gastos fijos', short: 'Fijos', icon: ListChecks },
  { to: '/movimientos', label: 'Movimientos', short: 'Movim.', icon: ArrowLeftRight },
  { to: '/presupuesto', label: 'Presupuesto', short: 'Presup.', icon: PiggyBank },
  { to: '/reportes', label: 'Reportes', short: 'Reportes', icon: ChartColumn },
  { to: '/ajustes', label: 'Ajustes', short: 'Ajustes', icon: Settings },
]

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', redirect: '/resumen' },
      { path: 'resumen', name: 'resumen', component: () => import('@/views/ResumenView.vue') },
      { path: 'fijos', name: 'fijos', component: () => import('@/views/FijosView.vue') },
      { path: 'movimientos', name: 'movimientos', component: () => import('@/views/MovimientosView.vue') },
      { path: 'presupuesto', name: 'presupuesto', component: () => import('@/views/PresupuestoView.vue') },
      { path: 'reportes', name: 'reportes', component: () => import('@/views/ReportesView.vue') },
      { path: 'ajustes', name: 'ajustes', component: () => import('@/views/AjustesView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/resumen' },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
