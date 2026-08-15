import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createTask, TaskPriority } from '../services/tasks';
import {
  Category,
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '../services/categories';
import { Role } from '../services/roles';
import { buildBeijingDateTime, formatBeijingDate, nowBeijing, toBeijing } from '../utils/time';

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: '高优先级',
  medium: '普通',
  low: '低优先级',
};

interface NewTaskPageProps {
  variant?: 'page' | 'panel';
  onClose?: () => void;
  roleId?: number | null;
  roles?: Role[];
  onRoleChange?: (roleId: number | 'all') => void;
  onTaskCreated?: () => void;
}

export const NewTaskPage: React.FC<NewTaskPageProps> = ({
  variant = 'page',
  onClose,
  roleId,
  roles = [],
  onRoleChange,
  onTaskCreated,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultDate = useMemo(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = toBeijing(dateParam);
      if (parsed && parsed.isValid()) {
        return formatBeijingDate(dateParam);
      }
    }
    return nowBeijing().format('YYYY-MM-DD');
  }, [searchParams]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [dueDate, setDueDate] = useState(defaultDate);
  const [dueTime, setDueTime] = useState('18:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(roleId ?? null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | 'none'>('none');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryAddOption = '__add__';
  const categoryRenameOption = '__rename__';
  const categoryDeleteOption = '__delete__';

  useEffect(() => {
    if (roleId) {
      setSelectedRoleId(roleId);
      return;
    }
    if (roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    } else {
      setSelectedRoleId(null);
    }
  }, [roleId, roles]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch {
        // 忽略分类加载错误
      }
    };
    void load();
  }, []);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (dueDate) {
      const start = toBeijing(value);
      const due = toBeijing(dueDate);
      if (start && due && start.isAfter(due)) {
        setDueDate(value);
      }
    }
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    const due = toBeijing(`${dueDate}T${dueTime}`);
    const start = toBeijing(`${startDate}T${value}`);
    if (due && start && due.isBefore(start)) {
      setDueDate(startDate);
      setDueTime(value);
    }
  };

  const handleDueDateChange = (value: string) => {
    setDueDate(value);
    const due = toBeijing(`${value}T${dueTime}`);
    const start = toBeijing(`${startDate}T${startTime}`);
    if (due && start && due.isBefore(start)) {
      setStartDate(value);
      setStartTime(dueTime);
    }
  };

  const handleDueTimeChange = (value: string) => {
    setDueTime(value);
    const due = toBeijing(`${dueDate}T${value}`);
    const start = toBeijing(`${startDate}T${startTime}`);
    if (due && start && due.isBefore(start)) {
      setStartDate(dueDate);
      setStartTime(value);
    }
  };

  const handleCategorySelect = async (value: string) => {
    if (value === categoryAddOption) {
      const name = window.prompt('请输入分类名称');
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) {
        setCategoryError('请输入分类名称');
        return;
      }
      setCategoryError(null);
      try {
        const created = await createCategory(trimmed);
        setCategories((prev) => [...prev, created]);
        setCategoryId(created.id);
      } catch {
        setCategoryError('分类创建失败，请稍后再试');
      }
      return;
    }
    if (value === categoryRenameOption) {
      if (categoryId === 'none') {
        setCategoryError('请选择需要重命名的分类');
        return;
      }
      const current = categories.find((c) => c.id === categoryId);
      const name = window.prompt('重命名分类', current?.name ?? '');
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) {
        setCategoryError('请输入分类名称');
        return;
      }
      setCategoryError(null);
      try {
        const updated = await updateCategory(Number(categoryId), trimmed);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } catch {
        setCategoryError('分类重命名失败，请稍后再试');
      }
      return;
    }
    if (value === categoryDeleteOption) {
      if (categoryId === 'none') {
        setCategoryError('请选择需要删除的分类');
        return;
      }
      if (!window.confirm('确定删除该分类？')) return;
      setCategoryError(null);
      try {
        await deleteCategory(Number(categoryId));
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
        setCategoryId('none');
      } catch {
        setCategoryError('分类删除失败，请稍后再试');
      }
      return;
    }
    setCategoryId(value === 'none' ? 'none' : Number(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('请输入任务标题');
      return;
    }
    const startDateTime = toBeijing(`${startDate}T${startTime}`);
    const dueDateTime = toBeijing(`${dueDate}T${dueTime}`);
    if (
      startDate &&
      dueDate &&
      startDateTime &&
      dueDateTime &&
      startDateTime.isAfter(dueDateTime)
    ) {
      setError('开始时间不能晚于结束时间');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        priority,
        category_id: categoryId === 'none' ? undefined : categoryId,
        start_date: startDate ? buildBeijingDateTime(startDate, startTime) : undefined,
        due_date: dueDate ? buildBeijingDateTime(dueDate, dueTime) : undefined,
        is_recurring: isRecurring,
        recurring_rule: isRecurring ? 'daily' : undefined,
        role_id: selectedRoleId ?? undefined,
      });
      onTaskCreated?.();
      if (selectedRoleId && selectedRoleId !== roleId) {
        onRoleChange?.(selectedRoleId);
      }
      const returnDate = startDate || dueDate || defaultDate;
      if (onClose) {
        onClose();
        navigate(`/?date=${returnDate}`);
      } else {
        navigate(`/?date=${returnDate}`);
      }
    } catch {
      setError('创建任务失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  const containerStyle =
    variant === 'panel'
      ? { height: '100%', overflowY: 'auto' as const }
      : { maxWidth: 720, margin: '24px auto' };

  return (
    <div style={containerStyle}>
      <div className="card" style={variant === 'panel' ? { height: '100%' } : undefined}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title" style={{ margin: 0, flex: 1 }}>
            新增任务
          </h1>
          {onClose && (
            <button className="button secondary" onClick={onClose}>
              关闭
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="task-title">
              任务标题
            </label>
            <input
              className="input"
              id="task-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入任务标题"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="task-description">
              任务描述
            </label>
            <textarea
              className="input"
              id="task-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="补充任务详情（可选）"
              style={{ minHeight: 90, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-field">
                <label className="form-label" htmlFor="task-start-date">
                  开始日期
                </label>
                <input
                  className="input"
                  id="task-start-date"
                  name="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="task-start-time">
                  开始时间
                </label>
                <input
                  className="input"
                  id="task-start-time"
                  name="start_time"
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-field">
                <label className="form-label" htmlFor="task-due-date">
                  结束日期
                </label>
                <input
                  className="input"
                  id="task-due-date"
                  name="due_date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="task-due-time">
                  结束时间
                </label>
                <input
                  className="input"
                  id="task-due-time"
                  name="due_time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => handleDueTimeChange(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            }}
          >
            <div className="form-field">
              <label className="form-label" htmlFor="task-priority">
                优先级
              </label>
              <select
                className="input"
                id="task-priority"
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="task-category">
                分类
              </label>
              <select
                className="input"
                id="task-category"
                name="category_id"
                value={categoryId}
                onChange={(e) => void handleCategorySelect(e.target.value)}
              >
                <option value={categoryAddOption}>新增分类...</option>
                <option value={categoryRenameOption}>重命名当前分类</option>
                <option value={categoryDeleteOption}>删除当前分类</option>
                <option value="none">无分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {categoryError && (
                <div style={{ color: '#d32f2f', fontSize: 12, marginTop: 6 }}>
                  {categoryError}
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              alignItems: 'start',
            }}
          >
            <div className="form-field">
              <label className="form-label">重复</label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: '#555',
                }}
              >
                <input
                  id="task-recurring"
                  name="is_recurring"
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                每天重复该任务
              </label>
            </div>
          </div>
          {error && (
            <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 8 }}>{error}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                if (onClose) {
                  onClose();
                  return;
                }
                navigate(`/?date=${startDate || defaultDate}`);
              }}
            >
              取消
            </button>
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? '提交中...' : '创建任务'}
            </button>
          </div>
          {roles.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 9,
                  color: '#777',
                  whiteSpace: 'nowrap',
                }}
              >
                适用于（角色）
                <select
                  className="input"
                  id="task-role"
                  name="role_id"
                  style={{ fontSize: 9, height: 30, minWidth: 140 }}
                  value={selectedRoleId ?? roles[0]?.id ?? ''}
                  onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
