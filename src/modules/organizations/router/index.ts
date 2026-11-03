import type { RouteRecordRaw, RouteRecordSingleView } from 'vue-router'

// telas da organização dentro do layout do app, como os outros módulos: trocar de tela
// mantém barra lateral e topo montados (antes cada tela montava o próprio layout e
// abrir Projetos recarregava a casca inteira)
const inAppLayout = (route: RouteRecordSingleView): RouteRecordRaw => ({
  path: route.path,
  meta: { ...route.meta, transitionGroup: 'default' },
  component: () => import('@/app/layouts/DefaultLayout.vue'),
  children: [{ ...route, path: '', meta: undefined }],
})

export const organizationRoutes: RouteRecordRaw[] = [
  inAppLayout({
    path: '/organizacoes/:organizationId/times',
    name: 'OrganizationTeams',
    component: () => import('../views/OrganizationTeamsView.vue'),
    meta: { requiresAuth: true },
  }),
  inAppLayout({
    path: '/organizacoes/:organizationId/projetos',
    name: 'OrganizationSectors',
    component: () => import('../views/OrganizationProjectsView.vue'),
    meta: { requiresAuth: true },
  }),
  // endereço antigo (links salvos e e-mails já enviados)
  {
    path: '/organizacoes/:organizationId/setores',
    redirect: (to) => ({ name: 'OrganizationSectors', params: to.params }),
  },
  inAppLayout({
    path: '/organizacoes/:organizationId/configuracoes',
    name: 'OrganizationSettings',
    component: () => import('../views/OrganizationSettingsView.vue'),
    meta: { requiresAuth: true },
  }),
  inAppLayout({
    path: '/w/:slug',
    name: 'OrganizationAddress',
    component: () => import('../views/OrganizationAddressView.vue'),
    meta: { requiresAuth: true },
  }),
  {
    path: '/organizacoes/:organizationId/configurar-setores',
    name: 'OrganizationOnboardingSectors',
    component: () => import('../views/OrganizationOnboardingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/organizacoes/nova',
    name: 'OrganizationOnboarding',
    component: () => import('../views/OrganizationOnboardingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/organizacoes/:organizationId/convidar',
    name: 'OrganizationOnboardingTeam',
    component: () => import('../views/OrganizationOnboardingView.vue'),
    meta: { requiresAuth: true },
  },
  inAppLayout({
    path: '/organizacoes',
    name: 'Organizations',
    component: () => import('../views/OrganizationsView.vue'),
    meta: { requiresAuth: true },
  }),
  inAppLayout({
    path: '/organizacoes/:organizationId/membros',
    name: 'OrganizationMembers',
    component: () => import('../views/OrganizationMembersView.vue'),
    meta: { requiresAuth: true },
  }),
]
