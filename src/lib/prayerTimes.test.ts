import { describe, expect, it } from 'vitest';
import { calculatePrayerTimes, defaultPrayerSettings, getNextPrayer, prayerTimeToMinutes } from './prayerTimes';

describe('prayer time calculation', () => {
  it('menghasilkan urutan waktu yang masuk akal untuk Jakarta', () => {
    const times = calculatePrayerTimes(new Date('2026-07-23T12:00:00+07:00'), defaultPrayerSettings);
    const values = [times.Subuh, times.Dzuhur, times.Ashar, times.Maghrib, times.Isya].map(prayerTimeToMinutes);
    expect(values[0]).toBeGreaterThan(3 * 60);
    expect(values[0]).toBeLessThan(6 * 60);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(values[4]).toBeLessThan(21 * 60);
  });

  it('mengembalikan Subuh besok setelah Isya', () => {
    const times = {
      Subuh: '04.40',
      Dzuhur: '12.00',
      Ashar: '15.20',
      Maghrib: '17.55',
      Isya: '19.05'
    };
    const next = getNextPrayer(times, new Date('2026-07-23T22:00:00+07:00'));
    expect(next).toEqual({ prayer: 'Subuh', time: '04.40', tomorrow: true });
  });
});
