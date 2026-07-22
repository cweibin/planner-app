<template>
  <view class="page">
    <view class="card">
            <view class="lang-row">
        <text class="lang-label">{{ t('lang.label') }}：</text>
        <view v-for="l in availableLocales" :key="l.value" class="lang-item" :class="{ active: locale === l.value }" @click="setLocale(l.value)">{{ l.label }}</view>
      </view>
      <text class="title">{{ t('complete.title') }}</text>

      <view class="wxid-row">
        <text class="label">{{ t('wechat.openid') }}</text>
        <text class="wxid-value" selectable="{{ true }}" user-select>{{ wechatId || t('no.wechat') }}</text>
      </view>

      <view class="form-field">
        <text class="label">{{ t('email.required') }}</text>
        <input class="input" v-model="email" :placeholder="t('email')" />
      </view>
      <view class="form-field">
        <text class="label">{{ t('phone.optional') }}</text>
        <input class="input" v-model="phone" :placeholder="t('voice.note.ph')" />
      </view>
      <view class="form-field">
        <text class="label">{{ t('login.password.optional') }}</text>
        <input class="input" v-model="password" password :placeholder="t('login.password.hint')" />
      </view>

      <text v-if="error" class="error">{{ error }}</text>
      <button class="btn primary" :disabled="submitting" @click="submit">
        {{ submitting ? t('saving') : t('save') }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { fetchProfile, updateProfile } from '../../services/auth';
import { t, locale, setLocale, initLocale, availableLocales } from '../../locale';

const email = ref('');
const phone = ref('');
const password = ref('');
const wechatId = ref('');
const submitting = ref(false);
const error = ref('');

const submit = async () => {
  const em = email.value.trim();
  if (!em) {
    error.value = t('fill.email');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    error.value = t('email.invalid');
    return;
  }
  if (password.value && password.value.length < 6) {
    error.value = t('password.min');
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    const payload = { email: em };
    if (phone.value.trim()) payload.phone_number = phone.value.trim();
    if (password.value) payload.new_password = password.value;
    await updateProfile(payload);
    uni.showToast({ title: t('saved'), icon: 'success' });
    setTimeout(() => uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/home/index' }) }), 600);
  } catch (err) {
    const detail = err && (err.detail || err.errMsg || err.message);
    error.value = detail || t('save.fail');
  } finally {
    submitting.value = false;
  }
};

onShow(async () => {
  initLocale(); uni.setNavigationBarTitle({ title: t('nav.complete.profile') });
  try {
    const profile = await fetchProfile();
    const em = (profile && profile.email) || '';
    email.value = em.endsWith('@wechat.local') ? '' : em;
    phone.value = (profile && profile.phone_number) || '';
    wechatId.value = (profile && profile.wechat_openid) || '';
  } catch (e) {}
});
</script>

<style scoped>
.page { padding: 16px; }
.card { border: 1px solid rgba(110, 95, 116, 0.4); border-radius: 18px; padding: 16px; background: #fff; box-shadow: 0 10px 22px rgba(70, 48, 78, 0.12); display: flex; flex-direction: column; gap: 10px; }
.title { font-size: 18px; font-weight: 700; color: #2b2430; }
.wxid-row { display: flex; gap: 8px; align-items: center; padding: 8px 10px; background: #f7f1f5; border-radius: 8px; }
.wxid-row .label { font-size: 12px; color: #776b7f; }
.wxid-value { font-size: 12px; color: #2b2430; word-break: break-all; }
.form-field { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.label { font-size: 12px; color: #776b7f; }
.input { border: 1px solid rgba(110, 95, 116, 0.4); border-radius: 10px; padding: 8px 10px; font-size: 14px; }
.error { color: #d32f2f; font-size: 12px; }
.btn { margin-top: 8px; }
.lang-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.lang-label { font-size: 12px; color: #776b7f; }
.lang-item { font-size: 12px; padding: 4px 10px; border: 1px solid rgba(110,95,116,0.4); border-radius: 12px; color: #2b2430; }
.lang-item.active { background: #b76e8a; border-color: #b76e8a; color: #fff; }
</style>
