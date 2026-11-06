/**
 * ============================================================================
 *  WEDDING INVITATION — CENTRAL CONFIGURATION
 * ============================================================================
 *
 *  This is the single source of truth for every detail that may change.
 *  Edit the values below, save, and refresh. No build step is required.
 *
 *  FINAL EVENT DETAILS
 *  -------------------
 *  After editing these values, run `node tools/sync-static.mjs` to update
 *  static crawler metadata, the no-JS fallback, and the social-image source.
 *  Regenerate `assets/og-image.png` before deployment.
 *
 *  FORMATS
 *  -------
 *  • eventDate: ISO calendar date `YYYY-MM-DD` (Asia/Aden calendar day)
 *  • eventTime: 24-hour `HH:MM` in Yemen local time, e.g. `"20:00"`
 *  • mapsUrl: absolute `https://` Google Maps URL
 *  • calendarDurationMinutes: event length used by the .ics file
 * ============================================================================
 */

export const wedding = {
  /* ── The couple ───────────────────────────────────────────────────────── */
  groomName: 'عبدالله باجري',
  brideName: 'نور باوزير',

  /* ── Date & time ──────────────────────────────────────────────────────── */
  eventDate: '2026-11-24',   // Tuesday, 24 November 2026
  eventTime: '20:00',        // 8:00 PM local time in Yemen
  timeZone: 'Asia/Aden',

  /* ── Place ────────────────────────────────────────────────────────────── */
  city: 'اليمن',
  venueName: 'صالة الزين',
  venueAddress: 'اليمن',
  mapsUrl: 'https://maps.app.goo.gl/ybWj4f9NkbEFLaZQ6?g_st=iw',

  /* ── Words ────────────────────────────────────────────────────────────── */
  invitationMessage:
    'يسعدنا حضوركم ومشاركتنا أجمل لحظاتنا، فوجودكم بيننا يزيد الفرحة بهجة وسرورًا.',
  shareTitle: 'دعوة زفاف عبدالله ونور',
  shareDescription:
    'بكل الحب والفرح، نتشرف بدعوتكم لحضور حفل زواج عبدالله باجري ونور باوزير. الثلاثاء ٢٤ نوفمبر ٢٠٢٦، ٨:٠٠ مساءً — صالة الزين، اليمن.',

  /* ── Calendar ─────────────────────────────────────────────────────────── */
  calendarFileName: 'abdullah-noor-wedding.ics',
  // Duration used only in the downloadable calendar event; adjust if needed.
  calendarDurationMinutes: 180,

  /* ── Review state ─────────────────────────────────────────────────────── */
  demoMode: false, // set true only when showing provisional details
};

/**
 * Optional absolute site URL. Leave empty to use the real current page URL
 * automatically. Set it before running `node tools/sync-static.mjs` so the
 * static canonical / Open Graph URLs can be filled in reliably.
 * Example: 'https://wedding.example.com' (no trailing slash).
 */
export const site = {
  url: 'https://mustafaselim01283.github.io/wedding-invitation',
};
