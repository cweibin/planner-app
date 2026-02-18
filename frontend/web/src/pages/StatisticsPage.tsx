import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  fetchTaskStatistics,
  fetchOverviewStatistics,
  fetchTimeStatistics,
  fetchHabitStatistics,
  fetchTrendsStatistics,
  TaskStatistics,
  OverviewStatistics,
  TimeStatistics,
  HabitStatistics,
  TrendsStatistics,
} from '../services/statistics';

export const StatisticsPage: React.FC = () => {
  const [taskStats, setTaskStats] = useState<TaskStatistics | null>(null);
  const [overview, setOverview] = useState<OverviewStatistics | null>(null);
  const [timeStats, setTimeStats] = useState<TimeStatistics | null>(null);
  const [habitStats, setHabitStats] = useState<HabitStatistics | null>(null);
  const [trends, setTrends] = useState<TrendsStatistics | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [task, over, time, habit, trend] = await Promise.all([
          fetchTaskStatistics(),
          fetchOverviewStatistics(days),
          fetchTimeStatistics(days),
          fetchHabitStatistics(),
          fetchTrendsStatistics(days),
        ]);
        setTaskStats(task);
        setOverview(over);
        setTimeStats(time);
        setHabitStats(habit);
        setTrends(trend);
      } catch {
        // 忽略错误
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [days]);

  if (loading) {
    return <div className="page-loading">加载中...</div>;
  }

  const totalTasks = taskStats
    ? taskStats.todo + taskStats.in_progress + taskStats.done + taskStats.cancelled
    : 0;
  const doneRate = taskStats && totalTasks > 0 ? (taskStats.done / totalTasks) * 100 : 0;
  const trendData = trends?.data ?? [];
  const trendTaskMax = trendData.reduce((max, item) => Math.max(max, item.completed_tasks), 0);
  const trendHabitMax = trendData.reduce((max, item) => Math.max(max, item.habit_checkins), 0);

  return (
    <div>
      <h1 className="page-title">数据统计</h1>

      {/* 时间范围选择 */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>统计周期：</span>
        <select
          className="input"
          style={{ width: 120 }}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>近 7 天</option>
          <option value={14}>近 14 天</option>
          <option value={30}>近 30 天</option>
          <option value={90}>近 90 天</option>
        </select>
      </div>

      {/* 概览卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card stat-card">
          <div className="stat-value">{overview?.completed_tasks ?? 0}</div>
          <div className="stat-label">完成任务</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{overview?.habit_checkins ?? 0}</div>
          <div className="stat-label">习惯打卡</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{habitStats?.total_habits ?? 0}</div>
          <div className="stat-label">习惯总数</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{doneRate.toFixed(1)}%</div>
          <div className="stat-label">任务完成率</div>
        </div>
      </div>

      {/* 任务状态分布 */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">任务状态分布</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="progress-bar-container" style={{ marginBottom: 8 }}>
              <div
                className="progress-bar todo"
                style={{
                  width: totalTasks > 0 ? `${(taskStats?.todo ?? 0) / totalTasks * 100}%` : '0%',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>待办 ({taskStats?.todo ?? 0})</span>
              <span>{totalTasks > 0 ? ((taskStats?.todo ?? 0) / totalTasks * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="progress-bar-container" style={{ marginBottom: 8 }}>
              <div
                className="progress-bar in-progress"
                style={{
                  width: totalTasks > 0 ? `${(taskStats?.in_progress ?? 0) / totalTasks * 100}%` : '0%',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>进行中 ({taskStats?.in_progress ?? 0})</span>
              <span>{totalTasks > 0 ? ((taskStats?.in_progress ?? 0) / totalTasks * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="progress-bar-container" style={{ marginBottom: 8 }}>
              <div
                className="progress-bar done"
                style={{
                  width: totalTasks > 0 ? `${(taskStats?.done ?? 0) / totalTasks * 100}%` : '0%',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>已完成 ({taskStats?.done ?? 0})</span>
              <span>{totalTasks > 0 ? ((taskStats?.done ?? 0) / totalTasks * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="progress-bar-container" style={{ marginBottom: 8 }}>
              <div
                className="progress-bar cancelled"
                style={{
                  width: totalTasks > 0 ? `${(taskStats?.cancelled ?? 0) / totalTasks * 100}%` : '0%',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>已取消 ({taskStats?.cancelled ?? 0})</span>
              <span>{totalTasks > 0 ? ((taskStats?.cancelled ?? 0) / totalTasks * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* 习惯状态分布 */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">习惯状态</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#22c55e' }}>
              {habitStats?.status_counts.active ?? 0}
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>进行中</div>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#f59e0b' }}>
              {habitStats?.status_counts.paused ?? 0}
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>已暂停</div>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#3b82f6' }}>
              {habitStats?.status_counts.completed ?? 0}
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>已完成</div>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#8b5cf6' }}>
              {habitStats?.total_checkins ?? 0}
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>累计打卡</div>
          </div>
        </div>
      </section>

      {/* 时间分布图表 */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">每日任务与习惯打卡情况</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {timeStats?.data.map((item) => (
            <div key={item.date} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 100, fontSize: 13, color: '#666' }}>
                {dayjs(item.date).format('MM-DD')}
              </span>
              <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center' }}>
                <div
                  style={{
                    height: 20,
                    backgroundColor: '#3b82f6',
                    borderRadius: 2,
                    minWidth: 2,
                    width: Math.max(2, (item.tasks_due ?? 0) * 8),
                  }}
                  title={`任务: ${item.tasks_due}`}
                />
                <span style={{ fontSize: 11, color: '#666', minWidth: 30 }}>{item.tasks_due}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center' }}>
                <div
                  style={{
                    height: 20,
                    backgroundColor: '#22c55e',
                    borderRadius: 2,
                    minWidth: 2,
                    width: Math.max(2, (item.habit_checkins ?? 0) * 8),
                  }}
                  title={`打卡: ${item.habit_checkins}`}
                />
                <span style={{ fontSize: 11, color: '#666', minWidth: 30 }}>{item.habit_checkins}</span>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 12, color: '#666' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, backgroundColor: '#3b82f6', borderRadius: 2 }} />
              每日任务
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, backgroundColor: '#22c55e', borderRadius: 2 }} />
              打卡数量
            </span>
          </div>
        </div>
      </section>

      {/* 趋势图 */}
      <section className="card">
        <h2 className="section-title">完成趋势</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
              完成任务
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div
                style={{
                  minWidth: Math.max(640, trendData.length * 70),
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 16,
                  padding: '6px 4px 0',
                  height: 160,
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                {trendData.map((item) => {
                  const taskHeight =
                    trendTaskMax > 0 ? (item.completed_tasks / trendTaskMax) * 90 : 0;
                  return (
                    <div
                      key={`${item.date}-tasks`}
                      style={{
                        width: 48,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-end', height: 96 }}>
                        <div
                          title={`完成任务 ${item.completed_tasks}`}
                          style={{
                            width: 16,
                            height: Math.max(2, taskHeight),
                            backgroundColor: '#3b82f6',
                            borderRadius: 4,
                            transition: 'height 0.3s',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        {dayjs(item.date).format('MM-DD')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
              习惯打卡
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div
                style={{
                  minWidth: Math.max(640, trendData.length * 70),
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 16,
                  padding: '6px 4px 0',
                  height: 160,
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                {trendData.map((item) => {
                  const habitHeight =
                    trendHabitMax > 0 ? (item.habit_checkins / trendHabitMax) * 90 : 0;
                  return (
                    <div
                      key={`${item.date}-habits`}
                      style={{
                        width: 48,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-end', height: 96 }}>
                        <div
                          title={`习惯打卡 ${item.habit_checkins}`}
                          style={{
                            width: 16,
                            height: Math.max(2, habitHeight),
                            backgroundColor: '#22c55e',
                            borderRadius: 4,
                            transition: 'height 0.3s',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        {dayjs(item.date).format('MM-DD')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
