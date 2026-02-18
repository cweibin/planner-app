import React from 'react';

interface CompletionProgressProps {
  total: number;
  done: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showPercentage?: boolean;
}

export const CompletionProgress: React.FC<CompletionProgressProps> = ({
  total,
  done,
  size = 'medium',
  showLabel = true,
  showPercentage = true,
}) => {
  if (total === 0 && done === 0) {
    return (
      <div style={{ fontSize: 10, color: '#9ca3af' }}>
        暂无任务
      </div>
    );
  }

  const rawRate =
    total > 0 ? (done / total) * 100 : done > 0 ? 100 : 0;
  const completionRate = Math.min(rawRate, 100);

  // 确定颜色
  let color = '#9ca3af'; // 灰色 - 0%
  if (completionRate >= 100) {
    color = '#22c55e'; // 绿色 - 100%
  } else if (completionRate >= 50) {
    color = '#3b82f6'; // 蓝色 - ≥50%
  } else if (completionRate > 0) {
    color = '#f59e0b'; // 黄色 - <50%
  }

  // 确定尺寸
  const sizeStyles = {
    small: {
      height: 4,
      fontSize: 9,
      labelFontSize: 10,
    },
    medium: {
      height: 6,
      fontSize: 10,
      labelFontSize: 11,
    },
    large: {
      height: 8,
      fontSize: 11,
      labelFontSize: 12,
    },
  };

  const { height, fontSize, labelFontSize } = sizeStyles[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: labelFontSize, color: '#666' }}>
            完成 {done}/{total}
          </span>
          {showPercentage && (
            <span style={{ fontSize: labelFontSize, fontWeight: 600, color }}>
              {completionRate.toFixed(0)}%
            </span>
          )}
        </div>
      )}

      <div
        style={{
          height,
          borderRadius: 999,
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${completionRate}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {!showLabel && showPercentage && (
        <div style={{ fontSize, textAlign: 'center', color, fontWeight: 600 }}>
          {completionRate.toFixed(0)}%
        </div>
      )}
    </div>
  );
};
