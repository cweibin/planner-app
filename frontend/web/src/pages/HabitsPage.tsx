import React, { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Habit, fetchHabits, createHabit, updateHabit, deleteHabit, checkInHabit, cancelCheckIn, fetchCheckIns, HabitCreate, HabitUpdate } from '../services/habits';

dayjs.extend(utc);
dayjs.extend(timezone);

export const HabitsPage: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [checkInDates, setCheckInDates] = useState<Record<number, Record<string, string>>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentWeekStart, setCurrentWeekStart] = useState(
    dayjs().startOf('week').format('YYYY-MM-DD'),
  );

  const loadHabits = useCallback(async () => {
    try {
      const data = await fetchHabits(statusFilter);
      setHabits(data);
    } catch {
      // 忽略错误
    }
  }, [statusFilter]);

  const loadCheckIns = useCallback(async () => {
    const weekStart = dayjs(currentWeekStart).startOf('week');
    const start = weekStart.format('YYYY-MM-DD');
    const end = weekStart.endOf('week').format('YYYY-MM-DD');
    const checkInsMap: Record<number, Record<string, string>> = {};
    for (const habit of habits) {
      try {
        const checkIns = await fetchCheckIns(habit.id, start, end);
        const map: Record<string, string> = {};
        checkIns.forEach((c) => {
          const time = c.check_in_time
            ? dayjs.utc(c.check_in_time).tz('Asia/Shanghai').format('HH:mm')
            : '';
          map[c.check_in_date] = time;
        });
        checkInsMap[habit.id] = map;
      } catch {
        checkInsMap[habit.id] = {};
      }
    }
    setCheckInDates(checkInsMap);
  }, [habits, currentWeekStart]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadHabits();
      setLoading(false);
    };
    void loadData();
  }, [loadHabits]);

  useEffect(() => {
    if (habits.length > 0) {
      void loadCheckIns();
    }
  }, [habits, loadCheckIns]);

  const handleCheckIn = async (habit: Habit, date: string) => {
    if (habit.status !== 'active') {
      return;
    }
    if (habit.plan_end_date && dayjs().isAfter(dayjs(habit.plan_end_date), 'day')) {
      return;
    }
    const dates = checkInDates[habit.id] ?? {};
    const alreadyChecked = !!dates[date];
    if (alreadyChecked) {
      await cancelCheckIn(habit.id, date);
    } else {
      await checkInHabit(habit.id, date);
    }
    await loadCheckIns();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这个习惯吗？')) return;
    try {
      await deleteHabit(id);
      await loadHabits();
    } catch {
      window.alert('删除失败');
    }
  };

  const handleStatusChange = async (id: number, status: Habit['status']) => {
    try {
      await updateHabit(id, { status });
      await loadHabits();
    } catch {
      window.alert('状态更新失败');
    }
  };

  const getWeekDays = () => {
    const start = dayjs(currentWeekStart).startOf('week');
    return Array.from({ length: 7 }, (_, idx) => {
      const date = start.add(idx, 'day').format('YYYY-MM-DD');
      return { date, day: start.add(idx, 'day').date() };
    });
  };

  const isToday = (date: string) => date === dayjs().format('YYYY-MM-DD');
  const isFuture = (date: string) => dayjs(date).isAfter(dayjs().format('YYYY-MM-DD'));

  const getWeekTarget = (habit: Habit, weekDays: number) => {
    const raw = Number(habit.target_value ?? 0);
    const targetValue = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    return habit.target_type === 'daily' ? targetValue * weekDays : targetValue;
  };

  const completedToday = habits.filter((h) => {
    const dates = checkInDates[h.id] ?? {};
    return h.status === 'active' && !!dates[dayjs().format('YYYY-MM-DD')];
  }).length;
  const totalActive = habits.filter((h) => h.status === 'active').length;
  const weekHeaderStart = dayjs(currentWeekStart).startOf('week');
  const weekHeaderEnd = weekHeaderStart.endOf('week');
  const weekHeaderLabel = `${weekHeaderStart.format('M月D日')} - ${weekHeaderEnd.format('M月D日')}`;

  const getWeekCompletionRate = () => {
    if (habits.length === 0) return 0;

    const activeHabits = habits.filter((h) => h.status === 'active');
    if (activeHabits.length === 0) return 0;

    let totalCheckIns = 0;
    let totalPossible = 0;

    activeHabits.forEach((habit) => {
      const dates = checkInDates[habit.id] ?? {};
      const weekStart = dayjs(currentWeekStart).startOf('week');
      const weekEnd = weekStart.endOf('week');
      const weekTarget = getWeekTarget(habit, 7);

      const weekCheckIns = Object.keys(dates).filter((d) => {
        const current = dayjs(d);
        return !current.isBefore(weekStart, 'day') && !current.isAfter(weekEnd, 'day');
      }).length;

      totalCheckIns += weekCheckIns;
      totalPossible += weekTarget;
    });

    return totalPossible > 0 ? Math.round((totalCheckIns / totalPossible) * 100) : 0;
  };

  if (loading) {
    return <div className="page-loading">加载中...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">习惯追踪</h1>
        <button className="button" onClick={() => setShowCreateModal(true)}>
          添加习惯
        </button>
      </div>

      {/* 概览卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card stat-card">
          <div className="stat-value">{habits.length}</div>
          <div className="stat-label">习惯总数</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{totalActive}</div>
          <div className="stat-label">进行中</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{completedToday}/{totalActive}</div>
          <div className="stat-label">今日完成</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{getWeekCompletionRate()}%</div>
          <div className="stat-label">本周完成率</div>
        </div>
      </div>

      {/* 筛选 */}
      <div style={{ marginBottom: 20 }}>
        <select
          className="input"
          style={{ width: 140 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">全部状态</option>
          <option value="active">进行中</option>
          <option value="paused">已暂停</option>
          <option value="completed">已完成</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button
          className="button secondary"
          style={{ padding: '4px 8px', fontSize: 12 }}
          onClick={() =>
            setCurrentWeekStart(
              dayjs(currentWeekStart).subtract(1, 'week').startOf('week').format('YYYY-MM-DD'),
            )
          }
        >
          上周
        </button>
        <span style={{ fontWeight: 600 }}>{weekHeaderLabel}</span>
        <button
          className="button secondary"
          style={{ padding: '4px 8px', fontSize: 12 }}
          onClick={() =>
            setCurrentWeekStart(
              dayjs(currentWeekStart).add(1, 'week').startOf('week').format('YYYY-MM-DD'),
            )
          }
        >
          下周
        </button>
      </div>

      {/* 习惯列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {habits.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            还没有习惯，开始培养你的第一个好习惯吧！
          </div>
        ) : (
          habits.map((habit) => {
            const dates = checkInDates[habit.id] ?? {};
            const weekStart = dayjs(currentWeekStart).startOf('week');
            const weekEnd = weekStart.endOf('week');
            const weekCheckIns = Object.keys(dates).filter((d) => {
              const current = dayjs(d);
              return !current.isBefore(weekStart, 'day') && !current.isAfter(weekEnd, 'day');
            }).length;
            const weekDays = 7;
            const weekTarget = getWeekTarget(habit, weekDays);
            const completionRate = weekTarget > 0 ? (weekCheckIns / weekTarget) * 100 : 0;
            const isWeekComplete = weekTarget > 0 && weekCheckIns >= weekTarget;

            return (
              <div key={habit.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{habit.name}</h3>
                      <span style={{ fontSize: 12, color: '#999' }}>
                        本周完成率 {weekCheckIns}/{weekTarget} 次 ({completionRate.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#999' }}>
                      <span>目标: {habit.target_type === 'daily' ? '每天' : '每周'} {habit.target_value} 次</span>
                      {(habit.plan_start_date || habit.plan_end_date) && (
                        <span>
                          计划日期:
                          {' '}
                          {habit.plan_start_date || '---- -- --'}
                          {' '}
                          -
                          {' '}
                          {habit.plan_end_date || '---- -- --'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      className="input"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={habit.status}
                      onChange={(e) => handleStatusChange(habit.id, e.target.value as Habit['status'])}
                    >
                      <option value="active">进行中</option>
                      <option value="paused">已暂停</option>
                      <option value="completed">已完成</option>
                    </select>
                    <button
                      className="button secondary"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      onClick={() => setEditingHabit(habit)}
                    >
                      编辑
                    </button>
                    <button
                      className="button danger"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      onClick={() => handleDelete(habit.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 打卡周视图 */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                    {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                      <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#999', padding: 2 }}>
                        {d}
                      </div>
                    ))}
                    {getWeekDays().map((item, idx) => {
                      const isChecked = !!dates[item.date];
                      const isHabitInactive =
                        habit.status !== 'active' ||
                        (habit.plan_end_date &&
                          dayjs().isAfter(dayjs(habit.plan_end_date), 'day'));
                      const canCheck = !isHabitInactive && !isFuture(item.date);
                      const checkTime = isChecked ? dates[item.date] || '' : '';
                      const baseBackground = isHabitInactive
                        ? '#f8fafc'
                        : isWeekComplete || isChecked
                        ? '#22c55e'
                        : isToday(item.date)
                        ? '#dbeafe'
                        : '#f9fafb';
                      const baseBorder = isHabitInactive
                        ? '1px solid #e5e7eb'
                        : isWeekComplete
                        ? '1px solid #16a34a'
                        : isToday(item.date)
                        ? '2px solid #3b82f6'
                        : '1px solid #e5e7eb';
                      const baseColor = isHabitInactive
                        ? '#cbd5e1'
                        : isWeekComplete || isChecked
                        ? '#fff'
                        : isToday(item.date)
                        ? '#3b82f6'
                        : '#666';
                      return (
                        <div
                          key={idx}
                          onClick={() => canCheck && handleCheckIn(habit, item.date)}
                          style={{
                            aspectRatio: '3 / 1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: 2,
                            fontSize: 12,
                            borderRadius: 6,
                            cursor: canCheck ? 'pointer' : 'default',
                            backgroundColor: baseBackground,
                            color: baseColor,
                            fontWeight: isToday(item.date) ? 600 : 400,
                            border: baseBorder,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (canCheck && !isChecked && !isWeekComplete) {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = baseBackground;
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <div style={{ lineHeight: 1 }}>{item.day}</div>
                          {isChecked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, opacity: 0.9 }}>
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path
                                  d="M2.2 6.4L4.8 9L9.8 3.6"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span>{checkTime || '已打卡'}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {habit.description && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>{habit.description}</p>
                )}
                {/* 进度条已隐藏 */}
              </div>
            );
          })
        )}
      </div>

      {/* 创建/编辑弹窗 */}
      {(showCreateModal || editingHabit) && (
        <HabitFormModal
          habit={editingHabit}
          onClose={() => {
            setShowCreateModal(false);
            setEditingHabit(null);
          }}
          onSave={async () => {
            setShowCreateModal(false);
            setEditingHabit(null);
            await loadHabits();
          }}
        />
      )}
    </div>
  );
};

