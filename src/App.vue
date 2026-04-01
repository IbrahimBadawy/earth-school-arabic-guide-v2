<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isBlankLayout = computed(() => route.meta.layout === 'blank')

// Watch for logout - redirect immediately when user becomes null
watch(() => authStore.user, (newUser) => {
  if (!newUser && route.meta.requiresAuth) {
    router.push('/login')
  }
})
</script>

<template>
  <Toast position="top-left" />
  <ConfirmDialog />

  <!-- Loading screen while auth initializes -->
  <div v-if="!authStore.initialized" class="app-loading">
    <div class="loading-content">
      <span class="loading-logo">🌍</span>
      <p>جاري التحميل...</p>
    </div>
  </div>

  <!-- Login page (no layout) -->
  <router-view v-else-if="isBlankLayout || !authStore.user" />

  <!-- Main app with layout - :key forces remount on navigation -->
  <AppLayout v-else>
    <router-view :key="route.fullPath" />
  </AppLayout>
</template>

<style>
.app-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
}
.loading-content { text-align: center; }
.loading-logo {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
  animation: bounce 1.5s ease-in-out infinite;
}
.loading-content p { color: var(--text-secondary); font-size: 1rem; }
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
