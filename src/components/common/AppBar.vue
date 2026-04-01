<script setup>
import { useAuthStore } from '@/stores/auth'
import { useContentStore } from '@/stores/content'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import { ref, onMounted } from 'vue'

const props = defineProps({ sidebarVisible: { type: Boolean, default: true } })
const emit = defineEmits(['toggle-sidebar'])
const authStore = useAuthStore()
const contentStore = useContentStore()
const router = useRouter()
const userMenu = ref()

onMounted(() => { contentStore.fetchUnits() })

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
    command: () => {
      authStore.logout()
    }
  }
])

function toggleMenu(event) {
  userMenu.value.toggle(event)
}
</script>

<template>
  <header class="app-bar" :class="{ 'sidebar-hidden': !sidebarVisible }">
    <div class="app-bar-right">
      <Button
        icon="pi pi-bars"
        text
        rounded
        class="menu-toggle"
        @click="emit('toggle-sidebar')"
      />
      <div class="app-bar-title">
        <img src="/LOGO.png" alt="مدرسة الأرض" class="app-logo" />
        <span class="title-text">دليل المعلمات</span>
        <span v-if="contentStore.activeUnit" class="active-unit-badge">
          <i class="pi pi-folder"></i>
          {{ contentStore.activeUnit.name }}
        </span>
        <span v-if="contentStore.activeSubject" class="active-subject-badge" :style="{ background: contentStore.activeSubject.color + '20', color: contentStore.activeSubject.color }">
          <i :class="contentStore.activeSubject.icon"></i>
          {{ contentStore.activeSubject.name }}
        </span>
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
  right: var(--sidebar-width);
  left: 0;
  height: var(--appbar-height);
  background: white;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 900;
  transition: right 0.3s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.app-bar.sidebar-hidden {
  right: 0;
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

.app-logo {
  height: 36px;
  width: auto;
  border-radius: 8px;
}

.title-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.active-unit-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: var(--primary-light);
  color: var(--primary-dark);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  margin-right: 8px;
}

.active-unit-badge i {
  font-size: 0.75rem;
}

.active-subject-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  margin-right: 4px;
}

.active-subject-badge i {
  font-size: 0.75rem;
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
  .app-bar {
    right: 0;
  }
  .title-text {
    font-size: 0.9rem;
  }
  .user-name {
    display: none;
  }
}
</style>
