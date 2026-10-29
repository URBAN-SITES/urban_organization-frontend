import type { RouteRecordRaw } from 'vue-router'

export const meetingRoutes: RouteRecordRaw[] = [
  {
    // tela cheia, fora do layout com menu
    path: '/reunioes/:meetingId',
    name: 'MeetingRoom',
    meta: { requiresAuth: true },
    component: () => import('../views/MeetingRoomView.vue'),
  },
]
