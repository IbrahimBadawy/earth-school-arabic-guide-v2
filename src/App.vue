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
  <AppLayout v-if="!isBlankLayout && authStore.user">
    <router-view v-slot="{ Component }">
      <transition name="slide" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </AppLayout>
  <router-view v-else />
</template>
