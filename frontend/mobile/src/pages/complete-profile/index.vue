<template>
  <view class="page">
    <view class="card">
      <text class="title">完善资料</text>

      <view class="wxid-row">
        <text class="label">微信用户唯一标识 OpenID</text>
        <text class="wxid-value" selectable="{{ true }}" user-select>{{ wechatId || '未绑定微信' }}</text>
      </view>

      <view class="form-field">
        <text class="label">邮箱 *</text>
        <input class="input" v-model="email" placeholder="请输入邮箱" />
      </view>
      <view class="form-field">
        <text class="label">手机号（选填）</text>
        <input class="input" v-model="phone" placeholder="可选" />
      </view>
      <view class="form-field">
        <text class="label">登录密码（选填，至少 6 位）</text>
        <input class="input" v-model="password" password placeholder="设置后可用邮箱+密码登录" />
      </view>

      <text v-if="error" class="error">{{ error }}</text>
      <button class="btn primary" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中...' : '保存' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { fetchProfile, updateProfile } from '../../services/auth';

const email = ref('');
const phone = ref('');
const password = ref('');
const wechatId = ref('');
const submitting = ref(false);
const error = ref('');

const submit = async () => {
  const em = email.value.trim();
  if (!em) {
    error.value = '请填写邮箱';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    error.value = '邮箱格式不正确';
    return;
  }
  if (password.value && password.value.length < 6) {
    error.value = '密码至少 6 位';
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    const payload = { email: em };
    if (phone.value.trim()) payload.phone_number = phone.value.trim();
    if (password.value) payload.new_password = password.value;
    await updateProfile(payload);
    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/home/index' }) }), 600);
  } catch (err) {
    const detail = err && (err.detail || err.errMsg || err.message);
    error.value = detail || '保存失败，请重试';
  } finally {
    submitting.value = false;
  }
};

onShow(async () => {
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
</style>
