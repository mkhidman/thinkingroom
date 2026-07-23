import type { PrayerName, PrayerSettings } from '../types';

export const defaultPrayerSettings: PrayerSettings = {
  locationName: 'Jakarta',
  latitude: -6.2088,
  longitude: 106.8456,
  timezone: 7,
  fajrAngle: 20,
  ishaAngle: 18,
  asrShadowFactor: 1
};

const toRadians = (degrees: number) => degrees * Math.PI / 180;
const toDegrees = (radians: number) => radians * 180 / Math.PI;
const sin = (degrees: number) => Math.sin(toRadians(degrees));
const cos = (degrees: number) => Math.cos(toRadians(degrees));
const tan = (degrees: number) => Math.tan(toRadians(degrees));
const arcsin = (value: number) => toDegrees(Math.asin(value));
const arccos = (value: number) => toDegrees(Math.acos(Math.min(1, Math.max(-1, value))));
const arctan2 = (y: number, x: number) => toDegrees(Math.atan2(y, x));
const arccot = (value: number) => toDegrees(Math.atan2(1, value));
const normalize = (value: number, range: number) => ((value % range) + range) % range;

const julianDate = (date: Date) => {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const century = Math.floor(year / 100);
  const correction = 2 - century + Math.floor(century / 4);
  return Math.floor(365.25 * (year + 4_716))
    + Math.floor(30.6001 * (month + 1))
    + day + correction - 1_524.5;
};

const sunPosition = (julian: number) => {
  const days = julian - 2_451_545;
  const meanAnomaly = normalize(357.529 + 0.98560028 * days, 360);
  const meanLongitude = normalize(280.459 + 0.98564736 * days, 360);
  const eclipticLongitude = normalize(
    meanLongitude + 1.915 * sin(meanAnomaly) + 0.02 * sin(2 * meanAnomaly),
    360
  );
  const obliquity = 23.439 - 0.00000036 * days;
  const declination = arcsin(sin(obliquity) * sin(eclipticLongitude));
  const rightAscension = normalize(
    arctan2(cos(obliquity) * sin(eclipticLongitude), cos(eclipticLongitude)) / 15,
    24
  );
  return {
    declination,
    equation: meanLongitude / 15 - rightAscension
  };
};

const formatTime = (hours: number) => {
  if (!Number.isFinite(hours)) return '--.--';
  const normalized = normalize(hours + 0.5 / 60, 24);
  const hour = Math.floor(normalized);
  const minute = Math.floor((normalized - hour) * 60);
  return `${String(hour).padStart(2, '0')}.${String(minute).padStart(2, '0')}`;
};

export const calculatePrayerTimes = (
  date = new Date(),
  settings: PrayerSettings = defaultPrayerSettings
): Record<PrayerName, string> => {
  const julian = julianDate(date) - settings.longitude / (15 * 24);
  const positionAt = (time: number) => sunPosition(julian + time / 24);
  const midday = (time: number) => normalize(12 - positionAt(time).equation, 24);
  const angleTime = (angle: number, time: number, direction: 'before' | 'after') => {
    const position = positionAt(time);
    const numerator = -sin(angle) - sin(position.declination) * sin(settings.latitude);
    const denominator = cos(position.declination) * cos(settings.latitude);
    const delta = arccos(numerator / denominator) / 15;
    const noon = midday(time);
    return noon + (direction === 'after' ? delta : -delta);
  };
  const asrTime = (factor: number, time: number) => {
    const declination = positionAt(time).declination;
    const angle = -arccot(factor + tan(Math.abs(settings.latitude - declination)));
    return angleTime(angle, time, 'after');
  };
  const adjust = (hours: number) => hours + settings.timezone - settings.longitude / 15;

  return {
    Subuh: formatTime(adjust(angleTime(settings.fajrAngle, 5, 'before'))),
    Dzuhur: formatTime(adjust(midday(12) + 2 / 60)),
    Ashar: formatTime(adjust(asrTime(settings.asrShadowFactor, 13))),
    Maghrib: formatTime(adjust(angleTime(0.833, 18, 'after'))),
    Isya: formatTime(adjust(angleTime(settings.ishaAngle, 18, 'after')))
  };
};

export const prayerTimeToMinutes = (value: string) => {
  const match = /^(\d{2})\.(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
};

export const getNextPrayer = (
  times: Record<PrayerName, string>,
  now = new Date()
): { prayer: PrayerName; time: string; tomorrow: boolean } => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const entries = Object.entries(times) as Array<[PrayerName, string]>;
  const next = entries.find(([, time]) => prayerTimeToMinutes(time) >= currentMinutes);
  if (next) return { prayer: next[0], time: next[1], tomorrow: false };
  return { prayer: 'Subuh', time: times.Subuh, tomorrow: true };
};
