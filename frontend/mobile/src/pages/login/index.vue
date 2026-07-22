<template>
  <view class="page">
    <view class="card">
            <view class="lang-row">
        <text class="lang-label">{{ t('lang.label') }}：</text>
        <view
          v-for="l in availableLocales"
          :key="l.value"
          class="lang-item"
          :class="{ active: locale === l.value }"
          @click="setLocale(l.value)"
        >{{ l.label }}</view>
      </view>
      <text class="title">{{ mode === 'login' ? t('login') : t('register') }}</text>

      <view v-if="mode === 'login'">
        <view class="form-field">
          <text class="label">{{ t('login.email.or.phone') }}</text>
          <input class="input" v-model="loginUsername" :placeholder="t('login.email.or.phone')" />
        </view>
        <view class="form-field">
          <text class="label">{{ t('password') }}</text>
          <input class="input" v-model="loginPassword" password :placeholder="t('password')" />
        </view>
      </view>

      <view v-else>
        <view class="form-field">
          <text class="label">{{ t('email.required') }}</text>
          <input class="input" v-model="registerEmail" :placeholder="t('email')" />
        </view>
        <view class="form-field">
          <text class="label">{{ t('phone.required') }}</text>
          <input class="input" v-model="registerPhone" :placeholder="t('phone')" />
        </view>
        <view class="form-field">
          <text class="label">{{ t('password.required') }}</text>
          <input class="input" v-model="registerPassword" password :placeholder="t('password')" />
        </view>
        <view class="form-field">
          <text class="label">{{ t('confirm.password') }}</text>
          <input class="input" v-model="registerConfirm" password :placeholder="t('password')" />
        </view>
      </view>

      <view class="agree-row">
        <view class="checkbox" :class="{ checked: agreed }" @click="agreed = !agreed">
          <text v-if="agreed" class="checkbox-tick">✓</text>
        </view>
        <view class="agree-text">
          <text>{{ t('agree.prefix') }}</text>
          <text class="link" @click="openAgreement">{{ t('agreement.title') }}</text>
          <text>{{ t('agree.and') }}</text>
          <text class="link" @click="openPrivacy">{{ t('privacy.title') }}</text>
        </view>
      </view>
      <text v-if="error" class="error">{{ error }}</text>
      <button class="btn primary" :disabled="submitting" @click="handleSubmit">
        {{ submitting ? (mode === 'login' ? t('login.loading') : t('register.loading')) : (mode === 'login' ? t('login') : t('register')) }}
      </button>
      <view class="switch-row">
        <text class="switch-text">{{ mode === 'login' ? t('no.account') : t('have.account') }}</text>
        <text class="switch-link" @click="toggleMode">{{ mode === 'login' ? t('register') : t('login') }}</text>
      </view>
      <view class="wx-divider"><text class="wx-divider-text">或</text></view>
      <button class="btn wx-btn" :disabled="submitting" @click="handleWechatLogin">{{ t('wechat.login') }}</button>
    </view>

  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { login, register, wechatLogin } from '../../services/auth';
import { setRoleId } from '../../utils/auth';
import { fetchProfile } from '../../services/auth';
import { getToken } from '../../services/api';
import { isBeijingTimezone } from '../../utils/date';
import { t, locale, setLocale, initLocale, availableLocales } from '../../locale';

const mode = ref('login');
const loginUsername = ref('');
const loginPassword = ref('');
const registerEmail = ref('');
const registerPhone = ref('');
const registerPassword = ref('');
const registerConfirm = ref('');
const submitting = ref(false);
const error = ref('');
const agreed = ref(false);

const openAgreement = () => uni.navigateTo({ url: '/pages/agreement/index' });
const openPrivacy = () => uni.navigateTo({ url: '/pages/privacy/index' });

const afterLogin = async () => {
  setRoleId(null);
  uni.removeStorageSync('planner_role_prompted');
  if (!isBeijingTimezone()) {
    uni.showToast({ title: '当前系统时区非北京时间，已按北京时间展示', icon: 'none' });
  }
  uni.reLaunch({ url: '/pages/home/index' });
};

const handleLogin = async () => {
  if (!loginUsername.value || !loginPassword.value) {
    error.value = t('login.fail');
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    await login(loginUsername.value, loginPassword.value);
    await afterLogin();
  } catch {
    error.value = t('login.fail');
  } finally {
    submitting.value = false;
  }
};

const handleRegister = async () => {
  if (!registerEmail.value || !registerPhone.value || !registerPassword.value || !registerConfirm.value) {
    error.value = t('fill.email.phone.password');
    return;
  }
  if (registerPassword.value !== registerConfirm.value) {
    error.value = t('password.mismatch');
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
    error.value = t('register.fail');
  } finally {
    submitting.value = false;
  }
};

const handleSubmit = async () => {
  if (!agreed.value) {
    error.value = t('agree.required');
    return;
  }
  if (mode.value === 'login') {
    await handleLogin();
  } else {
    await handleRegister();
  }
};

const handleWechatLogin = async () => {
  if (!agreed.value) {
    error.value = '请先阅读并同意《用户服务协议》和《隐私政策》';
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject,
      });
    });
    const code = loginRes && loginRes.code;
    if (!code) {
      error.value = t('get.code.fail');
      return;
    }
    await wechatLogin(code);
    try {
      const profile = await fetchProfile();
      if (profile && (profile.email || '').endsWith('@wechat.local')) {
        submitting.value = false;
        uni.reLaunch({ url: '/pages/complete-profile/index' });
        return;
      }
    } catch (e) {}
    await afterLogin();
  } catch (err) {
    error.value = (err && err.msg) || t('wechat.login.fail');
  } finally {
    submitting.value = false;
  }
};

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  error.value = '';
};

onShow(() => {
  initLocale(); uni.setNavigationBarTitle({ title: t('nav.login') });
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
  color: #776b7f;
  margin-bottom: 6px;
  display: block;
}

.input {
  border: 1px solid rgba(110, 95, 116, 0.4);
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
  color: #776b7f;
}

.switch-link {
  color: #b76e8a;
}
.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0;
}
.checkbox {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(110, 95, 116, 0.6);
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
.checkbox.checked {
  background: #b76e8a;
  border-color: #b76e8a;
}
.checkbox-tick {
  color: #fff;
  font-size: 12px;
  line-height: 1;
}
.agree-text {
  font-size: 12px;
  color: #2b2430;
  line-height: 1.5;
  flex-wrap: wrap;
}
.link {
  color: #b76e8a;
}
.wx-divider {
  display: flex;
  align-items: center;
  margin: 12px 0 8px;
}
.wx-divider::before,
.wx-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(110, 95, 116, 0.3);
}
.wx-divider-text {
  padding: 0 8px;
  font-size: 12px;
  color: #776b7f;
}
.wx-btn {
  background: #07c160;
  border-color: #07c160;
  color: #fff;
}
.lang-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.lang-label { font-size: 12px; color: #776b7f; }
.lang-item { font-size: 12px; padding: 4px 10px; border: 1px solid rgba(110,95,116,0.4); border-radius: 12px; color: #2b2430; }
.lang-item.active { background: #b76e8a; border-color: #b76e8a; color: #fff; }
</style>
