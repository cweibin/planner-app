<template>
  <view class="fab" :class="{ hidden: isHidden }" @tap="openAdd">
    <text class="fab-icon">+</text>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { t } from '../locale';
const props = defineProps({
  disable: { type: Boolean, default: false },
});

const getCurrentRoute = () => {
  const pages = getCurrentPages();
  return pages[pages.length - 1]?.route || '';
};

const isHidden = computed(() => props.disable || getCurrentRoute() === 'pages/stats/index');

const openAdd = () => {
  if (isHidden.value) return;
  const current = getCurrentRoute();
  if (current === 'pages/habits/index') {
    uni.navigateTo({ url: '/pages/habit-create/index' });
    return;
  }
  uni.showActionSheet({
    itemList: [t('add.direct'), t('add.voice')],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: '/pages/task-create/index' });
        return;
      }
      if (res.tapIndex === 1) {
        uni.navigateTo({ url: '/pages/voice-create/index' });
      }
    },
  });
};
</script>

<style scoped>
.fab {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(env(safe-area-inset-bottom) + 6px);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #c97b95;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 1002;
  box-shadow:
    0 10px 22px rgba(201, 123, 149, 0.28),
    0 2px 8px rgba(201, 123, 149, 0.18);
  border: 3px solid #fffdfd;
}

.fab-icon {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  transform: translateY(-1px);
}

.fab.hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
