import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const BEIJING_TZ = 'Asia/Shanghai';
const HAS_ZONE = /Z|[+-]\d{2}:?\d{2}$/;

type DateLike = string | Date | Dayjs | null | undefined;

export const toBeijing = (value: DateLike) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) {
    return value.tz(BEIJING_TZ);
  }
  if (value instanceof Date) {
    return dayjs(value).tz(BEIJING_TZ);
  }
  const raw = String(value);
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const base = HAS_ZONE.test(normalized)
    ? dayjs(normalized)
    : dayjs.tz(normalized, BEIJING_TZ);
  return base.tz(BEIJING_TZ);
};

export const nowBeijing = () => dayjs().tz(BEIJING_TZ);

export const formatBeijing = (value: DateLike, format = 'YYYY-MM-DD HH:mm') => {
  const date = toBeijing(value);
  return date ? date.format(format) : '';
};

export const toBeijingFromUtc = (value: DateLike) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) {
    return value.utc().tz(BEIJING_TZ);
  }
  if (value instanceof Date) {
    return dayjs(value).tz(BEIJING_TZ);
  }
  const raw = String(value);
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const base = HAS_ZONE.test(normalized) ? dayjs(normalized) : dayjs.utc(normalized);
  return base.tz(BEIJING_TZ);
};

export const formatBeijingFromUtc = (value: DateLike, format = 'YYYY-MM-DD HH:mm') => {
  const date = toBeijingFromUtc(value);
  return date ? date.format(format) : '';
};

export const isBeijingTimezone = () => {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz === BEIJING_TZ;
  }
  return new Date().getTimezoneOffset() === -480;
};

export const formatBeijingDate = (value: DateLike, format = 'YYYY-MM-DD') =>
  formatBeijing(value, format);

export const formatBeijingTime = (value: DateLike, format = 'HH:mm') =>
  formatBeijing(value, format);

export const buildBeijingDateTime = (
  dateStr: string,
  timeStr: string,
  format = 'YYYY-MM-DDTHH:mm:00',
) => {
  if (!dateStr || !timeStr) return '';
  return dayjs.tz(`${dateStr}T${timeStr}`, BEIJING_TZ).format(format);
};
