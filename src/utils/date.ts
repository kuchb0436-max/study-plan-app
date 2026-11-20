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

export function getLocalizedDayNames(
  intlLocale = 'en-US',
  width: 'long' | 'short' = 'long'
): string[] {
  // 2024-01-01 is a Monday; 2024-01-07 is Sunday
  try {
    const formatter = new Intl.DateTimeFormat(intlLocale, { weekday: width });
    return Array.from({ length: 7 }, (_, idx) => {
      const dt = new Date(2024, 0, 1 + idx);
      return formatter.format(dt);
    });
  } catch {
    return width === 'long' ? [...DAY_NAMES_FULL] : [...DAY_NAMES_SHORT];
  }
}

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

export function getGreetingKey(
  date: Date = new Date()
): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  const hour = date.getHours();
  if (hour < 12) return 'greetingMorning';
  if (hour < 17) return 'greetingAfternoon';
  return 'greetingEvening';
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatLongDate(date: Date = new Date(), intlLocale = 'en-US'): string {
  try {
    return date.toLocaleDateString(intlLocale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

export function formatShortDate(isoDate: string, intlLocale = 'en-US'): string {
  if (!isValidDateISO(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  try {
    return dt.toLocaleDateString(intlLocale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

export function formatCompactDate(
  isoDate: string,
  intlLocale = 'en-US',
  labels?: { today?: string; tomorrow?: string; yesterday?: string }
): string {
  if (!isValidDateISO(isoDate)) return isoDate;
  const today = toLocalISODate();
  const tomorrow = addDaysToISO(today, 1);
  const yesterday = addDaysToISO(today, -1);
  if (isoDate === today) return labels?.today ?? 'Today';
  if (isoDate === tomorrow) return labels?.tomorrow ?? 'Tomorrow';
  if (isoDate === yesterday) return labels?.yesterday ?? 'Yesterday';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  try {
    return dt.toLocaleDateString(intlLocale, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
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

export function formatTimeDisplay(time24: string, intlLocale = 'en-US'): string {
  if (!isValidTime24(time24)) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  try {
    const dt = new Date(2024, 0, 1, h, m);
    return new Intl.DateTimeFormat(intlLocale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(dt);
  } catch {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${mStr} ${suffix}`;
  }
}

export function addMinutesToTime(time24: string, minutesToAdd: number): string {
  if (!isValidTime24(time24)) return time24;
  const [h, m] = time24.split(':').map(Number);
  const total = (h * 60 + m + minutesToAdd) % (24 * 60);
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export interface DurationFormatters {
  min: (n: number) => string;
  hrs: (h: number) => string;
  hrsMin: (h: number, m: number) => string;
}

export function formatDuration(minutes: number, formatters?: DurationFormatters): string {
  if (minutes < 60) {
    return formatters ? formatters.min(minutes) : `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return formatters ? formatters.hrs(hrs) : `${hrs}h`;
  }
  return formatters ? formatters.hrsMin(hrs, mins) : `${hrs}h ${mins}m`;
}

export interface DayBucket {
  isoDate: string;
  label: string;
  fullLabel: string;
}

export function getLast7Days(intlLocale = 'en-US', todayLabel = 'Today'): DayBucket[] {
  const today = toLocalISODate();
  const buckets: DayBucket[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const iso = addDaysToISO(today, offset);
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    let label: string;
    let fullLabel: string;
    try {
      label = offset === 0 ? todayLabel : dt.toLocaleDateString(intlLocale, { weekday: 'short' });
      fullLabel = dt.toLocaleDateString(intlLocale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      label = offset === 0 ? todayLabel : dt.toLocaleDateString('en-US', { weekday: 'short' });
      fullLabel = dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    buckets.push({
      isoDate: iso,
      label,
      fullLabel,
    });
  }
  return buckets;
}
