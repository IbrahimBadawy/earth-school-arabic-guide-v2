<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
    return
  }
  loading.value = true
  error.value = ''
  const result = await authStore.login(email.value, password.value)
  if (result.success) {
    router.push('/')
  } else {
    error.value = 'بيانات الدخول غير صحيحة'
  }
  loading.value = false
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-circle circle-1"></div>
      <div class="bg-circle circle-2"></div>
      <div class="bg-circle circle-3"></div>
    </div>

    <div class="login-container animate__animated animate__fadeInUp">
      <div class="login-header">
        <img src="/LOGO.png" alt="مدرسة الأرض" class="login-logo-img" />
        <h1>مدرسة الأرض</h1>
        <p>دليل معلمات اللغة العربية</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <Message v-if="error" severity="error" :closable="false" class="login-error">
          {{ error }}
        </Message>

        <div class="form-field">
          <label for="email">البريد الإلكتروني</label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            placeholder="أدخل بريدك الإلكتروني"
            class="w-full"
            dir="ltr"
          />
        </div>

        <div class="form-field">
          <label for="password">كلمة المرور</label>
          <Password
            id="password"
            v-model="password"
            placeholder="أدخل كلمة المرور"
            :feedback="false"
            toggleMask
            class="w-full"
            inputClass="w-full"
            dir="ltr"
          />
        </div>

        <Button
          type="submit"
          label="تسجيل الدخول"
          icon="pi pi-sign-in"
          class="w-full login-btn"
          :loading="loading"
          size="large"
        />
      </form>

      <div class="login-footer">
        <p>حقيبة المعلمة الشاملة لفقرة اللغة العربية</p>
        <div class="level-dots">
          <span class="dot" style="background: var(--level1-color)"></span>
          <span class="dot" style="background: var(--level2-color)"></span>
          <span class="dot" style="background: var(--level3-color)"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E8F5F0 0%, #F0F4FF 50%, #FFF3E0 100%);
  position: relative;
  overflow: hidden;
  padding: 20px;
}

.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: var(--primary-color);
  top: -100px;
  right: -100px;
  animation: float 8s ease-in-out infinite;
}

.circle-2 {
  width: 300px;
  height: 300px;
  background: var(--secondary-color);
  bottom: -50px;
  left: -50px;
  animation: float 6s ease-in-out infinite reverse;
}

.circle-3 {
  width: 200px;
  height: 200px;
  background: var(--accent-color);
  top: 40%;
  left: 20%;
  animation: float 10s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}

.login-container {
  background: white;
  border-radius: 24px;
  padding: 48px 40px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-logo-img {
  width: 90px;
  height: 90px;
  border-radius: 20px;
  object-fit: cover;
  margin-bottom: 12px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.login-header h1 {
  font-size: 1.8rem;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.login-header p {
  color: var(--text-secondary);
  font-size: 1rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.login-btn {
  background: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
  border-radius: 12px !important;
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 8px;
}

.login-btn:hover {
  background: var(--primary-dark) !important;
  border-color: var(--primary-dark) !important;
}

.login-error {
  margin-bottom: 0;
}

.login-footer {
  text-align: center;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.login-footer p {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.level-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.w-full {
  width: 100%;
}

@media (max-width: 480px) {
  .login-container {
    padding: 32px 24px;
  }
}
</style>
