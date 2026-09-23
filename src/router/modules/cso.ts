import { AppRouteRecord } from '@/types/router'

const moduleRoles = ['R_SUPER', 'R_ADMIN']

export const csoRelationshipRoutes: AppRouteRecord = {
  name: 'CsoRelationship',
  path: '/cso/relationship',
  component: '/index/index',
  meta: {
    title: 'menus.cso.relationship',
    icon: 'ri:links-line',
    roles: moduleRoles
  },
  children: [
    {
      path: 'onboarding',
      name: 'CsoOnboarding',
      component: '/cso/onboarding',
      meta: {
        title: 'menus.cso.onboarding',
        icon: 'ri:user-shared-line',
        keepAlive: false
      }
    },
    {
      path: 'contracts',
      name: 'CsoContracts',
      component: '/cso/contracts',
      meta: {
        title: 'menus.cso.contracts',
        icon: 'ri:file-paper-2-line',
        keepAlive: false
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
      path: 'representatives',
      name: 'CsoRepresentatives',
      component: '/cso/representatives',
      meta: {
        title: 'menus.cso.representatives',
        icon: 'ri:group-line',
        keepAlive: false
      }
    }
  ]
}

export const csoMarketRoutes: AppRouteRecord = {
  name: 'CsoMarket',
  path: '/cso/market',
  component: '/index/index',
  meta: {
    title: 'menus.cso.market',
    icon: 'ri:store-2-line',
    roles: moduleRoles
  },
  children: [
    {
      path: 'roadmap',
      name: 'CsoMarketRoadmap',
      component: '/cso/roadmap',
      meta: {
        title: 'menus.cso.marketRoadmap',
        icon: 'ri:road-map-line',
        keepAlive: false
      }
    }
  ]
}

export const csoExecutionRoutes: AppRouteRecord = {
  name: 'CsoExecution',
  path: '/cso/execution',
  component: '/index/index',
  meta: {
    title: 'menus.cso.execution',
    icon: 'ri:run-line',
    roles: moduleRoles
  },
  children: [
    {
      path: 'roadmap',
      name: 'CsoExecutionRoadmap',
      component: '/cso/roadmap',
      meta: {
        title: 'menus.cso.executionRoadmap',
        icon: 'ri:road-map-line',
        keepAlive: false
      }
    }
  ]
}

export const csoPerformanceRoutes: AppRouteRecord = {
  name: 'CsoPerformance',
  path: '/cso/performance',
  component: '/index/index',
  meta: {
    title: 'menus.cso.performance',
    icon: 'ri:bar-chart-box-line',
    roles: moduleRoles
  },
  children: [
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
      path: 'sales-confirm',
      name: 'CsoSalesConfirm',
      component: '/cso/sales-confirm',
      meta: {
        title: 'menus.cso.salesConfirm',
        icon: 'ri:checkbox-multiple-line',
        keepAlive: false
      }
    },
    {
      path: 'rebate',
      name: 'CsoRebate',
      component: '/cso/rebate',
      meta: {
        title: 'menus.cso.rebate',
        icon: 'ri:calculator-line',
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

export const csoInsightRoutes: AppRouteRecord = {
  name: 'CsoInsight',
  path: '/cso/insight',
  component: '/index/index',
  meta: {
    title: 'menus.cso.insight',
    icon: 'ri:lightbulb-flash-line',
    roles: moduleRoles
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
    }
  ]
}
