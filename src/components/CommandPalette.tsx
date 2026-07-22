import { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CheckSquare2,
  CircleDollarSign,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  Target
} from 'lucide-react';
import type { PageId } from '../types';
import { useAppStore } from '../store/AppStore';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
  onQuickCapture: () => void;
}

const pages: Array<{ page: PageId; label: string; icon: typeof Search }> = [
  { page: 'today', label: 'Buka Hari Ini', icon: CalendarCheck2 },
  { page: 'tasks', label: 'Buka Tugas & Proyek', icon: CheckSquare2 },
  { page: 'routines', label: 'Buka Rutinitas', icon: Target },
  { page: 'notes', label: 'Buka Catatan', icon: NotebookPen },
  { page: 'finance', label: 'Buka Keuangan', icon: CircleDollarSign },
  { page: 'review', label: 'Buka Review Mingguan', icon: Sparkles }
];

export const CommandPalette = ({ open, onClose, onNavigate, onQuickCapture }: CommandPaletteProps) => {
  const { data } = useAppStore();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const taskResults = data.tasks
      .filter((item) => item.title.toLowerCase().includes(normalized))
      .slice(0, 4)
      .map((item) => ({ id: item.id, label: item.title, type: 'Tugas', page: 'tasks' as PageId }));
    const noteResults = data.notes
      .filter((item) => `${item.title} ${item.content}`.toLowerCase().includes(normalized))
      .slice(0, 4)
      .map((item) => ({ id: item.id, label: item.title, type: 'Catatan', page: 'notes' as PageId }));
    const transactionResults = data.transactions
      .filter((item) => `${item.note} ${item.category}`.toLowerCase().includes(normalized))
      .slice(0, 4)
      .map((item) => ({ id: item.id, label: item.note, type: 'Transaksi', page: 'finance' as PageId }));
    return [...taskResults, ...noteResults, ...transactionResults].slice(0, 8);
  }, [query, data]);

  if (!open) return null;

  return (
    <div className="command-backdrop" onMouseDown={onClose}>
      <section className="command-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input-wrap">
          <Search size={19} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari tugas, catatan, transaksi, atau halaman…"
          />
          <kbd>Esc</kbd>
        </div>

        <div className="command-results">
          {!query.trim() && (
            <>
              <p className="command-caption">Aksi cepat</p>
              <button onClick={onQuickCapture}><Plus size={17} /><span>Tangkap sesuatu</span></button>
              <p className="command-caption">Navigasi</p>
              {pages.map((item) => {
                const Icon = item.icon;
                return <button key={item.page} onClick={() => onNavigate(item.page)}><Icon size={17} /><span>{item.label}</span></button>;
              })}
            </>
          )}

          {query.trim() && results.length === 0 && <div className="empty-state compact"><strong>Tidak ditemukan</strong><p>Coba kata yang lebih pendek atau berbeda.</p></div>}
          {results.map((result) => (
            <button key={result.id} onClick={() => onNavigate(result.page)}>
              <Search size={16} />
              <span>{result.label}</span>
              <small>{result.type}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
