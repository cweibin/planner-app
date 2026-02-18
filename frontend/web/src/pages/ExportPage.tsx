import React, { useState } from 'react';
import dayjs from 'dayjs';
import { exportTasks, exportEvents, exportHabits, exportAll, downloadBlob } from '../services/export';

export const ExportPage: React.FC = () => {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleExport = async (
    type: 'tasks' | 'events' | 'habits' | 'all',
    exporter: () => Promise<Blob>,
    defaultName: string,
  ) => {
    setLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const blob = await exporter();
      const filename = `${defaultName}_${dayjs().format('YYYYMMDD_HHmmss')}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      downloadBlob(blob, filename);
    } catch (error) {
      window.alert(`导出${type}失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleExportTasks = () => {
    handleExport(
      'tasks',
      () => exportTasks(format, startDate, endDate),
      'tasks_export',
    );
  };

  const handleExportEvents = () => {
    handleExport(
      'events',
      () => exportEvents(format, startDate, endDate),
      'events_export',
    );
  };

  const handleExportHabits = () => {
    handleExport(
      'habits',
      () => exportHabits(format),
      'habits_export',
    );
  };

  const handleExportAll = () => {
    handleExport(
      'all',
      () => exportAll('excel', startDate, endDate),
      'planner_export',
    );
  };

  return (
    <div>
      <h1 className="page-title">数据导出</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">导出设置</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={labelStyle}>导出格式</label>
              <select
                className="input"
                value={format}
                onChange={(e) => setFormat(e.target.value as 'csv' | 'excel')}
              >
                <option value="csv">CSV 文件 (.csv)</option>
                <option value="excel">Excel 文件 (.xlsx)</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={labelStyle}>开始日期 (可选)</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={labelStyle}>结束日期 (可选)</label>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <p style={hintStyle}>
            提示：设置日期范围可筛选特定时间段的数据。若不设置日期范围，则导出全部数据。
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">导出选项</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <ExportCard
            title="任务数据"
            description="导出所有任务信息，包括标题、描述、状态、截止日期等"
            onExport={handleExportTasks}
            loading={loading.tasks}
            format={format}
          />
          <ExportCard
            title="日程数据"
            description="导出所有日程信息，包括标题、时间、地点、重复规则等"
            onExport={handleExportEvents}
            loading={loading.events}
            format={format}
          />
          <ExportCard
            title="习惯数据"
            description="导出所有习惯信息，包括名称、目标、状态、累计打卡次数等"
            onExport={handleExportHabits}
            loading={loading.habits}
            format={format}
          />
          <ExportCard
            title="全部数据"
            description="导出全部数据（仅 Excel 格式），包含任务、日程、习惯、统计多个工作表"
            onExport={handleExportAll}
            loading={loading.all}
            format="excel"
          />
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">导出说明</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={descriptionStyle}>
            <strong>CSV 格式</strong>：通用文本格式，可用 Excel、Numbers、Google Sheets 等软件打开，适用于简单数据交换。
          </p>
          <p style={descriptionStyle}>
            <strong>Excel 格式</strong>：支持多工作表、格式化和公式，适用于复杂数据分析和存档。
          </p>
          <p style={descriptionStyle}>
            <strong>日期范围</strong>：用于筛选特定时间段的数据。不设置日期范围时导出全部数据。
          </p>
          <p style={descriptionStyle}>
            <strong>全部数据导出</strong>：仅支持 Excel 格式，生成包含多个工作表的综合文件。
          </p>
        </div>
      </div>
    </div>
  );
};

interface ExportCardProps {
  title: string;
  description: string;
  onExport: () => void;
  loading: boolean;
  format: 'csv' | 'excel';
}

const ExportCard: React.FC<ExportCardProps> = ({ title, description, onExport, loading, format }) => {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666', minHeight: 40 }}>
        {description}
      </p>
      <button
        className="button"
        onClick={onExport}
        disabled={loading}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading ? `导出${format === 'csv' ? 'CSV' : 'Excel'}中...` : `导出${format === 'csv' ? 'CSV' : 'Excel'}`}
      </button>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#6b7280',
};

const descriptionStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: '#374151',
  lineHeight: 1.6,
};
