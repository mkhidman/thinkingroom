import { useEffect, useMemo, useState } from 'react';
import { FileText, Lightbulb, Pencil, Plus, Scale, Search, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { Modal } from '../components/Modal';
import type { Note, NoteType } from '../types';
import { formatDate } from '../lib/format';

export const NotesPage = () => {
  const { data, addNote, updateNote, deleteNote } = useAppStore();
  const [filter, setFilter] = useState<'all' | NoteType>('all');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoteType>('note');
  const [projectId, setProjectId] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (!modalOpen) return;
    setTitle(editingNote?.title ?? '');
    setContent(editingNote?.content ?? '');
    setType(editingNote?.type ?? 'note');
    setProjectId(editingNote?.projectId ?? '');
    setTags(editingNote?.tags.join(', ') ?? '');
  }, [modalOpen, editingNote]);

  useEffect(() => {
    if (!modalOpen || editingNote?.projectId) return;
    const exists = data.projects.some((project) => project.id === projectId && project.status !== 'done');
    if (!exists) {
      setProjectId(
        data.projects.find((project) => project.status === 'active')?.id ??
          data.projects.find((project) => project.status !== 'done')?.id ??
          ''
      );
    }
  }, [modalOpen, data.projects, projectId, editingNote?.projectId]);

  const notes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.notes.filter((note) => {
      const matchesType = filter === 'all' || note.type === filter;
      const matchesQuery = !normalized || `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase().includes(normalized);
      return matchesType && matchesQuery;
    });
  }, [data.notes, filter, query]);

  const openNew = () => {
    setEditingNote(null);
    setModalOpen(true);
  };

  const submit = () => {
    if (!title.trim() || !content.trim()) return;
    const value = {
      title: title.trim(),
      content: content.trim(),
      type,
      projectId: projectId || undefined,
      tags: tags.split(',').map((item) => item.trim()).filter(Boolean)
    };
    if (editingNote) updateNote(editingNote.id, value);
    else addNote(value);
    setModalOpen(false);
    setEditingNote(null);
  };

  const removeNote = (note: Note) => {
    if (!window.confirm(`Hapus catatan “${note.title}”?`)) return;
    deleteNote(note.id);
  };

  const typeMeta = (noteType: NoteType) => {
    if (noteType === 'decision') return { label: 'Keputusan', icon: Scale };
    if (noteType === 'idea') return { label: 'Ide', icon: Lightbulb };
    return { label: 'Catatan', icon: FileText };
  };

  return (
    <div className="page-stack">
      <section className="section-toolbar notes-toolbar">
        <div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari isi catatan, keputusan, atau ide…" /></div>
        <button className="primary-button" onClick={openNew}><Plus size={17} /> Catatan baru</button>
      </section>

      <div className="filter-tabs note-filters">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'note', label: 'Catatan' },
          { id: 'decision', label: 'Decision log' },
          { id: 'idea', label: 'Idea vault' }
        ].map((item) => <button key={item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id as typeof filter)}>{item.label}</button>)}
      </div>

      <section className="notes-grid">
        {notes.map((note) => {
          const meta = typeMeta(note.type);
          const Icon = meta.icon;
          const project = data.projects.find((item) => item.id === note.projectId);
          return (
            <article className="note-card" key={note.id}>
              <div className="note-card-top">
                <span className={`note-type ${note.type}`}><Icon size={13} /> {meta.label}</span>
                <div className="note-card-actions">
                  <small>{formatDate(note.updatedAt)}</small>
                  <button className="row-action-button" onClick={() => { setEditingNote(note); setModalOpen(true); }} aria-label="Edit catatan"><Pencil size={13} /></button>
                  <button className="row-action-button danger" onClick={() => removeNote(note)} aria-label="Hapus catatan"><Trash2 size={13} /></button>
                </div>
              </div>
              <strong>{note.title}</strong>
              <p>{note.content}</p>
              <div className="note-card-footer">
                {project ? <span className="project-pill"><i style={{ background: project.color }} />{project.name}</span> : <span>Tanpa proyek</span>}
                <span>{note.tags.length ? note.tags.join(', ') : 'Tanpa tag'}</span>
              </div>
            </article>
          );
        })}
        {notes.length === 0 && <div className="empty-state full-width"><FileText size={30} /><strong>Tidak ada catatan yang cocok</strong><p>Tambahkan catatan baru atau ubah filter pencarian.</p></div>}
      </section>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingNote(null); }} title={editingNote ? 'Edit catatan' : 'Catatan baru'} description="Catatan dapat menjadi referensi, keputusan, atau ide yang belum perlu dikerjakan." wide>
        <div className="form-grid two-columns">
          <label className="field full-field"><span>Judul</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="field"><span>Tipe</span><select value={type} onChange={(event) => setType(event.target.value as NoteType)}><option value="note">Catatan</option><option value="decision">Keputusan</option><option value="idea">Ide</option></select></label>
          <label className="field"><span>Proyek</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Tanpa proyek</option>{data.projects.filter((project) => project.status !== 'done' || project.id === editingNote?.projectId).map((project) => <option key={project.id} value={project.id}>{project.name}{project.status === 'paused' ? ' — Dijeda' : project.status === 'done' ? ' — Selesai' : ''}</option>)}</select></label>
          <label className="field full-field"><span>Tag, pisahkan dengan koma</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="contoh: ide, referensi, keputusan" /></label>
          <label className="field full-field"><span>Isi</span><textarea rows={8} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Tulis konteks yang akan tetap berguna saat dibaca beberapa bulan lagi…" /></label>
        </div>
        <div className="modal-actions"><button className="secondary-button" onClick={() => { setModalOpen(false); setEditingNote(null); }}>Batal</button><button className="primary-button" disabled={!title.trim() || !content.trim()} onClick={submit}>{editingNote ? 'Simpan perubahan' : 'Simpan catatan'}</button></div>
      </Modal>
    </div>
  );
};
