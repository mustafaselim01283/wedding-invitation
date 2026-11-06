/**
 * Wedding invitation behaviour.
 *
 * Two states:
 *   1. a closed envelope, opened only by an explicit user action;
 *   2. a two-page booklet on desktop / a continuous scrollable invitation
 *      and details flow on mobile.
 */

import { site, wedding } from './config.js';
import {
  arNumber,
  formatArabicDate,
  formatArabicTime,
  formatHijriDate,
  formatNumericDate,
  getCountdownState,
  getEventInstant,
  monogramFor,
  parseISODate,
  parseTime,
  splitCity,
} from './date-utils.js';
import { buildWeddingICS, downloadICS } from './ics.js';

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const compactQuery = window.matchMedia(
  '(max-width: 759px), (max-height: 560px)',
);

const select = (selector, scope = document) => scope.querySelector(selector);
const selectAll = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];

/* ──────────────────────────────────────────────────────────────────────────
   Content model
   ────────────────────────────────────────────────────────────────────────── */

const validDate = Boolean(parseISODate(wedding.eventDate));
const validTime = Boolean(parseTime(wedding.eventTime));
const cityParts = splitCity(wedding.city);
const monogram = monogramFor(wedding.groomName, wedding.brideName);
const eventInstant = getEventInstant(wedding);
const eventHasPassed = Boolean(eventInstant && eventInstant.getTime() <= Date.now());
const calendarAvailable = Boolean(eventInstant) && !eventHasPassed;

const fullDate = validDate ? formatArabicDate(wedding.eventDate) : '';
const dateAnchor = validDate ? new Date(`${wedding.eventDate}T12:00:00Z`) : null;
const weekdayLabel = dateAnchor
  ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(dateAnchor)
  : '';
const dateMain = fullDate.replace(`${weekdayLabel} `, '');

const values = {
  groomName: wedding.groomName,
  brideName: wedding.brideName,
  shortNames: `${wedding.groomName.split(/\s+/)[0]} و${
    wedding.brideName.split(/\s+/)[0]
  }`,
  monogram,
  invitationMessage: wedding.invitationMessage,
  weekdayLabel: weekdayLabel || 'الموعد',
  dateMain: dateMain || 'سيُعلن قريبًا',
  hijriDate: validDate ? formatHijriDate(wedding.eventDate) : '',
  numericDate: validDate ? formatNumericDate(wedding.eventDate) : '',
  yearLabel: validDate ? arNumber(Number(wedding.eventDate.slice(0, 4))) : '',
  city: wedding.city,
  cityName: cityParts.name,
  country: cityParts.country,
  venueName: wedding.venueName || 'سيتم تحديد القاعة قريبًا',
  venueAddress: wedding.venueName
    ? wedding.venueAddress || cityParts.country
    : 'سيتم إضافة الموقع قريبًا',
  timeLabel:
    validTime && eventInstant
      ? formatArabicTime(eventInstant, wedding.timeZone)
      : 'سيتم تحديد الموعد قريبًا',
  timeNote:
    validTime && eventInstant ? `بتوقيت ${cityParts.name}` : 'بانتظار تأكيد الموعد',
};

function bindContent() {
  selectAll('[data-bind]').forEach((element) => {
    const key = element.dataset.bind;
    if (Object.prototype.hasOwnProperty.call(values, key) && values[key] != null) {
      element.textContent = values[key];
    }
  });

  selectAll('[data-bind-date]').forEach((element) => {
    if (validDate) element.setAttribute('datetime', wedding.eventDate);
  });

  selectAll('[data-bind-time]').forEach((element) => {
    if (eventInstant) element.setAttribute('datetime', eventInstant.toISOString());
  });

  const envelopeButton = select('.envelope-object');
  if (envelopeButton) {
    envelopeButton.setAttribute(
      'aria-label',
      `افتح دعوة زفاف ${wedding.groomName} و${wedding.brideName}`,
    );
  }

  selectAll('[data-demo-badge], [data-demo-note]').forEach((element) => {
    element.hidden = !wedding.demoMode;
  });
}

/* ──────────────────────────────────────────────────────────────────────────
   Opening experience
   ────────────────────────────────────────────────────────────────────────── */

