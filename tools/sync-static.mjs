/**
 * Synchronise the static, crawler-facing copies with js/config.js.
 *
 * Open Graph crawlers do not run JavaScript, so index.html contains a static
 * metadata block, a no-JS fallback, and assets/og-source.html contains static
 * text for the preview artwork. This script updates those copies and the web
 * manifest in one go.
 *
 * Usage:
 *   node tools/sync-static.mjs
 *
 * It is deliberately dependency-free and does not need a build step.
 * It does NOT rasterise the social image; regenerate assets/og-image.png from
 * assets/og-source.html after running it (see README.md).
 */

import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { site, wedding } from '../js/config.js';
import {
  arNumber,
  formatArabicDate,
  formatArabicTime,
  formatNumericDate,
  getEventInstant,
  monogramFor,
  splitCity,
} from '../js/date-utils.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const manifestPath = path.join(root, 'site.webmanifest');
const ogSourcePath = path.join(root, 'assets', 'og-source.html');

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const city = splitCity(wedding.city);
const eventInstant = getEventInstant(wedding);
const dateLabel = formatArabicDate(wedding.eventDate);
const timeLabel = eventInstant
  ? formatArabicTime(eventInstant, wedding.timeZone)
  : '';
const displayDate = [dateLabel, timeLabel].filter(Boolean).join(' · ');
const monogram = monogramFor(wedding.groomName, wedding.brideName);
const year = arNumber(Number(wedding.eventDate.slice(0, 4)));
const demoNote = wedding.demoMode ? ' (تفاصيل مبدئية)' : '';

const configuredUrl = String(site.url ?? '').trim();
const baseUrl = configuredUrl
  ? configuredUrl.replace(/\/+$/, '')
  : 'https://your-domain.example';
const pageUrl = `${baseUrl}/`;
const ogImage = `${baseUrl}/assets/og-image.png`;

const fullNames = `${wedding.groomName} و${wedding.brideName}`;
const title = `${wedding.groomName} و${wedding.brideName} | دعوة زفاف — ${city.name} ${year}`;
const description =
  `بكل الحب والفرح، نتشرف بدعوتكم لحضور حفل زواج ${fullNames}. ` +
  `${dateLabel}${timeLabel ? `، ${timeLabel}` : ''} — ${city.name}.${demoNote}`;
const alt = `دعوة زفاف ${fullNames} — ${dateLabel}${timeLabel ? `، ${timeLabel}` : ''}، ${city.name}`;

const metaBlock = `  <!-- META_SYNC_START -->
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(fullNames)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeHtml(pageUrl)}">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="ar_YE">
  <meta property="og:site_name" content="دعوة زفاف ${escapeHtml(wedding.groomName.split(/\s+/)[0])} و${escapeHtml(wedding.brideName.split(/\s+/)[0])}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(alt)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <meta name="twitter:image:alt" content="${escapeHtml(alt)}">
  <!-- META_SYNC_END -->`;

const venueLine = wedding.venueName
  ? [wedding.venueName, wedding.venueAddress]
      .filter((value, index, all) => value && all.indexOf(value) === index)
      .join(' — ')
  : 'سيتم تحديد القاعة قريبًا';

const fallbackBlock = `    <!-- FALLBACK_SYNC_START -->
    <div class="fallback__card">
      <p class="fallback__eyebrow">دعوة زفاف</p>
      <p class="fallback__monogram" aria-hidden="true">${escapeHtml(monogram)}</p>
      <h1 class="fallback__names">${escapeHtml(wedding.groomName)} <span aria-hidden="true">و</span> ${escapeHtml(wedding.brideName)}</h1>
      <p class="fallback__date">${escapeHtml(displayDate)}</p>
      <p class="fallback__venue">${escapeHtml(venueLine)}</p>
      ${wedding.demoMode ? '<p class="fallback__demo">تفاصيل مبدئية</p>' : ''}
      <p class="fallback__note">لعرض الدعوة التفاعلية والعد التنازلي وروابط الحفل، يرجى فتح الرابط في متصفح حديث مع تفعيل JavaScript.</p>
    </div>
    <!-- FALLBACK_SYNC_END -->`;

function replaceBlock(source, startMarker, endMarker, replacement) {
  const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^[\\t ]*${escapePattern(startMarker)}[\\s\\S]*?^[\\t ]*${escapePattern(endMarker)}`,
    'gm',
  );
  if (!pattern.test(source)) {
    throw new Error(`Could not find ${startMarker} in index.html`);
  }
  return source.replace(pattern, replacement);
}

let index = await readFile(indexPath, 'utf8');
index = replaceBlock(index, '<!-- META_SYNC_START -->', '<!-- META_SYNC_END -->', metaBlock);
index = replaceBlock(
  index,
  '<!-- FALLBACK_SYNC_START -->',
  '<!-- FALLBACK_SYNC_END -->',
  fallbackBlock,
);
await writeFile(indexPath, index, 'utf8');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.name = `دعوة زفاف ${fullNames}`;
manifest.short_name = 'دعوة زفاف';
manifest.description = description;
await writeFile(
  manifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

try {
  await access(ogSourcePath);
  let og = await readFile(ogSourcePath, 'utf8');
  og = og.replace(
    /(data-og="monogram"[^>]*>)[\s\S]*?(<\/p>)/,
    `$1${escapeHtml(monogram)}$2`,
  );
  og = og.replace(
    /(data-og="groom"[^>]*>)[\s\S]*?(<\/span>)/,
    `$1${escapeHtml(wedding.groomName)}$2`,
  );
  og = og.replace(
    /(data-og="bride"[^>]*>)[\s\S]*?(<\/span>)/,
    `$1${escapeHtml(wedding.brideName)}$2`,
  );
  og = og.replace(
    /(data-og="date"[^>]*>)[\s\S]*?(<\/p>)/,
    `$1${escapeHtml(displayDate)}$2`,
  );
  og = og.replace(
    /(data-og="city"[^>]*>)[\s\S]*?(<\/p>)/,
    `$1${escapeHtml(wedding.city)}$2`,
  );
  await writeFile(ogSourcePath, og, 'utf8');
} catch {
  console.warn('assets/og-source.html was not found; skipped preview source.');
}

console.log('Static metadata synced:');
console.log('  • index.html — meta tags + no-JS fallback');
console.log('  • site.webmanifest');
console.log('  • assets/og-source.html');
console.log(`  • display date: ${displayDate}`);
console.log('');
if (!configuredUrl) {
  console.warn(
    'WARNING: site.url is empty; placeholder URLs were written. Set site.url in js/config.js before deployment.',
  );
} else {
  console.log(`  • deployment URL: ${baseUrl}`);
}
console.log('');
console.log('Next: regenerate assets/og-image.png from assets/og-source.html at 1200×630,');
console.log('then test the link preview in WhatsApp after deploying.');
