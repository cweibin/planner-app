<template>
  <view v-if="visible" class="prompt-mask" @click="handleCancel">
    <view class="prompt-card" @click.stop>
      <text class="prompt-title">{{ title }}</text>
      <input
        class="prompt-input"
        :placeholder="placeholder"
        :value="inputValue"
        :focus="visible"
        @input="onInput"
      />
      <view class="prompt-actions">
        <button class="btn" size="mini" @click="handleCancel">{{ cancelText }}</button>
        <button class="btn primary" size="mini" @click="handleConfirm">{{ confirmText }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  value: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
});

const emit = defineEmits(['update:visible', 'confirm', 'cancel']);
const inputValue = ref(props.value || '');

watch(
  () => props.visible,
  (next) => {
    if (next) {
      inputValue.value = props.value || '';
    }
  },
);

const onInput = (event) => {
  inputValue.value = event.detail.value;
};

const handleCancel = () => {
  emit('update:visible', false);
  emit('cancel');
};

const handleConfirm = () => {
  emit('confirm', inputValue.value);
  emit('update:visible', false);
};
</script>

<style scoped>
.prompt-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1003;
}

.prompt-card {
  width: 80%;
  max-width: 320px;
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  border: 1px solid var(--line);
}

.prompt-title {
  font-size: 12px;
  font-weight: 700;
}

.prompt-input {
  margin-top: 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  background: #fff;
}

.prompt-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
