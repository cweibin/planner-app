<template>
  <view v-if="visible" class="sheet-mask" @click="close">
    <view class="sheet-card" @click.stop>
      <view class="sheet-item" @click="goTaskCreate">新增任务</view>
      <view class="sheet-item" @click="goHabitCreate">新增习惯</view>
      <view class="sheet-cancel" @click="close">取消</view>
    </view>
  </view>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const visible = ref(false);

const open = () => {
  visible.value = true;
};

const close = () => {
  visible.value = false;
};

const goTaskCreate = () => {
  visible.value = false;
  uni.navigateTo({ url: '/pages/task-create/index' });
};

const goHabitCreate = () => {
  visible.value = false;
  uni.navigateTo({ url: '/pages/habit-create/index' });
};

onMounted(() => {
  uni.$on('open-add-sheet', open);
});

onUnmounted(() => {
  uni.$off('open-add-sheet', open);
});
</script>

<style scoped>
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1004;
}

.sheet-card {
  width: 92%;
  margin-bottom: calc(14px + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--line);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.sheet-item {
  padding: 14px 16px;
  text-align: center;
  font-size: 14px;
  color: var(--text);
  border-bottom: 1px solid var(--line);
}

.sheet-cancel {
  padding: 14px 16px;
  text-align: center;
  font-size: 14px;
  color: var(--muted);
}
</style>
