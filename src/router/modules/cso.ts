import { AppRouteRecord } from '@/types/router'

export const csoRoutes: AppRouteRecord = {
  name: 'CsoManagement',
  path: '/cso',
  component: '/index/index',
  meta: {
    title: 'menus.cso.title',
    icon: 'ri:building-2-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'overview',
      name: 'CsoOverview',
      component: '/cso/overview',
      meta: {
        title: 'menus.cso.overview',
        icon: 'ri:dashboard-3-line',
        keepAlive: false,
        fixedTab: true
      }
    },
    {
      path: 'partners',
      name: 'CsoPartners',
      component: '/cso/partners',
      meta: {
        title: 'menus.cso.partners',
        icon: 'ri:contacts-book-3-line',
        keepAlive: false
      }
    },
    {
      path: 'partner-360',
      name: 'CsoPartner360',
      component: '/cso/partner-360',
      meta: {
        title: 'menus.cso.partner360',
        icon: 'ri:focus-3-line',
        keepAlive: false
      }
    },
    {
      path: 'ddi',
      name: 'CsoDdi',
      component: '/cso/ddi',
      meta: {
        title: 'menus.cso.ddi',
        icon: 'ri:flow-chart',
        keepAlive: false
      }
    },
    {
      path: 'evidence',
      name: 'CsoEvidence',
      component: '/cso/evidence',
      meta: {
        title: 'menus.cso.evidence',
        icon: 'ri:file-shield-2-line',
        keepAlive: false
      }
    },
    {
      path: 'settlement',
      name: 'CsoSettlement',
      component: '/cso/settlement',
      meta: {
        title: 'menus.cso.settlement',
        icon: 'ri:funds-box-line',
        keepAlive: false
      }
    }
  ]
}
