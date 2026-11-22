// Dynamic Geolocation Resolver for Netlify Functions (Zero Hardcoded Fallbacks)
function resolveCountry(event, query = {}, body = {}) {
  const headers = event.headers || {};

  // 1. Edge CDN GeoIP Header (Netlify & Cloudflare inject this on real production requests)
  const edgeCountry =
    headers['x-country'] ||
    headers['X-Country'] ||
    headers['cf-ipcountry'] ||
    headers['CF-IPCountry'] ||
    headers['x-country-code'] ||
    headers['x-geo-country'] ||
    headers['x-client-country'];

  if (edgeCountry && typeof edgeCountry === 'string' && edgeCountry.trim().length === 2) {
    return edgeCountry.trim().toUpperCase();
  }

  // 2. Client-provided explicit Country Parameter
  const paramCountry = query.country || query.region || body.country || body.region;
  if (paramCountry && typeof paramCountry === 'string' && paramCountry.trim().length === 2) {
    return paramCountry.trim().toUpperCase();
  }

  // 3. Client Timezone Resolution (IANA Timezones)
  const tz = (query.timezone || body.timezone || headers['x-timezone'] || '').trim();
  if (tz) {
    if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('India')) return 'IN';
    if (
      tz.startsWith('America/New_York') ||
      tz.startsWith('America/Chicago') ||
      tz.startsWith('America/Los_Angeles') ||
      tz.startsWith('America/Denver') ||
      tz.startsWith('America/Phoenix')
    ) {
      return 'US';
    }
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Europe/Berlin') || tz.startsWith('Europe/Frankfurt')) return 'DE';
    if (tz.startsWith('Europe/Paris')) return 'FR';
    if (tz.startsWith('Asia/Tokyo')) return 'JP';
    if (tz.startsWith('Asia/Singapore')) return 'SG';
    if (tz.startsWith('Asia/Dubai')) return 'AE';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('America/Sao_Paulo')) return 'BR';
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver')) return 'CA';
    if (tz.startsWith('Europe/Amsterdam')) return 'NL';
  }

  // 4. Accept-Language Header (e.g. "en-IN,en;q=0.9", "en-US", "ja-JP")
  const acceptLang = (headers['accept-language'] || headers['Accept-Language'] || '').toLowerCase();
  const langMatch = acceptLang.match(/[a-z]{2}-([a-z]{2})/i);
  if (langMatch && langMatch[1]) {
    const code = langMatch[1].toUpperCase();
    if (code !== 'UN' && code.length === 2) return code;
  }

  // 5. If completely unresolvable, return 'UNKNOWN' (no hardcoded fallback)
  return 'UNKNOWN';
}

module.exports = { resolveCountry };
