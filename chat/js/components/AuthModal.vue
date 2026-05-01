<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import BaseModal from './BaseModal.vue';
import { useAuth } from '../composables/useAuth.js';
import { CN_PHONE_RE, sendCode as apiSendCode } from '../api/auth.js';

/* 登录 / 注册 弹窗
 * - 两个 tab：登录页 / 注册页，默认登录页
 * - 注册页验证码按钮：手机号合法时可点；点一次后进入 20s 倒计时灰态
 * - 登录 / 注册成功后关闭 modal
 */

const props = defineProps({
  open: { type: Boolean, default: false }
});
const emit = defineEmits(['update:open']);

const { loginAction, registerAction } = useAuth();

const tab = ref('login');

const loginForm = reactive({
  phone: '',
  password: ''
});
const registerForm = reactive({
  phone: '',
  code: '',
  username: '',
  password: ''
});

const submitting = ref(false);
const errorMsg   = ref('');
const okMsg      = ref('');

/* 验证码发送倒计时 */
const COOLDOWN_SEC = 20;
const cooldown = ref(0);
let cooldownTimer = null;

function startCooldown() {
  cooldown.value = COOLDOWN_SEC;
  clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      cooldown.value = 0;
    }
  }, 1000);
}
onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

const canSendCode = computed(() =>
  cooldown.value === 0 && CN_PHONE_RE.test(registerForm.phone)
);
const codeBtnLabel = computed(() =>
  cooldown.value > 0 ? `${cooldown.value}s 后重发` : '发送验证码'
);

async function onSendCode() {
  if (!canSendCode.value || submitting.value) return;
  errorMsg.value = '';
  okMsg.value = '';
  startCooldown();
  try {
    const res = await apiSendCode({ phone: registerForm.phone });
    if (res && res.ok) {
      okMsg.value = res.message || '验证码已发送';
    } else {
      errorMsg.value = (res && res.message) || '验证码发送失败';
      cooldown.value = 0;
      if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
    }
  } catch (e) {
    errorMsg.value = '网络异常，请稍后重试';
    cooldown.value = 0;
    if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
  }
}

function close() {
  emit('update:open', false);
}

/* 关闭时重置错误提示，但保留输入；切换 tab 时也清掉错误提示 */
watch(() => props.open, (val) => {
  if (val) {
    errorMsg.value = '';
    okMsg.value = '';
  }
});
function switchTab(name) {
  if (tab.value === name) return;
  tab.value = name;
  errorMsg.value = '';
  okMsg.value = '';
}

async function onLogin() {
  if (submitting.value) return;
  errorMsg.value = '';
  if (!CN_PHONE_RE.test(loginForm.phone)) {
    errorMsg.value = '请输入正确的手机号';
    return;
  }
  if (!loginForm.password) {
    errorMsg.value = '请输入密码';
    return;
  }
  submitting.value = true;
  try {
    const res = await loginAction({
      phone: loginForm.phone,
      password: loginForm.password
    });
    if (res.ok) {
      okMsg.value = '登录成功';
      setTimeout(() => close(), 200);
    } else {
      errorMsg.value = res.message;
    }
  } finally {
    submitting.value = false;
  }
}

