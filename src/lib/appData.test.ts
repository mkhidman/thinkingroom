import { describe, expect, it } from 'vitest';
import { createEmptyData } from '../data/empty';
import { isAppData } from './appData';

describe('AppData validation', () => {
  it('menerima workspace kosong dan prayer settings yang valid', () => {
    expect(isAppData({
      ...createEmptyData(),
      prayerSettings: {
        locationName: 'Jakarta',
        latitude: -6.2,
        longitude: 106.8,
        timezone: 7,
        fajrAngle: 20,
        ishaAngle: 18,
        asrShadowFactor: 1
      }
    })).toBe(true);
  });

  it('menolak nested task dan transaksi yang rusak', () => {
    expect(isAppData({
      ...createEmptyData(),
      tasks: [{ id: 'x', title: '', status: 'unknown' }]
    })).toBe(false);
    expect(isAppData({
      ...createEmptyData(),
      transactions: [{
        id: 'x',
        type: 'expense',
        amount: Number.NaN,
        accountId: 'a',
        category: 'Makan',
        note: 'Tes',
        date: 'bukan-tanggal',
        createdAt: 'bukan-tanggal'
      }]
    })).toBe(false);
  });
});
