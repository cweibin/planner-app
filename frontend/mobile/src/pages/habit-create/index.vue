<template>
  <view class="page">
    <LogoutButton />
    <FloatingAddButton :disable="false" />
    <view class="card">
      <text class="section-title">{{ isEditing ? t('habit.edit.title') : t('habit.create.title') }}</text>
      <view class="form-field">
        <text class="label">{{ t('habit.name.required') }}</text>
        <textarea
          class="textarea name-textarea"
          :value="name"
          :focus="nameFocus"
          auto-height
          @tap.stop="focusName"
          @focus="onFocusName"
          @blur="onBlurName"
          @input="onNameInput"
          :placeholder="t('habit.name.ph')"
        />
      </view>
      <view class="form-field">
        <text class="label">{{ t('habit.desc') }}</text>
        <textarea
          class="textarea"
          :value="description"
          :focus="descFocus"
          @tap.stop="focusDesc"
          @focus="onFocusDesc"
          @blur="onBlurDesc"
          @input="onDescriptionInput"
          :placeholder="t('task.desc.ph')"
        />
      </view>
      <view class="form-field">
        <text class="label">{{ t('habit.target.type') }}</text>
        <picker :range="targetTypeOptions" range-key="label" :value="targetTypeIndex" @change="onTargetTypeChange">
          <view class="picker-input">{{ targetTypeLabel }}</view>
        </picker>
      </view>
      <view class="form-field">
        <text class="label">{{ t('habit.target.count') }}</text>
        <picker :range="targetCountOptions" :value="targetCountIndex" @change="onTargetCountChange">
          <view class="picker-input">{{ targetCountOptions[targetCountIndex] || 1 }}</view>
        </picker>
      </view>
      <view class="form-field">
        <text class="label">{{ t('habit.plan.date') }}</text>
        <view class="picker-row">
          <picker mode="date" :value="planStart" @change="onPlanStartChange">
            <view class="picker-input">{{ planStart || t('habit.plan.start.ph') }}</view>
          </picker>
          <picker mode="date" :value="planEnd" @change="onPlanEndChange">
            <view class="picker-input">{{ planEnd || t('habit.plan.end.ph') }}</view>
          </picker>
        </view>
      </view>
      <view class="action-row">
        <button class="btn" size="mini" @click="cancel">{{ t('task.cancel') }}</button>
        <button class="btn primary" size="mini" :disabled="submitting" @click="submit">
          {{ submitting ? t('task.saving') : t('task.save') }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { requireAuth } from '../../utils/auth';
import { createHabit, fetchHabit, updateHabit } from '../../services/habits';
import { formatDate } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';
import FloatingAddButton from '../../components/FloatingAddButton.vue';
import { t, initLocale } from '../../locale';

const name = ref('');
const description = ref('');
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

const targetTypeOptions = computed(() => [
  { label: t('every.day'), value: 'daily' },
  { label: t('every.week'), value: 'weekly' },
]);

const targetTypeLabel = computed(() => targetTypeOptions.value[targetTypeIndex.value]?.label ?? t('every.day'));

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
    uni.showToast({ title: t('habit.name.empty'), icon: 'none' });
    return;
  }
  const count = Number(targetCountOptions[targetCountIndex.value] || 1);
  if (!Number.isFinite(count) || count <= 0) {
    uni.showToast({ title: t('habit.target.count.empty'), icon: 'none' });
    return;
  }
  if (planStart.value && planEnd.value && planEnd.value < planStart.value) {
    uni.showToast({ title: t('habit.end.before.start'), icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      name: trimmed,
      description: description.value.trim() || null,
      target_type: targetTypeOptions.value[targetTypeIndex.value]?.value || 'daily',
      target_count: Math.floor(count),
    };
    if (planStart.value) payload.plan_start_date = planStart.value;
    if (planEnd.value) payload.plan_end_date = planEnd.value;
    if (isEditing.value && habitId.value) {
      await updateHabit(habitId.value, payload);
      uni.showToast({ title: t('habit.updated'), icon: 'success' });
    } else {
      await createHabit(payload);
      uni.showToast({ title: t('task.created'), icon: 'success' });
    }
    setTimeout(() => {
      uni.switchTab({ url: '/pages/habits/index' });
    }, 300);
  } catch {
    uni.showToast({ title: isEditing.value ? t('task.update.fail') : t('task.create.fail'), icon: 'none' });
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
    const typeIdx = targetTypeOptions.value.findIndex((item) => item.value === habit?.target_type);
    targetTypeIndex.value = typeIdx >= 0 ? typeIdx : 0;
    const count = Number(habit?.target_value ?? habit?.target_count ?? 1);
    const countIdx = targetCountOptions.findIndex((v) => v === count);
    targetCountIndex.value = countIdx >= 0 ? countIdx : 0;
    planStart.value = habit?.plan_start_date || '';
    planEnd.value = habit?.plan_end_date || '';
  } catch {
    uni.showToast({ title: t('habit.load.fail'), icon: 'none' });
  }
};

onLoad((query) => {
  const id = Number(query.id);
  habitId.value = Number.isNaN(id) ? null : id;
  isEditing.value = !!habitId.value;
});

onShow(async () => {
  initLocale(); uni.setNavigationBarTitle({ title: t('nav.habit.create') });
  if (!requireAuth()) return;
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
  border: 1px solid rgba(110, 95, 116, 0.4);
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
  color: #776b7f;
  margin-bottom: 6px;
  display: block;
}

.input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(110, 95, 116, 0.4);
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
  border: 1px solid rgba(110, 95, 116, 0.4);
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
  border: 1px solid rgba(110, 95, 116, 0.4);
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
