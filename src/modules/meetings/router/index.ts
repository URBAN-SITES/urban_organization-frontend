import type { RouteRecordRaw } from 'vue-router'

export const meetingRoutes: RouteRecordRaw[] = [
  {
    // tela cheia, fora do layout com menu
    path: '/reunioes/:meetingId',
    name: 'MeetingRoom',
    meta: { requiresAuth: true },
    component: () => import('../views/MeetingRoomView.vue'),
  },
  {
    path: '/reunioes/:meetingId/gravacoes/:recordingId',
    meta: { requiresAuth: true, transitionGroup: 'default' },
    component: () => import('@/app/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'MeetingInsight',
        component: () => import('../views/MeetingInsightView.vue'),
        props: true,
      },
    ],
  },
]
