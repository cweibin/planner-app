<template>
  <view class="page">
    <LogoutButton />
    <view class="card">
      <view class="role-row">
        <text class="label">{{ t('role') }}</text>
        <picker :range="roleOptions" range-key="label" @change="onRoleChange">
          <view class="picker-input">{{ roleLabel }}</view>
        </picker>
      </view>
      <view class="chip-row">
        <text class="chip" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">{{ t('filter.all') }}</text>
        <text class="chip" :class="{ active: activeFilter === 'in_progress' }" @click="activeFilter = 'in_progress'">{{ t('status.in_progress') }}</text>
        <text class="chip" :class="{ active: activeFilter === 'done' }" @click="activeFilter = 'done'">{{ t('status.done') }}</text>
      </view>
      <view class="task-card" v-for="task in tasksView" :key="task.id" @click="openTask(task.id)">
        <view class="task-info">
          <text class="task-title">{{ task.title }}</text>
          <text class="task-meta">{{ t('due.label') }} {{ task.dueLabel }} · {{ task.roleName }}</text>
        </view>
        <view class="task-tags">
          <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
          <text class="tag status">{{ statusText(task.status) }}</text>
        </view>
      </view>
      <view v-if="!tasksView.length" class="empty">{{ t('tasks.empty') }}</view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { ensureAuth, getRoleId, hasRoleSelection, setRoleId } from '../../utils/auth';
import { fetchRoles } from '../../services/roles';
import { fetchTasks } from '../../services/tasks';
import { formatBeijingDate, formatBeijingTime } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';
import { t, locale, initLocale } from '../../locale';

const activeFilter = ref('all');
const tasks = ref([]);
const roles = ref([]);
const roleOptions = ref([{ label: t('role.all'), value: null }]);
const selectedRoleIndex = ref(0);

const roleMap = computed(() => {
  const map = {};
  roles.value.forEach((role) => {
    map[role.id] = role.name;
  });
  return map;
});

const tasksView = computed(() => {
  return tasks.value.map((task) => {
    const dueLabel = task.due_date
      ? `${formatBeijingDate(task.due_date)} ${formatBeijingTime(task.due_date)}`
      : '未设置';
    return {
      ...task,
      dueLabel,
      roleName: roleMap.value[task.role_id] || t('task.detail.unassigned')
    };
  });
});

const roleLabel = computed(() => roleOptions.value[selectedRoleIndex.value]?.label ?? t('role.all'));

const loadRoles = async () => {
  try {
    const data = await fetchRoles();
    roles.value = data;
    roleOptions.value = [
      { label: t('role.all'), value: null },
      ...data.map((role) => ({ label: role.name, value: role.id })),
    ];
  } catch {
    // ignore
  }
};

const applyDefaultRole = () => {
  const personalIndex = roleOptions.value.findIndex((item) => item.label === '个人');
  if (personalIndex > 0) {
    selectedRoleIndex.value = personalIndex;
    setRoleId(roleOptions.value[personalIndex].value);
  } else {
    selectedRoleIndex.value = 0;
    setRoleId(null);
  }
};

const syncRoleSelection = () => {
  if (!hasRoleSelection()) {
    applyDefaultRole();
    return;
  }
  const stored = getRoleId();
  if (stored === null) {
    selectedRoleIndex.value = 0;
    return;
  }
  const idx = roleOptions.value.findIndex((item) => item.value === stored);
  selectedRoleIndex.value = idx >= 0 ? idx : 0;
};

const loadTasks = async () => {
  const roleId = roleOptions.value[selectedRoleIndex.value]?.value ?? getRoleId();
  const params = {
    order: 'priority_desc',
    role_id: roleId ?? undefined,
  };
  if (activeFilter.value !== 'all') {
    params.status = activeFilter.value;
  }
  try {
    tasks.value = await fetchTasks(params);
  } catch {
    tasks.value = [];
  }
};

const priorityText = (value) => {
  if (value === 'high') return t('priority.high');
  if (value === 'medium') return t('priority.medium');
  return t('priority.low');
};

const statusText = (value) => {
  if (value === 'todo') return t('status.todo');
  if (value === 'in_progress') return t('status.in_progress');
  if (value === 'cancelled') return t('status.cancelled');
  return t('status.done');
};

const openTask = (taskId) => {
  if (!taskId) return;
  uni.navigateTo({ url: `/pages/task-detail/index?id=${taskId}` });
};

const onRoleChange = (event) => {
  selectedRoleIndex.value = Number(event.detail.value);
  const roleId = roleOptions.value[selectedRoleIndex.value]?.value ?? null;
  setRoleId(roleId || null);
  void loadTasks();
};

watch(activeFilter, () => {
  void loadTasks();
});

onShow(() => {
  initLocale(); uni.setNavigationBarTitle({ title: t('nav.tasks') });
  if (!ensureAuth()) return;
  void loadRoles().then(() => {
    syncRoleSelection();
    loadTasks();
  });
});
</script>

<style scoped>
.page {
  padding: 16px;
}

.role-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.label {
  font-size: 12px;
  color: #776b7f;
}

.picker-input {
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  font-size: 12px;
}

.chip-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.task-card {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 8px;
  transition: transform 0.2s ease;
}

.task-card:active {
  transform: scale(0.98);
}

.task-title {
  font-size: 14px;
  font-weight: 700;
}

.task-meta {
  font-size: 11px;
  color: #776b7f;
  margin-top: 4px;
}

.task-tags {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.tag {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  color: #776b7f;
}

.tag.high {
  background: #ffe5e5;
  color: #d32f2f;
  border-color: #f5b5b5;
}

.tag.medium {
  background: #e3f2fd;
  color: #1565c0;
  border-color: #b6d6f7;
}

.tag.low {
  background: #e0f2f1;
  color: #00796b;
  border-color: #b5e3df;
}

.tag.status {
  background: #f3f4f6;
  color: #64748b;
}

.empty {
  font-size: 12px;
  color: #776b7f;
}
</style>
