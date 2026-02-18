<template>
  <view class="page">
    <view class="card">
      <text class="title">{{ mode === 'login' ? '登录' : '注册' }}</text>

      <view v-if="mode === 'login'">
        <view class="form-field">
          <text class="label">邮箱或手机号</text>
          <input class="input" v-model="loginUsername" placeholder="输入邮箱或手机号" />
        </view>
        <view class="form-field">
          <text class="label">密码</text>
          <input class="input" v-model="loginPassword" password placeholder="输入密码" />
        </view>
      </view>

      <view v-else>
        <view class="form-field">
          <text class="label">邮箱 *</text>
          <input class="input" v-model="registerEmail" placeholder="输入邮箱" />
        </view>
        <view class="form-field">
          <text class="label">手机号</text>
          <input class="input" v-model="registerPhone" placeholder="可选" />
        </view>
        <view class="form-field">
          <text class="label">密码 *</text>
          <input class="input" v-model="registerPassword" password placeholder="输入密码" />
        </view>
        <view class="form-field">
          <text class="label">确认密码 *</text>
          <input class="input" v-model="registerConfirm" password placeholder="再次输入密码" />
        </view>
      </view>

      <text v-if="error" class="error">{{ error }}</text>
      <button class="btn primary" :disabled="submitting" @click="handleSubmit">
        {{ submitting ? (mode === 'login' ? '登录中...' : '注册中...') : (mode === 'login' ? '登录' : '注册') }}
      </button>
      <view class="switch-row">
        <text class="switch-text">{{ mode === 'login' ? '没有账号？' : '已有账号？' }}</text>
        <text class="switch-link" @click="toggleMode">{{ mode === 'login' ? '注册' : '登录' }}</text>
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { login, register } from '../../services/auth';
import { setRoleId } from '../../utils/auth';
import { getToken } from '../../services/api';

const mode = ref('login');
const loginUsername = ref('');
const loginPassword = ref('');
const registerEmail = ref('');
const registerPhone = ref('');
const registerPassword = ref('');
const registerConfirm = ref('');
const submitting = ref(false);
const error = ref('');

const afterLogin = async () => {
  setRoleId(null);
  uni.removeStorageSync('planner_role_prompted');
  uni.reLaunch({ url: '/pages/home/index' });
};

const handleLogin = async () => {
  if (!loginUsername.value || !loginPassword.value) {
    error.value = '请输入账号和密码';
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    await login(loginUsername.value, loginPassword.value);
    await afterLogin();
  } catch {
    error.value = '登录失败，请检查账号或密码';
  } finally {
    submitting.value = false;
  }
};

const handleRegister = async () => {
  if (!registerEmail.value || !registerPassword.value || !registerConfirm.value) {
    error.value = '请输入邮箱和密码';
    return;
  }
  if (registerPassword.value !== registerConfirm.value) {
    error.value = '两次密码不一致';
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    const payload = {
      email: registerEmail.value,
      password: registerPassword.value,
    };
    if (registerPhone.value) {
      payload.phone_number = registerPhone.value;
    }
    await register(payload);
    await login(registerEmail.value, registerPassword.value);
    await afterLogin();
  } catch (err) {
    error.value = '注册失败，请检查信息是否正确';
  } finally {
    submitting.value = false;
  }
};

const handleSubmit = async () => {
  if (mode.value === 'login') {
    await handleLogin();
  } else {
    await handleRegister();
  }
};

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  error.value = '';
};

onShow(() => {
  if (getToken()) {
    uni.reLaunch({ url: '/pages/home/index' });
  }
});
</script>

<style scoped>
.page {
  padding: 24px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
}

.form-field {
  margin-bottom: 12px;
}

.label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
  display: block;
}

.input {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
  background: #fff;
}

.error {
  color: #d32f2f;
  font-size: 12px;
  margin-bottom: 8px;
  display: block;
}

.switch-row {
  margin-top: 10px;
  display: flex;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
}

.switch-link {
  color: var(--accent);
}
</style>