async function onRegister() {
  if (submitting.value) return;
  errorMsg.value = '';
  if (!CN_PHONE_RE.test(registerForm.phone)) {
    errorMsg.value = '请输入正确的手机号';
    return;
  }
  if (!registerForm.code || registerForm.code.length < 4) {
    errorMsg.value = '请输入 4-6 位验证码';
    return;
  }
  if (!registerForm.username) {
    errorMsg.value = '请输入用户名';
    return;
  }
  if (!registerForm.password || registerForm.password.length < 6) {
    errorMsg.value = '密码至少 6 位';
    return;
  }
  submitting.value = true;
  try {
    const res = await registerAction({
      phone: registerForm.phone,
      code:  registerForm.code,
      username: registerForm.username,
      password: registerForm.password
    });
    if (res.ok) {
      okMsg.value = '注册成功';
      setTimeout(() => close(), 200);
    } else {
      errorMsg.value = res.message;
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal name="auth" :open="open"
             @update:open="$emit('update:open', $event)"
             labelledby="authModalTitle">
    <button type="button" class="auth-modal-close" aria-label="关闭" @click="close">
      <i class="fa fa-times" aria-hidden="true"></i>
    </button>

    <div class="auth-modal-head">
      <div class="auth-modal-icon" aria-hidden="true">
        <i class="fa fa-user"></i>
      </div>
      <h3 id="authModalTitle" class="auth-modal-title">
        {{ tab === 'login' ? '欢迎回来' : '创建账号' }}
      </h3>
      <p class="auth-modal-sub">
        {{ tab === 'login' ? '登录后享受完整 AI 助手能力' : '注册凌云 AI 账号，开启智能办公之旅' }}
      </p>
    </div>

    <div class="auth-tabs" role="tablist">
      <button type="button"
              class="auth-tab"
              role="tab"
              :class="{ 'is-active': tab === 'login' }"
              :aria-selected="tab === 'login'"
              @click="switchTab('login')">登录</button>
      <button type="button"
              class="auth-tab"
              role="tab"
              :class="{ 'is-active': tab === 'register' }"
              :aria-selected="tab === 'register'"
              @click="switchTab('register')">注册</button>
      <span class="auth-tab-indicator" :class="{ 'is-right': tab === 'register' }"></span>
    </div>

    <!-- 登录表单 -->
    <form v-if="tab === 'login'" class="auth-form" @submit.prevent="onLogin">
      <label class="auth-field">
        <span class="auth-field-label">手机号</span>
        <input v-model="loginForm.phone"
               class="auth-input"
               type="tel"
               inputmode="numeric"
               maxlength="11"
               placeholder="请输入手机号"
               autocomplete="username" />
      </label>

      <label class="auth-field">
        <span class="auth-field-label">密码</span>
        <input v-model="loginForm.password"
               class="auth-input"
               type="password"
               placeholder="请输入密码"
               autocomplete="current-password" />
      </label>

      <p v-if="errorMsg" class="auth-msg auth-msg-err">{{ errorMsg }}</p>
      <p v-else-if="okMsg" class="auth-msg auth-msg-ok">{{ okMsg }}</p>

      <button type="submit" class="auth-submit" :disabled="submitting">
        {{ submitting ? '登录中…' : '登 录' }}
      </button>

      <p class="auth-foot">
        还没有账号？
        <a href="#" @click.prevent="switchTab('register')">立即注册</a>
      </p>
    </form>

    <!-- 注册表单 -->
    <form v-else class="auth-form" @submit.prevent="onRegister">
      <label class="auth-field">
        <span class="auth-field-label">手机号</span>
        <input v-model="registerForm.phone"
               class="auth-input"
               type="tel"
               inputmode="numeric"
               maxlength="11"
               placeholder="请输入手机号"
               autocomplete="username" />
      </label>

      <label class="auth-field">
        <span class="auth-field-label">验证码</span>
        <div class="auth-input-with-action">
          <input v-model="registerForm.code"
                 class="auth-input"
                 type="text"
                 inputmode="numeric"
                 maxlength="6"
                 placeholder="请输入验证码"
                 autocomplete="one-time-code" />
          <button type="button"
                  class="auth-code-btn"
                  :class="{ 'is-disabled': !canSendCode }"
                  :disabled="!canSendCode"
                  @click="onSendCode">{{ codeBtnLabel }}</button>
        </div>
      </label>

      <label class="auth-field">
        <span class="auth-field-label">用户名</span>
        <input v-model="registerForm.username"
               class="auth-input"
               type="text"
               maxlength="20"
               placeholder="请输入用户名"
               autocomplete="nickname" />
      </label>

      <label class="auth-field">
        <span class="auth-field-label">密码</span>
        <input v-model="registerForm.password"
               class="auth-input"
               type="password"
               placeholder="至少 6 位"
               autocomplete="new-password" />
      </label>

      <p v-if="errorMsg" class="auth-msg auth-msg-err">{{ errorMsg }}</p>
      <p v-else-if="okMsg" class="auth-msg auth-msg-ok">{{ okMsg }}</p>

      <button type="submit" class="auth-submit" :disabled="submitting">
        {{ submitting ? '注册中…' : '注 册' }}
      </button>

      <p class="auth-foot">
        已经有账号了？
        <a href="#" @click.prevent="switchTab('login')">直接登录</a>
      </p>
    </form>
  </BaseModal>
</template>

<!-- 见 BaseModal.vue 顶部说明：modal 节点由 BaseModal 动态拼 class 渲染，scoped 命中不到。 -->
<style>
.auth-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.auth-modal.is-open {
  display: flex;
  animation: cmFadeIn 0.2s ease both;
}
.auth-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 22, 50, 0.50);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
}
.auth-modal-dialog {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 28px 70px rgba(15, 22, 50, 0.40),
              0 6px 18px rgba(15, 22, 50, 0.22);
  padding: 30px 28px 24px;
  animation: cmPopIn 0.28s cubic-bezier(0.2, 0.8, 0.25, 1) both;
  overflow: hidden;
}
.auth-modal-dialog::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 5px;
  background: linear-gradient(90deg, #1a2a66 0%, #4338ca 50%, #7c3aed 100%);
}

.auth-modal-close {
  position: absolute;
  top: 14px; right: 14px;
  width: 32px; height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(26, 42, 102, 0.06);
  color: #4338ca;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;
}
.auth-modal-close:hover {
  background: rgba(124, 58, 237, 0.14);
  color: #7c3aed;
  transform: rotate(90deg);
}

.auth-modal-head { text-align: center; margin: 4px 0 18px; }
.auth-modal-icon {
  width: 54px; height: 54px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1a2a66 0%, #4338ca 55%, #7c3aed 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 10px 24px rgba(67, 56, 202, 0.32);
  margin: 4px auto 12px;
}
.auth-modal-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #1a2a66;
  letter-spacing: 0.4px;
}
.auth-modal-sub {
  margin: 0;
  font-size: 12.5px;
  color: #6b7090;
  line-height: 1.6;
}

