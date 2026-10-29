import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Position in the sign-in flow; going to a higher step slides left, lower slides right. */
    authStep?: number
    /** Sign-up screens show the image panel on the right instead of the left. */
    authAsideRight?: boolean
    /** Office photo shown in the institutional panel. */
    authScene?: 'executive' | 'workstation' | 'boardroom'
  }
}

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/auth',
    redirect: { name: 'Login' },
    meta: { requiresAuth: false, guestOnly: true, transitionGroup: 'auth' },
    component: () => import('../components/AuthShell.vue'),
    children: [
      {
        path: '/entrar',
        name: 'Login',
        meta: { authStep: 0 },
        component: () => import('../views/LoginView.vue'),
      },
      {
        path: '/registrar',
        name: 'Register',
        meta: { authStep: 1, authAsideRight: true, authScene: 'workstation' },
        component: () => import('../views/RegisterView.vue'),
      },
      {
        path: '/registrar/codigo',
        name: 'RegisterCode',
        meta: { authStep: 2, authAsideRight: true, authScene: 'workstation' },
        component: () => import('../views/VerifyCodeView.vue'),
        props: { flow: 'register' },
      },
      {
        path: '/esqueci-senha',
        name: 'ForgotPassword',
        meta: { authStep: 1, authScene: 'boardroom' },
        component: () => import('../views/ForgotPasswordView.vue'),
      },
      {
        path: '/esqueci-senha/codigo',
        name: 'ResetCode',
        meta: { authStep: 2, authScene: 'boardroom' },
        component: () => import('../views/VerifyCodeView.vue'),
        props: { flow: 'reset' },
      },
      {
        path: '/esqueci-senha/nova-senha',
        name: 'ResetPassword',
        meta: { authStep: 3, authScene: 'boardroom' },
        component: () => import('../views/ResetPasswordView.vue'),
      },
    ],
  },
]
