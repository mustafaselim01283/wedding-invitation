/**
 * Minimal, dependency-free .ics builder for the wedding event.
 *
 * The exact end time has not been confirmed. The calendar entry therefore uses
 * `calendarDurationMinutes` from config as a clearly documented duration.
 * Update it if the planned event duration changes.
 */

import { getEventInstant, parseISODate, parseTime } from './date-utils.js';

const encoder = new TextEncoder();

function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** RFC 5545 recommends folding lines at 75 octets, without splitting UTF-8. */
function foldLine(line) {
  let result = '';
  let current = '';
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 73 && current) {
      result += `${current}\r\n `;
      current = '';
      bytes = 1; // continuation line starts with a space
    }
    current += character;
    bytes += size;
  }
  return result + current;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function toLocalICSDate(date, time) {
  return (
    `${date.year}${pad(date.month)}${pad(date.day)}` +
    `T${pad(time.hour)}${pad(time.minute)}00`
  );
}

function toUtcICSDate(date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * @param {object} options
 * @param {typeof import('./config.js').wedding} options.wedding
 * @param {string} [options.pageUrl]
 * @returns {string} an RFC 5545 calendar, or '' when no time is confirmed.
 */
export function buildWeddingICS({ wedding, pageUrl = '' }) {
  if (!wedding?.eventTime) return '';

  const date = parseISODate(wedding.eventDate);
  const time = parseTime(wedding.eventTime);
  const instant = getEventInstant(wedding);
  if (!date || !time || !instant) return '';

  const summary = `حفل زواج ${wedding.groomName} و${wedding.brideName}`;
  const location = [wedding.venueName, wedding.venueAddress, wedding.city]
    .filter((value, index, all) => value && all.indexOf(value) === index)
    .join('، ');
  const description = [
    wedding.invitationMessage,
    pageUrl ? `رابط الدعوة: ${pageUrl}` : '',
    wedding.demoMode ? 'الموعد والموقع الحاليان مبدئيان حتى التأكيد النهائي.' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const durationMinutes = Math.max(
    0,
    Math.round(Number(wedding.calendarDurationMinutes) || 0),
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Abdullah & Noor Wedding//Arabic Invitation//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    `TZID:${wedding.timeZone}`,
    `X-LIC-LOCATION:${wedding.timeZone}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0300',
    'TZNAME:+03',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:wedding-${wedding.eventDate.replaceAll('-', '')}@wedding-invitation`,
    `DTSTAMP:${toUtcICSDate(new Date())}`,
    `DTSTART;TZID=${wedding.timeZone}:${toLocalICSDate(date, time)}`,
    durationMinutes ? `DURATION:PT${durationMinutes}M` : '',
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    location ? `LOCATION:${escapeText(location)}` : '',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** Trigger a local download. The blob stays entirely in the browser. */
export function downloadICS(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'wedding-invitation.ics';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3_000);
}
