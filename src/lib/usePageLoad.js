import { onMounted } from 'vue'

/**
 * Simple wrapper - runs callback on component mount.
 * Works because App.vue uses :key="route.fullPath" on router-view
 * which forces component remount on every navigation.
 */
export function usePageLoad(callback) {
  onMounted(() => {
    callback()
  })
}
