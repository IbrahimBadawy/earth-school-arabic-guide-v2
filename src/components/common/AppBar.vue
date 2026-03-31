<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import { ref } from 'vue'

const emit = defineEmits(['toggle-sidebar'])
const authStore = useAuthStore()
const router = useRouter()
const userMenu = ref()

const menuItems = ref([
  {
    label: 'الملف الشخصي',
    icon: 'pi pi-user',
    command: () => {}
  },
  {
    separator: true
  },
  {
    label: 'تسجيل الخروج',
    icon: 'pi pi-sign-out',
    command: async () => {
      await authStore.logout()
      router.push('/login')
    }
  }
])

function toggleMenu(event) {
  userMenu.value.toggle(event)
}
</script>

<template>
  <header class="app-bar">
    <div class="app-bar-right">
      <Button
        icon="pi pi-bars"
        text
        rounded
        class="menu-toggle"
        @click="emit('toggle-sidebar')"
      />
      <div class="app-bar-title">
        <span class="title-icon">📚</span>
        <span class="title-text">دليل معلمات اللغة العربية</span>
      </div>
    </div>
    <div class="app-bar-left">
      <div class="user-info" @click="toggleMenu">
        <Avatar
          :label="authStore.displayName?.charAt(0) || 'م'"
          shape="circle"
          class="user-avatar"
        />
        <span class="user-name">{{ authStore.displayName }}</span>
        <i class="pi pi-chevron-down" style="font-size: 0.7rem; color: var(--text-muted)"></i>
      </div>
      <Menu ref="userMenu" :model="menuItems" :popup="true" />
    </div>
  </header>
</template>

<style scoped>
.app-bar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  height: var(--appbar-height);
  background: white;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 900;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.app-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-bar-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 1.4rem;
}

.title-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.app-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 10px;
  transition: background 0.2s;
}

.user-info:hover {
  background: var(--bg-color);
}

.user-avatar {
  background: var(--primary-color) !important;
  color: white !important;
  font-weight: 600;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .title-text {
    font-size: 0.9rem;
  }
  .user-name {
    display: none;
  }
}
</style>