function initialiseExperience() {
  const experience = select('#experience');
  const scene = select('#envelope-scene');
  const booklet = select('#booklet');
  const envelopeButton = select('.envelope-object');
  const openButtons = selectAll('[data-open-invitation]');
  if (!experience || !scene || !booklet) return;

  let opened = false;
  let timers = [];

  const clearTimers = () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  };

  const focusOpenedState = () => {
    const target = select('#page-invitation');
    window.requestAnimationFrame(() => {
      target?.focus({ preventScroll: true });
    });
  };

  const finishOpen = () => {
    scene.hidden = true;
    booklet.removeAttribute('inert');
    booklet.removeAttribute('aria-hidden');
    experience.classList.add('is-finished');
    experience.removeAttribute('aria-busy');
    experience.scrollTop = 0;
    focusOpenedState();
  };

  const openInvitation = ({ instant = false } = {}) => {
    if (opened) return;
    opened = true;
    clearTimers();

    const instantMode = instant || reduceMotion.matches;
    experience.classList.add('is-opening');
    experience.setAttribute('aria-busy', 'true');
    openButtons.forEach((button) => {
      button.disabled = true;
    });

    if (instantMode) {
      experience.classList.add('is-unfolding', 'is-open', 'is-instant');
      finishOpen();
      return;
    }

    // Keep the staged hand-off clean: flap/letter first, then the booklet
    // appears folded, unfolds, and finally becomes interactive.
    timers.push(
      window.setTimeout(() => experience.classList.add('is-unfolding'), 960),
    );
    timers.push(
      window.setTimeout(() => experience.classList.add('is-open'), 1120),
    );
    timers.push(window.setTimeout(finishOpen, 2200));
  };

  openButtons.forEach((button) => {
    button.addEventListener('click', () => openInvitation());
  });

  envelopeButton?.addEventListener('keydown', (event) => {
    if (opened || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    openInvitation();
  });

  document.addEventListener('keydown', (event) => {
    if (opened || event.key !== 'Escape') return;
    event.preventDefault();
    openInvitation({ instant: true });
  });

  // Focus the large envelope control for keyboard and screen-reader visitors,
  // but never open anything automatically.
  window.setTimeout(() => {
    if (!opened) envelopeButton?.focus({ preventScroll: true });
  }, 500);
}

/* ──────────────────────────────────────────────────────────────────────────
   Mobile scroll flow
   ────────────────────────────────────────────────────────────────────────── */

function initialiseMobileFlow() {
  const cue = select('[data-scroll-details]');
  const cueWrap = select('[data-flow-cue]');
  const details = select('#page-details');
  const experience = select('#experience');
  if (!cue || !details) return;

  const revealDetails = () => {
    details.scrollIntoView({
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
      block: 'start',
    });
    details.focus({ preventScroll: true });
  };

  let frame = 0;
  const updateCue = () => {
    frame = 0;
    const reached = details.getBoundingClientRect().top <= window.innerHeight * 0.55;
    cueWrap?.classList.toggle('is-hidden', reached);
    cue.setAttribute('aria-hidden', String(reached));
    cue.tabIndex = reached ? -1 : 0;
    if (reached && cueWrap?.contains(document.activeElement)) {
      details.focus({ preventScroll: true });
    }
  };
  const scheduleCueUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(updateCue);
  };

  cue.addEventListener('click', revealDetails);
  cue.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
      return;
    }
    event.preventDefault();
    revealDetails();
  });

  experience?.addEventListener('scroll', scheduleCueUpdate, { passive: true });
  window.addEventListener('resize', scheduleCueUpdate);
  updateCue();
}

function resetViewportState() {
  const experience = select('#experience');
  ['#page-invitation', '#page-details'].forEach((selector) => {
    const page = select(selector);
    page?.removeAttribute('inert');
    page?.removeAttribute('aria-hidden');
  });
  if (experience && !compactQuery.matches) experience.scrollTop = 0;
}

/* ──────────────────────────────────────────────────────────────────────────
   Countdown
   ────────────────────────────────────────────────────────────────────────── */

