import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Position in the sign-in flow; going to a higher step slides left, lower slides right. */
    authStep?: number
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
        meta: { authStep: 1 },
        component: () => import('../views/RegisterView.vue'),
      },
      {
        path: '/registrar/codigo',
        name: 'RegisterCode',
        meta: { authStep: 2 },
        component: () => import('../views/VerifyCodeView.vue'),
        props: { flow: 'register' },
      },
      {
        path: '/esqueci-senha',
        name: 'ForgotPassword',
        meta: { authStep: 1 },
        component: () => import('../views/ForgotPasswordView.vue'),
      },
      {
        path: '/esqueci-senha/codigo',
        name: 'ResetCode',
        meta: { authStep: 2 },
        component: () => import('../views/VerifyCodeView.vue'),
        props: { flow: 'reset' },
      },
      {
        path: '/esqueci-senha/nova-senha',
        name: 'ResetPassword',
        meta: { authStep: 3 },
        component: () => import('../views/ResetPasswordView.vue'),
      },
    ],
  },
]
