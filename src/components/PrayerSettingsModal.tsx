import { useEffect, useMemo, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import type { PrayerSettings } from '../types';
import { defaultPrayerSettings } from '../lib/prayerTimes';
import { Modal } from './Modal';

interface PrayerSettingsModalProps {
  open: boolean;
  settings?: PrayerSettings;
  onSave: (settings: PrayerSettings) => void;
  onClose: () => void;
}

export const PrayerSettingsModal = ({ open, settings, onSave, onClose }: PrayerSettingsModalProps) => {
  const current = settings ?? defaultPrayerSettings;
  const [locationName, setLocationName] = useState(current.locationName);
  const [latitude, setLatitude] = useState(String(current.latitude));
  const [longitude, setLongitude] = useState(String(current.longitude));
  const [timezone, setTimezone] = useState(String(current.timezone));
  const [fajrAngle, setFajrAngle] = useState(String(current.fajrAngle));
  const [ishaAngle, setIshaAngle] = useState(String(current.ishaAngle));
  const [asrShadowFactor, setAsrShadowFactor] = useState<1 | 2>(current.asrShadowFactor);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = settings ?? defaultPrayerSettings;
    setLocationName(next.locationName);
    setLatitude(String(next.latitude));
    setLongitude(String(next.longitude));
    setTimezone(String(next.timezone));
    setFajrAngle(String(next.fajrAngle));
    setIshaAngle(String(next.ishaAngle));
    setAsrShadowFactor(next.asrShadowFactor);
    setLocationError(null);
  }, [open, settings]);

  const canSubmit = useMemo(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const zone = Number(timezone);
    return locationName.trim().length > 0
      && Number.isFinite(lat) && lat >= -90 && lat <= 90
      && Number.isFinite(lng) && lng >= -180 && lng <= 180
      && Number.isFinite(zone) && zone >= -12 && zone <= 14
      && Number(fajrAngle) >= 10 && Number(fajrAngle) <= 30
      && Number(ishaAngle) >= 10 && Number(ishaAngle) <= 30;
  }, [locationName, latitude, longitude, timezone, fajrAngle, ishaAngle]);

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser tidak mendukung lokasi perangkat.');
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setTimezone(String(-new Date().getTimezoneOffset() / 60));
        setLocationName('Lokasi perangkat');
      },
      () => setLocationError('Lokasi tidak dapat diakses. Periksa izin browser.'),
      { enableHighAccuracy: false, timeout: 10_000 }
    );
  };

  const submit = () => {
    if (!canSubmit) return;
    onSave({
      locationName: locationName.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      timezone: Number(timezone),
      fajrAngle: Number(fajrAngle),
      ishaAngle: Number(ishaAngle),
      asrShadowFactor
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Pengaturan waktu salat" description="Perhitungan dilakukan langsung di perangkat dan dapat disesuaikan dengan jadwal lokal." wide>
      <button type="button" className="secondary-button" onClick={useDeviceLocation}><LocateFixed size={16} /> Gunakan lokasi perangkat</button>
      {locationError && <p className="validation-message">{locationError}</p>}
      <div className="form-grid two-columns">
        <label className="field full-field"><span>Nama lokasi</span><input autoFocus value={locationName} onChange={(event) => setLocationName(event.target.value)} /></label>
        <label className="field"><span>Latitude</span><input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label>
        <label className="field"><span>Longitude</span><input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label>
        <label className="field"><span>Zona waktu UTC</span><input inputMode="decimal" value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
        <label className="field"><span>Metode Ashar</span><select value={asrShadowFactor} onChange={(event) => setAsrShadowFactor(Number(event.target.value) as 1 | 2)}><option value={1}>Syafi'i · bayangan 1×</option><option value={2}>Hanafi · bayangan 2×</option></select></label>
        <label className="field"><span>Sudut Subuh</span><input inputMode="decimal" value={fajrAngle} onChange={(event) => setFajrAngle(event.target.value)} /></label>
        <label className="field"><span>Sudut Isya</span><input inputMode="decimal" value={ishaAngle} onChange={(event) => setIshaAngle(event.target.value)} /></label>
      </div>
      <p className="form-hint">Default menggunakan sudut Kemenag Indonesia: Subuh 20° dan Isya 18°. Cocokkan dengan jadwal masjid setempat bila diperlukan.</p>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button" disabled={!canSubmit} onClick={submit}>Simpan pengaturan</button></div>
    </Modal>
  );
};
