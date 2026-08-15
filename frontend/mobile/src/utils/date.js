const pad = (n) => String(n).padStart(2, '0');

// 北京时间组件（UTC+8），不依赖 Intl.DateTimeFormat 的 timeZone（电脑端微信不可靠）
function beijingParts(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const t = new Date(date.getTime() + 8 * 3600 * 1000);
  return {
    y: t.getUTCFullYear(),
    mo: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    h: t.getUTCHours(),
    mi: t.getUTCMinutes(),
  };
}

function ymd(date) {
  const p = beijingParts(date);
  return p ? `${p.y}-${pad(p.mo)}-${pad(p.d)}` : '';
}

function ymdhm(date) {
  const p = beijingParts(date);
  return p ? `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}` : '';
}

function hm(date) {
  const p = beijingParts(date);
  return p ? `${pad(p.h)}:${pad(p.mi)}` : '';
}

export function formatDate(date) {
  return ymd(date);
}

export function parseDateTime(value) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const hasZone = /Z|[+-]\d{2}:?\d{2}$/.test(normalized);
  const withZone = hasZone ? normalized : `${normalized}+08:00`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function parseDateTimeFromUtc(value) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const hasZone = /Z|[+-]\d{2}:?\d{2}$/.test(normalized);
  if (!normalized.includes('T')) {
    const date = new Date(`${normalized}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const withZone = hasZone ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isBeijingTimezone() {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz === 'Asia/Shanghai';
    } catch (e) {}
  }
  return new Date().getTimezoneOffset() === -480;
}

export function formatBeijingDateTime(value) {
  const date = parseDateTime(value);
  return date ? ymdhm(date) : '';
}

export function formatBeijingDateTimeFromUtc(value) {
  const date = parseDateTimeFromUtc(value);
  return date ? ymdhm(date) : '';
}

export function formatBeijingDate(value) {
  const date = parseDateTime(value);
  return date ? ymd(date) : '';
}

export function formatBeijingDateFromUtc(value) {
  const date = parseDateTimeFromUtc(value);
  return date ? ymd(date) : '';
}

export function formatBeijingTime(value) {
  const date = parseDateTime(value);
  return date ? hm(date) : '';
}

export function getBeijingNowParts() {
  const p = beijingParts(new Date());
  return p ? { date: `${p.y}-${pad(p.mo)}-${pad(p.d)}`, time: `${pad(p.h)}:${pad(p.mi)}` } : { date: '', time: '' };
}

export function formatBeijingTimeFromUtc(value) {
  const date = parseDateTimeFromUtc(value);
  return date ? hm(date) : '';
}