function initialiseCountdown() {
  const countdown = select('[data-countdown]');
  if (!countdown) return;

  const label = select('[data-countdown-label]', countdown);
  const grid = select('[data-countdown-grid]', countdown);
  const message = select('[data-countdown-message]', countdown);
  const sr = select('[data-countdown-sr]', countdown);
  const cells = {
    days: select('[data-cd-days]', countdown),
    hours: select('[data-cd-hours]', countdown),
    minutes: select('[data-cd-minutes]', countdown),
    seconds: select('[data-cd-seconds]', countdown),
  };
  const calendarButton = select('[data-calendar]');

  const pad = (value) => arNumber(value).padStart(2, '٠');

  const render = () => {
    if (!validDate || !validTime) {
      if (grid) grid.hidden = true;
      if (message) {
        message.hidden = false;
        message.textContent = 'سيتم تحديد الموعد قريبًا بإذن الله.';
      }
      if (label) label.textContent = 'الموعد';
      if (sr) sr.textContent = 'سيتم الإعلان عن موعد الحفل قريبًا.';
      return;
    }

    const state = getCountdownState(wedding);

    if (state.mode === 'live') {
      if (grid) grid.hidden = false;
      if (message) message.hidden = true;
      if (label) label.textContent = 'باقي على الفرح';
      cells.days.textContent = pad(state.days);
      cells.hours.textContent = pad(state.hours);
      cells.minutes.textContent = pad(state.minutes);
      cells.seconds.textContent = pad(state.seconds);
      if (sr) {
        sr.textContent = `باقي على حفل الزفاف ${state.days} يوم و${state.hours} ساعة و${state.minutes} دقيقة.`;
      }
      return;
    }

    // After the event, or if no live time is available.
    if (grid) grid.hidden = true;
    if (message) {
      message.hidden = false;
      message.textContent =
        state.mode === 'past'
          ? 'بارك الله لهما وبارك عليهما وجمع بينهما في خير.'
          : 'نسأل الله أن يتمم لنا الفرح على خير.';
    }
    if (label) label.textContent = state.mode === 'past' ? 'دامت الأفراح' : 'اليوم الموعود';
    if (sr) sr.textContent = 'بارك الله لهما وبارك عليهما وجمع بينهما في خير.';
    if (calendarButton) calendarButton.hidden = true;
  };

  render();
  window.setInterval(render, validTime ? 1000 : 60_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });
}

/* ──────────────────────────────────────────────────────────────────────────
   Location
   ────────────────────────────────────────────────────────────────────────── */

function safeHttpUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch {
    return '';
  }
}

function initialiseLocation() {
  const mapLink = select('[data-map-link]');
  const demoNote = select('[data-demo-note]');
  const mapsHref = safeHttpUrl(wedding.mapsUrl);

  if (mapLink && mapsHref) {
    mapLink.href = mapsHref;
    mapLink.hidden = false;
  }

  if (demoNote) {
    demoNote.hidden = !wedding.demoMode;
    demoNote.textContent = mapsHref
      ? `الموقع المعروض تقريبي — يفتح ${wedding.city}`
      : 'سيتم إضافة موقع القاعة بعد التأكيد';
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Sharing
   ────────────────────────────────────────────────────────────────────────── */

function invitationUrl() {
  const configured = String(site.url ?? '').trim();
  if (configured) {
    try {
      return new URL(configured).href;
    } catch {
      /* Use the real URL below. */
    }
  }
  const url = new URL(window.location.href);
  url.hash = '';
  return url.href;
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* Try the legacy path. */
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function initialiseSharing() {
  const button = select('[data-share]');
  const status = select('[data-share-status]');
  if (!button || !status) return;

  const setStatus = (message, state = '') => {
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  };

  button.addEventListener('click', async () => {
    const url = invitationUrl();
    const shareData = {
      title: wedding.shareTitle,
      text: wedding.shareDescription,
      url,
    };

    setStatus('');
    button.disabled = true;

    try {
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          setStatus('شكرًا لمشاركتك الدعوة.', 'success');
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
          // Fall through to the clipboard for browsers that expose but refuse share.
        }
      }

      const copied = await copyText(url);
      if (copied) {
        setStatus('تم نسخ رابط الدعوة. شاركه مع من تحب.', 'success');
      } else {
        setStatus(
          'تعذّر النسخ تلقائيًا. يمكنك نسخ الرابط من شريط عنوان المتصفح.',
          'error',
        );
      }
    } finally {
      button.disabled = false;
    }
  });
}

/* ──────────────────────────────────────────────────────────────────────────
   Calendar
   ────────────────────────────────────────────────────────────────────────── */

function initialiseCalendar() {
  const button = select('[data-calendar]');
  const status = select('[data-share-status]');
  if (!button) return;

  if (!calendarAvailable) {
    button.hidden = true;
    return;
  }

  button.addEventListener('click', () => {
    const content = buildWeddingICS({ wedding, pageUrl: invitationUrl() });
    if (!content) return;
    downloadICS(wedding.calendarFileName, content);
    if (status) {
      status.textContent = 'تم تنزيل ملف الموعد. افتحه لإضافته إلى تقويمك.';
      status.dataset.state = 'success';
    }
  });
}

/* ──────────────────────────────────────────────────────────────────────────
   Boot
   ────────────────────────────────────────────────────────────────────────── */

function init() {
  root.classList.add('js');
  root.classList.remove('boot-failed');
  bindContent();
  initialiseCountdown();
  initialiseLocation();
  initialiseSharing();
  initialiseCalendar();
  initialiseExperience();
  initialiseMobileFlow();
  compactQuery.addEventListener('change', resetViewportState);
  root.setAttribute('data-ready', '');
}

try {
  init();
} catch (error) {
  // boot.js shows the readable fallback if initialisation fails.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.error(error);
  }
}