/* tab 切换 */
.auth-tabs {
  position: relative;
  display: flex;
  background: #f3f4fb;
  border-radius: 12px;
  padding: 4px;
  margin: 0 0 20px;
}
.auth-tab {
  flex: 1;
  position: relative;
  z-index: 1;
  padding: 9px 0;
  font-size: 14px;
  font-weight: 600;
  color: #6b7090;
  background: transparent;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  transition: color 0.22s ease;
}
.auth-tab.is-active { color: #1a2a66; }
.auth-tab-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: #ffffff;
  border-radius: 9px;
  box-shadow: 0 2px 8px rgba(67, 56, 202, 0.14);
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.25, 1);
}
.auth-tab-indicator.is-right { transform: translateX(100%); }

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.auth-field-label {
  font-size: 12px;
  color: #6b7090;
  letter-spacing: 0.3px;
  font-weight: 500;
}
.auth-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  font-size: 14px;
  color: #1a2a66;
  background: #f7f8fc;
  border: 1px solid rgba(26, 42, 102, 0.10);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  font-family: inherit;
}
.auth-input::placeholder { color: #aab0c4; }
.auth-input:hover { background: #ffffff; }
.auth-input:focus {
  background: #ffffff;
  border-color: rgba(67, 56, 202, 0.55);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.14);
}

.auth-input-with-action {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.auth-input-with-action .auth-input { flex: 1; }
.auth-code-btn {
  flex-shrink: 0;
  min-width: 116px;
  height: 42px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #4338ca 0%, #7c3aed 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: filter 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  box-shadow: 0 6px 14px rgba(67, 56, 202, 0.22);
}
.auth-code-btn:hover:not(.is-disabled) {
  filter: brightness(1.06);
  box-shadow: 0 8px 18px rgba(124, 58, 237, 0.32);
}
.auth-code-btn:active:not(.is-disabled) { transform: translateY(1px); }
.auth-code-btn.is-disabled,
.auth-code-btn:disabled {
  background: #e5e7ef;
  color: #9aa0b4;
  cursor: not-allowed;
  box-shadow: none;
}

.auth-msg {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  padding: 6px 10px;
  border-radius: 8px;
}
.auth-msg-err {
  color: #c53030;
  background: rgba(229, 62, 62, 0.08);
  border: 1px solid rgba(229, 62, 62, 0.20);
}
.auth-msg-ok {
  color: #22a06b;
  background: rgba(34, 160, 107, 0.08);
  border: 1px solid rgba(34, 160, 107, 0.22);
}

.auth-submit {
  margin-top: 4px;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #4338ca 0%, #7c3aed 100%);
  border: none;
  border-radius: 11px;
  cursor: pointer;
  letter-spacing: 4px;
  box-shadow: 0 10px 22px rgba(67, 56, 202, 0.28);
  transition: filter 0.18s ease, box-shadow 0.18s ease, transform 0.1s ease;
}
.auth-submit:hover:not(:disabled) {
  filter: brightness(1.06);
  box-shadow: 0 14px 28px rgba(124, 58, 237, 0.35);
}
.auth-submit:active:not(:disabled) { transform: translateY(1px); }
.auth-submit:disabled { opacity: 0.7; cursor: not-allowed; }

.auth-foot {
  margin: 8px 0 0;
  text-align: center;
  font-size: 12.5px;
  color: #6b7090;
}
.auth-foot a {
  color: #4338ca;
  font-weight: 600;
}
.auth-foot a:hover { color: #7c3aed; text-decoration: underline; }

@media (max-width: 480px) {
  .auth-modal-dialog { padding: 26px 20px 18px; border-radius: 14px; }
  .auth-modal-title { font-size: 18px; }
  .auth-code-btn { min-width: 102px; }
}
</style>
