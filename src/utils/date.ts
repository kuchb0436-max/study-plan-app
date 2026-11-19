export const DAY_NAMES_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function toLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toLocalISODate(dt);
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(isoDate: string): string {
  if (!isValidDateISO(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCompactDate(isoDate: string): string {
  if (!isValidDateISO(isoDate)) return isoDate;
  const today = toLocalISODate();
  const tomorrow = addDaysToISO(today, 1);
  const yesterday = addDaysToISO(today, -1);
  if (isoDate === today) return 'Today';
  if (isoDate === tomorrow) return 'Tomorrow';
  if (isoDate === yesterday) return 'Yesterday';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function daysUntil(isoDate: string): number {
  const todayStr = toLocalISODate();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [ey, em, ed] = isoDate.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const targetUtc = Date.UTC(ey, em - 1, ed);
  return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

// Convert JS getDay() (0=Sun..6=Sat) to 0=Mon..6=Sun
export function getTodayWeekdayIndex(date: Date = new Date()): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function isValidDateISO(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function isValidTime24(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function formatTimeDisplay(time24: string): string {
  if (!isValidTime24(time24)) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
}

export function addMinutesToTime(time24: string, minutesToAdd: number): string {
  if (!isValidTime24(time24)) return time24;
  const [h, m] = time24.split(':').map(Number);
  const total = (h * 60 + m + minutesToAdd) % (24 * 60);
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}

export interface DayBucket {
  isoDate: string;
  label: string;
  fullLabel: string;
}

export function getLast7Days(): DayBucket[] {
  const today = toLocalISODate();
  const buckets: DayBucket[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const iso = addDaysToISO(today, offset);
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    buckets.push({
      isoDate: iso,
      label: offset === 0 ? 'Today' : dt.toLocaleDateString('en-US', { weekday: 'short' }),
      fullLabel: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    });
  }
  return buckets;
}
