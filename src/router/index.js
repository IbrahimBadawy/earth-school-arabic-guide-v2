import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false, layout: 'blank' }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/level/:levelId',
    name: 'Level',
    component: () => import('@/views/teacher/LevelView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/level/:levelId/week/:weekId',
    name: 'WeekView',
    component: () => import('@/views/teacher/WeekView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/level/:levelId/week/:weekId/day/:dayId',
    name: 'DayView',
    component: () => import('@/views/teacher/DayView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/objectives',
    name: 'Objectives',
    component: () => import('@/views/teacher/ObjectivesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/assessment',
    name: 'Assessment',
    component: () => import('@/views/teacher/AssessmentView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tools',
    name: 'Tools',
    component: () => import('@/views/teacher/ToolsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/activities',
    name: 'ActivitiesLibrary',
    component: () => import('@/views/teacher/ActivitiesLibraryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/faq',
    name: 'FAQ',
    component: () => import('@/views/teacher/FaqView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('@/views/admin/UsersView.vue'),
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/admin/units',
    name: 'AdminUnits',
    component: () => import('@/views/admin/UnitsManageView.vue'),
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/admin/content',
    name: 'AdminContent',
    component: () => import('@/views/admin/ContentManageView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/subjects',
    name: 'AdminSubjects',
    component: () => import('@/views/admin/SubjectsManageView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/reports',
    name: 'AdminReports',
    component: () => import('@/views/admin/ReportsView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/export',
    name: 'Export',
    component: () => import('@/views/ExportView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    await authStore.initialize()
  }

  if (to.meta.requiresAuth && !authStore.user) {
    return { name: 'Login' }
  }

  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
    return { name: 'Dashboard' }
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'Dashboard' }
  }

  if (to.name === 'Login' && authStore.user) {
    return { name: 'Dashboard' }
  }
})

export default router
