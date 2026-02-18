<template>
  <view class="page">
    <LogoutButton />
    <view class="card">
      <text class="section-title">{{ isEditing ? '编辑习惯' : '新增习惯' }}</text>
      <view class="form-field">
        <text class="label">习惯名称 *</text>
        <textarea
          class="textarea name-textarea"
          :value="name"
          :focus="nameFocus"
          auto-height
          @tap.stop="focusName"
          @focus="onFocusName"
          @blur="onBlurName"
          @input="onNameInput"
          placeholder="例如：晨跑 / 阅读"
        />
      </view>
      <view class="form-field">
        <text class="label">描述</text>
        <textarea
          class="textarea"
          :value="description"
          :focus="descFocus"
          @tap.stop="focusDesc"
          @focus="onFocusDesc"
          @blur="onBlurDesc"
          @input="onDescriptionInput"
          placeholder="补充说明（可选）"
        />
      </view>
      <view class="form-field">
        <text class="label">目标类型</text>
        <picker :range="targetTypeOptions" range-key="label" :value="targetTypeIndex" @change="onTargetTypeChange">
          <view class="picker-input">{{ targetTypeLabel }}</view>
        </picker>
      </view>
      <view class="form-field">
        <text class="label">目标次数</text>
        <picker :range="targetCountOptions" :value="targetCountIndex" @change="onTargetCountChange">
          <view class="picker-input">{{ targetCountOptions[targetCountIndex] || 1 }}</view>
        </picker>
      </view>
      <view class="form-field">
        <text class="label">计划日期</text>
        <view class="picker-row">
          <picker mode="date" :value="planStart" @change="onPlanStartChange">
            <view class="picker-input">{{ planStart || '开始日期' }}</view>
          </picker>
          <picker mode="date" :value="planEnd" @change="onPlanEndChange">
            <view class="picker-input">{{ planEnd || '结束日期(可选)' }}</view>
          </picker>
        </view>
      </view>
      <view class="action-row">
        <button class="btn" size="mini" @click="cancel">取消</button>
        <button class="btn primary" size="mini" :disabled="submitting" @click="submit">
          {{ submitting ? '保存中...' : '保存' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { ensureAuth } from '../../utils/auth';
import { createHabit, fetchHabit, updateHabit } from '../../services/habits';
import { formatDate } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';

const name = ref('');
const description = ref('');
const targetTypeOptions = [
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
];
const targetTypeIndex = ref(0);
const targetCountOptions = Array.from({ length: 20 }, (_, idx) => idx + 1);
const targetCountIndex = ref(0);
const planStart = ref('');
const planEnd = ref('');
const submitting = ref(false);
const nameFocus = ref(false);
const descFocus = ref(false);
const habitId = ref(null);
const isEditing = ref(false);

const targetTypeLabel = computed(() => targetTypeOptions[targetTypeIndex.value]?.label ?? '每天');

const onTargetTypeChange = (event) => {
  targetTypeIndex.value = Number(event.detail.value);
};

const onNameInput = (event) => {
  name.value = event.detail.value;
};

const onDescriptionInput = (event) => {
  description.value = event.detail.value;
};

const focusName = () => {
  nameFocus.value = true;
};

const focusDesc = () => {
  descFocus.value = true;
};

const onFocusName = () => {
  nameFocus.value = true;
};

const onBlurName = () => {
  nameFocus.value = false;
};

const onFocusDesc = () => {
  descFocus.value = true;
};

const onBlurDesc = () => {
  descFocus.value = false;
};

const onTargetCountChange = (event) => {
  targetCountIndex.value = Number(event.detail.value);
};

const onPlanStartChange = (event) => {
  planStart.value = event.detail.value;
};

const onPlanEndChange = (event) => {
  planEnd.value = event.detail.value;
};

const cancel = () => {
  uni.navigateBack();
};

const submit = async () => {
  const trimmed = name.value.trim();
  if (!trimmed) {
    uni.showToast({ title: '请输入习惯名称', icon: 'none' });
    return;
  }
  const count = Number(targetCountOptions[targetCountIndex.value] || 1);
  if (!Number.isFinite(count) || count <= 0) {
    uni.showToast({ title: '目标次数需大于 0', icon: 'none' });
    return;
  }
  if (planStart.value && planEnd.value && planEnd.value < planStart.value) {
    uni.showToast({ title: '结束日期不能早于开始日期', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      name: trimmed,
      description: description.value.trim() || null,
      target_type: targetTypeOptions[targetTypeIndex.value]?.value || 'daily',
      target_count: Math.floor(count),
    };
    if (planStart.value) payload.plan_start_date = planStart.value;
    if (planEnd.value) payload.plan_end_date = planEnd.value;
    if (isEditing.value && habitId.value) {
      await updateHabit(habitId.value, payload);
      uni.showToast({ title: '已更新', icon: 'success' });
    } else {
      await createHabit(payload);
      uni.showToast({ title: '已创建', icon: 'success' });
    }
    setTimeout(() => {
      uni.switchTab({ url: '/pages/habits/index' });
    }, 300);
  } catch {
    uni.showToast({ title: isEditing.value ? '更新失败' : '创建失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
};

const loadHabit = async () => {
  if (!habitId.value) return;
  try {
    const habit = await fetchHabit(habitId.value);
    name.value = habit?.name || '';
    description.value = habit?.description || '';
    const typeIdx = targetTypeOptions.findIndex((item) => item.value === habit?.target_type);
    targetTypeIndex.value = typeIdx >= 0 ? typeIdx : 0;
    const count = Number(habit?.target_value ?? habit?.target_count ?? 1);
    const countIdx = targetCountOptions.findIndex((v) => v === count);
    targetCountIndex.value = countIdx >= 0 ? countIdx : 0;
    planStart.value = habit?.plan_start_date || '';
    planEnd.value = habit?.plan_end_date || '';
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

onLoad((query) => {
  const id = Number(query.id);
  habitId.value = Number.isNaN(id) ? null : id;
  isEditing.value = !!habitId.value;
});

onShow(async () => {
  if (!ensureAuth()) return;
  if (isEditing.value) {
    await loadHabit();
  } else {
    planStart.value = formatDate(new Date());
  }
});
</script>

<style scoped>
.page {
  padding: 12px;
}

.card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
}

.form-field {
  margin-top: 10px;
}

.label {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 6px;
  display: block;
}

.input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 8px;
  font-size: 11px;
  background: #fff;
  -webkit-user-select: text;
  user-select: text;
  pointer-events: auto;
}

.textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  background: #fff;
  min-height: 110px;
  -webkit-user-select: text;
  user-select: text;
  pointer-events: auto;
}

.name-textarea {
  min-height: 56px;
}

.picker-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  background: #fff;
}

.picker-row {
  display: flex;
  gap: 8px;
}

.action-row {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
