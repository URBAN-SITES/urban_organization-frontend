import type { RouteRecordRaw } from 'vue-router'

export const githubRoutes: RouteRecordRaw[] = [
  {
    // fora do layout: serve tanto para quem entra quanto para quem já está logado
    path: '/integrations/github/callback',
    name: 'GitHubCallback',
    meta: { requiresAuth: false },
    component: () => import('../views/GitHubCallbackView.vue'),
  },
  {
    path: '/integracoes/github',
    meta: { requiresAuth: true, transitionGroup: 'default' },
    component: () => import('@/app/layouts/DefaultLayout.vue'),
    children: [{ path: '', name: 'GitHub', component: () => import('../views/GitHubView.vue') }],
  },
]
