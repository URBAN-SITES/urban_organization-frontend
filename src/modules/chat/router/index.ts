import type { RouteRecordRaw } from 'vue-router'

export const chatRoutes: RouteRecordRaw[] = [
  {
    path: '/mensagens',
    // the screen lives at /chat; without this the bare /mensagens URL rendered an empty layout
    redirect: { name: 'Chat' },
    meta: { transitionGroup: 'default' },
    component: () => import('@/app/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '/chat',
        name: 'Chat',
        component: () => import('../views/ChatView.vue'),
      },
    ],
  },
  {
    path: '/assistente',
    // a IA é liberada para toda conta logada; o guard global cuida do login
    meta: { requiresAuth: true, transitionGroup: 'default' },
    component: () => import('@/app/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'Assistant',
        component: () => import('../views/AssistantView.vue'),
      },
    ],
  },
]
