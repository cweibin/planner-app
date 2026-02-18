import React, { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useNavigate } from 'react-router-dom';
import { Event, fetchCalendarEvents, updateEvent, deleteEvent, EventUpdate } from '../services/events';
import { fetchTodayTasks, Task } from '../services/tasks';

dayjs.extend(isoWeek);

interface CalendarPageProps {
  currentRoleId: number | 'all' | null;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ currentRoleId }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const roleFilterId = typeof currentRoleId === 'number' ? currentRoleId : undefined;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const start = currentDate.startOf('month');
      const end = currentDate.endOf('month');

      const [eventsData, tasksData] = await Promise.all([
        fetchCalendarEvents(start.format('YYYY-MM-DDTHH:mm:ss'), end.format('YYYY-MM-DDTHH:mm:ss')),
        fetchTodayTasks(
          undefined,
          undefined,
          undefined,
          undefined,
          start.format('YYYY-MM-DDTHH:mm:ss'),
          end.format('YYYY-MM-DDTHH:mm:ss'),
          roleFilterId,
        ),
      ]);
      setEvents(eventsData);
      setTasks(tasksData);
    } catch {
      // 忽略错误
    } finally {
      setLoading(false);
    }
  }, [currentDate, roleFilterId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handlePrev = () => {
    setCurrentDate((prev) => prev.subtract(1, 'month'));
  };

  const handleNext = () => {
    setCurrentDate((prev) => prev.add(1, 'month'));
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  const handleDateNavigate = (date: string) => {
    navigate(`/?date=${date}`);
  };

  const handleEventClick = (event: Event) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleEventSave = async (data: Partial<EventUpdate>) => {
    try {
      if (!editingEvent) return;
      await updateEvent(editingEvent.id, data as EventUpdate);
      setShowEventModal(false);
      await loadData();
    } catch {
      window.alert('保存失败');
    }
  };

  const handleEventDelete = async (id: number) => {
    if (!window.confirm('确定要删除这个日程吗？')) return;
    try {
      await deleteEvent(id);
      setShowEventModal(false);
      await loadData();
    } catch {
      window.alert('删除失败');
    }
  };

  const getEventsForDate = (date: string) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return events.filter((e) => dayjs(e.start_time).format('YYYY-MM-DD') === dateStr);
  };

  const getTasksForDate = (date: string) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return tasks.filter((t) => {
      if (!t.start_date && !t.due_date) return false;
      const start = t.start_date ? dayjs(t.start_date).startOf('day') : null;
      const end = t.due_date ? dayjs(t.due_date).endOf('day') : null;
      const effectiveStart = start ?? (end ? end.startOf('day') : null);
      const effectiveEnd = end ?? (start ? start.endOf('day') : null);
      if (!effectiveStart || !effectiveEnd) return false;
      const current = dayjs(dateStr);
      return !current.isBefore(effectiveStart, 'day') && !current.isAfter(effectiveEnd, 'day');
    });
  };

  const getTaskStatusCountsForDate = (date: string) => {
    const dayStart = dayjs(date).startOf('day');
    const dayTasks = getTasksForDate(date);
    const now = dayjs();
    const isOverdueTask = (task: Task) =>
      !!task.due_date && dayjs(task.due_date).isBefore(now);
    const isLateCompletion = (task: Task) =>
      !!task.due_date &&
      !!task.completed_at &&
      dayjs(task.completed_at).isAfter(dayjs(task.due_date));
    const isLateCancellation = (task: Task) =>
      !!task.due_date &&
      !!task.cancelled_at &&
      dayjs(task.cancelled_at).isAfter(dayjs(task.due_date));

    const todoTasks = dayTasks.filter((t) => t.status === 'todo');
    const inProgressTasks = dayTasks.filter((t) => t.status === 'in_progress');
    const doneTasks = tasks.filter(
      (t) =>
        t.status === 'done' &&
        t.completed_at &&
        dayjs(t.completed_at).isSame(dayStart, 'day'),
    );
    const cancelledTasks = tasks.filter(
      (t) =>
        t.status === 'cancelled' &&
        t.cancelled_at &&
        dayjs(t.cancelled_at).isSame(dayStart, 'day'),
    );
    return {
      todo: todoTasks.length,
      todoOverdue: todoTasks.filter((t) => isOverdueTask(t)).length,
      inProgress: inProgressTasks.length,
      inProgressOverdue: inProgressTasks.filter((t) => isOverdueTask(t)).length,
      done: doneTasks.length,
      doneOverdue: doneTasks.filter((t) => isLateCompletion(t)).length,
      cancelled: cancelledTasks.length,
      cancelledOverdue: cancelledTasks.filter((t) => isLateCancellation(t)).length,
    };
  };

  const isToday = (date: string) => dayjs(date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const navButtonStyle: React.CSSProperties = {
    height: 36,
    padding: '6px 16px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  };

  if (loading) {
    return <div className="page-loading">加载中...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 className="page-title">日历</h1>
      </div>

      {/* 导航控制 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button className="button secondary" style={navButtonStyle} onClick={handlePrev}>
          &lt; 上一月
        </button>
        <button className="button secondary" style={navButtonStyle} onClick={handleToday}>
          本月
        </button>
        <button className="button secondary" style={navButtonStyle} onClick={handleNext}>
          下一月 &gt;
        </button>
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 4 }}>
          选择月份：
        </span>
        <select
          className="input"
          style={{ width: 140, height: 36 }}
          value={currentDate.month()}
          onChange={(e) =>
            setCurrentDate((prev) => prev.month(Number(e.target.value)))
          }
        >
          {Array.from({ length: 12 }).map((_, idx) => (
            <option key={idx} value={idx}>
              {currentDate.format('YYYY')}年{idx + 1}月
            </option>
          ))}
        </select>
      </div>

      {/* 日历视图 */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {/* 星期标题 */}
            {weekDays.map((d) => (
              <div
                key={d}
                style={{
                  padding: 8,
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#666',
                  backgroundColor: '#f9fafb',
                }}
              >
                {d}
              </div>
            ))}
            {/* 日期单元格 */}
            {Array.from({ length: 42 }).map((_, idx) => {
              const firstDay = currentDate.startOf('month');
              const startOffset = firstDay.isoWeekday() - 1;
              const day = idx - startOffset + 1;
              const date = currentDate.date(day);
              const isCurrentMonth = day > 0 && day <= currentDate.daysInMonth();
            const dateStr = isCurrentMonth ? date.format('YYYY-MM-DD') : '';

            const taskCounts = dateStr
              ? getTaskStatusCountsForDate(dateStr)
              : {
                    todo: 0,
                    todoOverdue: 0,
                    inProgress: 0,
                    inProgressOverdue: 0,
                    done: 0,
                    doneOverdue: 0,
                  cancelled: 0,
                  cancelledOverdue: 0,
                };
            const isFutureDate = dateStr ? dayjs(dateStr).isAfter(dayjs(), 'day') : false;
            const completionBase = taskCounts.todo + taskCounts.inProgress + taskCounts.done;
            const completionRate =
              completionBase > 0 ? Math.round((taskCounts.done / completionBase) * 100) : 0;

            return (
              <div
                key={idx}
                onClick={() => isCurrentMonth && handleDateNavigate(dateStr)}
                  style={{
                    minHeight: 100,
                    padding: 4,
                    border: '1px solid #e5e7eb',
                    backgroundColor: isCurrentMonth ? '#fff' : '#f9fafb',
                    cursor: isCurrentMonth ? 'pointer' : 'default',
                  }}
                >
                  {isCurrentMonth && (
                    <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 14,
                        fontWeight: isToday(dateStr) ? 700 : 600,
                        color: isToday(dateStr) ? '#1d4ed8' : '#666',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={
                          isToday(dateStr)
                            ? {
                                padding: '2px 8px',
                                borderRadius: 999,
                                backgroundColor: '#dbeafe',
                                border: '1px solid #93c5fd',
                                color: '#1d4ed8',
                                fontWeight: 700,
                              }
                            : undefined
                        }
                      >
                        {day}
                      </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 999,
                            backgroundColor: isFutureDate ? '#f1f5f9' : '#e0f2fe',
                            color: isFutureDate ? '#94a3b8' : '#0284c7',
                            border: '1px solid #e2e8f0',
                            fontWeight: 600,
                          }}
                        >
                          {isFutureDate ? '—' : `${completionRate}%`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div
                          style={{
                            marginTop: 4,
                            padding: '8px 8px',
                            borderRadius: 8,
                            backgroundColor: '#fdfdfd',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                            display: 'grid',
                            gap: 6,
                            fontSize: 11,
                            color: '#475569',
                          }}
                        >
                          {[
                            {
                              label: '待办',
                              count: taskCounts.todo,
                              overdue: taskCounts.todoOverdue,
                              color: '#f59e0b',
                            },
                            {
                              label: '进行中',
                              count: taskCounts.inProgress,
                              overdue: taskCounts.inProgressOverdue,
                              color: '#3b82f6',
                            },
                            {
                              label: '已完成',
                              count: taskCounts.done,
                              overdue: taskCounts.doneOverdue,
                              color: '#22c55e',
                            },
                            {
                              label: '已取消',
                              count: taskCounts.cancelled,
                              overdue: taskCounts.cancelledOverdue,
                              color: '#94a3b8',
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 6,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: 999,
                                    backgroundColor: item.color,
                                  }}
                                />
                                <span style={{ fontWeight: 600 }}>{item.label}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    minWidth: 22,
                                    textAlign: 'center',
                                    padding: '1px 6px',
                                    borderRadius: 999,
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    color: '#334155',
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.count}
                                </span>
                                <span
                                  style={{
                                    minWidth: 40,
                                    textAlign: 'center',
                                    padding: '1px 6px',
                                    borderRadius: 999,
                                    backgroundColor:
                                      item.overdue > 0 ? '#fee2e2' : '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    color: item.overdue > 0 ? '#b91c1c' : '#94a3b8',
                                    fontWeight: 600,
                                  }}
                                >
                                  超时 {item.overdue}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      {/* 添加/编辑日程弹窗 */}
      {showEventModal && (
        <EventFormModal
          event={editingEvent}
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null);
          }}
          onSave={handleEventSave}
          onDelete={editingEvent ? () => handleEventDelete(editingEvent.id) : undefined}
        />
      )}
    </div>
  );
};

// 日程表单弹窗
interface EventFormModalProps {
  event: Event | null;
  onClose: () => void;
  onSave: (data: Partial<EventUpdate>) => void;
  onDelete?: () => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ event, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [startTime, setStartTime] = useState(
    event ? dayjs(event.start_time).format('YYYY-MM-DDTHH:mm') : dayjs().format('YYYY-MM-DDTHH:mm'),
  );
  const [endTime, setEndTime] = useState(
    event ? dayjs(event.end_time).format('YYYY-MM-DDTHH:mm') : dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
  );
  const [color, setColor] = useState(event?.color ?? '#3b82f6');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      window.alert('请输入标题');
      return;
    }
    setSaving(true);
    try {
      onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        color,
      });
    } catch {
      window.alert('保存失败');
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
      <div className="card" style={{ width: 420, maxWidth: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 20 }}>{event ? '编辑日程' : '添加日程'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              标题 *
            </label>
            <input
              className="input"
              style={{ width: '100%' }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入日程标题"
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              描述
            </label>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 60 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述..."
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                开始时间 *
              </label>
              <input
                type="datetime-local"
                className="input"
                style={{ width: '100%' }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                结束时间 *
              </label>
              <input
                type="datetime-local"
                className="input"
                style={{ width: '100%' }}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              颜色
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((c) => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: color === c ? '2px solid #1e3a5f' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {onDelete && (
                <button type="button" className="button danger" onClick={onDelete}>
                  删除
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="button secondary" onClick={onClose}>
                取消
              </button>
              <button type="submit" className="button" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
