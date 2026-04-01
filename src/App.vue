<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const route = useRoute()
const authStore = useAuthStore()

const isBlankLayout = computed(() => route.meta.layout === 'blank')
</script>

<template>
  <Toast position="top-left" />
  <ConfirmDialog />

  <!-- Wait for auth initialization -->
  <div v-if="!authStore.initialized" class="app-loading">
    <div class="loading-content">
      <span class="loading-logo">🌍</span>
      <p>جاري التحميل...</p>
    </div>
  </div>

  <template v-else>
    <AppLayout v-if="!isBlankLayout && authStore.user">
      <router-view :key="route.fullPath" />
    </AppLayout>
    <router-view v-else />
  </template>
</template>

<style>
.app-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
}
.loading-content {
  text-align: center;
}
.loading-logo {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
  animation: bounce 1.5s ease-in-out infinite;
}
.loading-content p {
  color: var(--text-secondary);
  font-size: 1rem;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