// 习惯表单弹窗组件
interface HabitFormModalProps {
  habit: Habit | null;
  onClose: () => void;
  onSave: () => void;
}

const HabitFormModal: React.FC<HabitFormModalProps> = ({ habit, onClose, onSave }) => {
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [targetType, setTargetType] = useState<'daily' | 'weekly'>(habit?.target_type ?? 'daily');
  const [targetValue, setTargetValue] = useState(habit?.target_value ?? 1);
  const [planStartDate, setPlanStartDate] = useState(habit?.plan_start_date ?? '');
  const [planEndDate, setPlanEndDate] = useState(habit?.plan_end_date ?? '');
  const [remindType, setRemindType] = useState<'daily' | 'weekdays' | 'weekends'>(habit?.remind_type ?? 'daily');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      window.alert('请输入习惯名称');
      return;
    }
    setSaving(true);
    try {
      const payload: HabitCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
        plan_start_date: planStartDate || undefined,
        plan_end_date: planEndDate || undefined,
        target_type: targetType,
        target_value: targetValue,
        remind_type: remindType,
      };
      if (habit) {
        const updatePayload: HabitUpdate = payload;
        await updateHabit(habit.id, updatePayload);
      } else {
        await createHabit(payload);
      }
      onSave();
    } catch {
      window.alert(habit ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 400, maxWidth: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: 20 }}>
          {habit ? '编辑习惯' : '添加习惯'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              习惯名称 *
            </label>
            <input
              className="input"
              style={{ width: '100%' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：每天运动"
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              描述（可选）
            </label>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 60 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加一些描述..."
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              目标类型
            </label>
            <select
              className="input"
              style={{ width: '100%' }}
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as 'daily' | 'weekly')}
            >
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              目标次数
            </label>
            <input
              type="number"
              className="input"
              style={{ width: '100%' }}
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              min={1}
              max={7}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              计划日期
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="date"
                className="input"
                value={planStartDate}
                onChange={(e) => setPlanStartDate(e.target.value)}
              />
              <input
                type="date"
                className="input"
                value={planEndDate}
                onChange={(e) => setPlanEndDate(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              提醒时间
            </label>
            <select
              className="input"
              style={{ width: '100%' }}
              value={remindType}
              onChange={(e) => setRemindType(e.target.value as 'daily' | 'weekdays' | 'weekends')}
            >
              <option value="daily">每天</option>
              <option value="weekdays">仅工作日</option>
              <option value="weekends">仅周末</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="button secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="button" disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
