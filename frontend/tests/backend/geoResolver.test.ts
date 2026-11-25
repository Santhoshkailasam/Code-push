import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveCountry } = require('../../netlify/functions/geoResolver.cjs');

describe('geoResolver.cjs', () => {
  it('prioritizes Edge CDN GeoIP headers (x-country, cf-ipcountry)', () => {
    expect(resolveCountry({ headers: { 'x-country': 'in' } })).toBe('IN');
    expect(resolveCountry({ headers: { 'CF-IPCountry': 'us' } })).toBe('US');
    expect(resolveCountry({ headers: { 'x-geo-country': 'gb' } })).toBe('GB');
  });

  it('resolves country from query or body parameters', () => {
    expect(resolveCountry({ headers: {} }, { country: 'de' })).toBe('DE');
    expect(resolveCountry({ headers: {} }, {}, { region: 'jp' })).toBe('JP');
  });

  it('resolves country from IANA timezones', () => {
    expect(resolveCountry({ headers: {} }, { timezone: 'Asia/Kolkata' })).toBe('IN');
    expect(resolveCountry({ headers: {} }, { timezone: 'America/New_York' })).toBe('US');
    expect(resolveCountry({ headers: {} }, { timezone: 'Europe/London' })).toBe('GB');
    expect(resolveCountry({ headers: {} }, { timezone: 'Europe/Berlin' })).toBe('DE');
    expect(resolveCountry({ headers: {} }, { timezone: 'Asia/Tokyo' })).toBe('JP');
    expect(resolveCountry({ headers: {} }, { timezone: 'Australia/Sydney' })).toBe('AU');
  });

  it('resolves country from Accept-Language header', () => {
    expect(resolveCountry({ headers: { 'accept-language': 'en-IN,en;q=0.9' } })).toBe('IN');
    expect(resolveCountry({ headers: { 'Accept-Language': 'fr-FR,fr;q=0.8' } })).toBe('FR');
  });

  it('returns UNKNOWN when no geo signals are present', () => {
    expect(resolveCountry({ headers: {} })).toBe('UNKNOWN');
  });
});

