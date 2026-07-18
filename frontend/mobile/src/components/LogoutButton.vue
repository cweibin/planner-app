<template>
  <view class="logout-btn" @click="handleLogout">
    <text class="logout-icon">⎋</text>
  </view>
</template>

<script setup>
import { setToken } from '../services/api';

const handleLogout = () => {
  setToken('');
  uni.removeStorageSync('planner_role_id');
  uni.removeStorageSync('planner_role_prompted');
  uni.reLaunch({ url: '/pages/login/index' });
};
</script>

<style scoped>
.logout-btn {
  position: fixed;
  right: 12px;
  top: calc(env(safe-area-inset-top) + 6px);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid rgba(110, 95, 116, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  box-shadow: 0 10px 22px rgba(70, 48, 78, 0.12);
}

.logout-icon {
  font-size: 14px;
  font-weight: 700;
  color: #2b2430;
  line-height: 1;
}
</style>
