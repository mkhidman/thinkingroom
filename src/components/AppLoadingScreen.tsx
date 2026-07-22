import { Cloud } from 'lucide-react';

export const AppLoadingScreen = ({ label = 'Menyiapkan Ruang…' }: { label?: string }) => (
  <main className="app-loading-screen">
    <div className="brand-mark large">R</div>
    <Cloud size={21} />
    <strong>{label}</strong>
  </main>
);
