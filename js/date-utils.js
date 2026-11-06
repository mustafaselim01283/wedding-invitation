/**
 * Date, time and Arabic text helpers.
 *
 * The wedding date is a *calendar date* in its configured local timezone. It is
 * intentionally kept separate from an exact instant unless `eventTime` is
 * configured, so the countdown never invents an unconfirmed time.
 */

const AR_DIGITS = new Intl.NumberFormat('ar-SA', { useGrouping: false });

/** 17 → "١٧" */
export function arNumber(value) {
  return AR_DIGITS.format(value);
}

/** "2026-11-24" → { year: 2026, month: 11, day: 24 } (or null) */
export function parseISODate(iso) {
  if (typeof iso !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** "HH:MM" (24h) → { hour, minute } (or null) */
export function parseTime(value) {
  if (typeof value !== 'string') return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** A Date at 12:00 UTC — a safe anchor for pure calendar-date formatting. */
function dateAnchor(iso) {
  const parts = parseISODate(iso);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
}

/** "2026-11-24" → "الثلاثاء ٢٤ نوفمبر ٢٠٢٦" */
export function formatArabicDate(iso) {
  const anchor = dateAnchor(iso);
  if (!anchor) return '';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(anchor).replace('، ', ' ');
}

/** "2026-11-24" → Hijri calendar date */
export function formatHijriDate(iso) {
  const anchor = dateAnchor(iso);
  if (!anchor) return '';
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(anchor);
  } catch {
    return '';
  }
}

/** "2026-11-24" → "١٤٤٨ هـ" */
export function formatHijriYear(iso) {
  const anchor = dateAnchor(iso);
  if (!anchor) return '';
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      year: 'numeric',
      timeZone: 'UTC',
    }).format(anchor);
  } catch {
    return '';
  }
}

/** "2026-11-24" → "٢٤ · ١١ · ٢٠٢٦" */
export function formatNumericDate(iso) {
  const parts = parseISODate(iso);
  if (!parts) return '';
  return `${arNumber(parts.day)} · ${arNumber(parts.month)} · ${arNumber(parts.year)}`;
}

/** A real instant → "٧:٣٠ م" in the supplied timezone. */
export function formatArabicTime(date, timeZone) {
  return new Intl.DateTimeFormat('ar-SA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(date);
}

/** Calendar date in a specific timezone, as "YYYY-MM-DD". */
export function dateStampInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Whole calendar days from `fromISO` to `toISO` (can be negative). */
export function daysBetween(fromISO, toISO) {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  if (!from || !to) return 0;
  const fromUTC = Date.UTC(from.year, from.month - 1, from.day);
  const toUTC = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUTC - fromUTC) / 86_400_000);
}

/**
 * Milliseconds that a timezone is ahead of UTC at a given instant.
 * Handles DST changes for the configured local timezone.
 */
function timeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  const ms = date.getTime();
  return asUTC - (ms - (ms % 1000));
}

/** Convert a wall-clock time in `timeZone` into a real UTC instant. */
export function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const wallClockAsUTC = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = timeZoneOffsetMs(new Date(wallClockAsUTC), timeZone);
  let timestamp = wallClockAsUTC - firstOffset;
  const secondOffset = timeZoneOffsetMs(new Date(timestamp), timeZone);
  if (secondOffset !== firstOffset) {
    timestamp = wallClockAsUTC - secondOffset;
  }
  return new Date(timestamp);
}

/** The confirmed wedding instant, or null while the time is unknown. */
export function getEventInstant({ eventDate, eventTime, timeZone }) {
  const date = parseISODate(eventDate);
  const time = parseTime(eventTime);
  if (!date || !time) return null;
  return zonedTimeToUtc(
    date.year,
    date.month,
    date.day,
    time.hour,
    time.minute,
    timeZone,
  );
}

/**
 * The state of the countdown.
 *
 * modes:
 *  'days'  – truthful calendar-day countdown (time not confirmed yet)
 *  'live'  – real time remaining (time confirmed and still in the future)
 *  'today' – the wedding calendar date, no time configured
 *  'past'  – the celebration has begun / passed
 */
export function getCountdownState({
  eventDate,
  eventTime,
  timeZone,
  now = new Date(),
}) {
  const instant = getEventInstant({ eventDate, eventTime, timeZone });

  if (instant) {
    const remaining = instant.getTime() - now.getTime();
    if (remaining <= 0) {
      return { mode: 'past', instant };
    }
    const totalSeconds = Math.floor(remaining / 1000);
    return {
      mode: 'live',
      instant,
      days: Math.floor(totalSeconds / 86_400),
      hours: Math.floor((totalSeconds % 86_400) / 3_600),
      minutes: Math.floor((totalSeconds % 3_600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  const today = dateStampInTimeZone(now, timeZone);
  const days = daysBetween(today, eventDate);
  if (days > 0) return { mode: 'days', days };
  if (days === 0) return { mode: 'today' };
  return { mode: 'past' };
}

/** A grammatically comfortable Arabic unit for the day-based countdown. */
export function arabicDayUnit(days) {
  if (days === 1) return 'يوم';
  if (days === 2) return 'يومان';
  if (days >= 3 && days <= 10) return 'أيام';
  return 'يومًا';
}

/** "اليمن" → { name: "اليمن", country: "" } */
export function splitCity(city) {
  const value = String(city ?? '').trim();
  if (!value) return { name: '', country: '' };
  const parts = value.split(/[،,]/).map((part) => part.trim()).filter(Boolean);
  return {
    name: parts[0] ?? '',
    country: parts.slice(1).join('، '),
  };
}

/** "عبدالله باجري" → "عبدالله" */
export function firstName(fullName) {
  return String(fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

/** "عبدالله باجري" → "ع" */
export function initialOf(fullName) {
  return Array.from(firstName(fullName))[0] ?? '';
}

/** Initials for the configured couple. */
export function monogramFor(groomName, brideName) {
  const groom = initialOf(groomName);
  const bride = initialOf(brideName);
  return [groom, bride].filter(Boolean).join(' · ');
}
