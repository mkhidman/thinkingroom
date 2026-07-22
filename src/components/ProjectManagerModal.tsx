import { useEffect, useMemo, useState } from 'react';
import { FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { useAppStore } from '../store/AppStore';
import type { Project } from '../types';

interface ProjectManagerModalProps {
  open: boolean;
  onClose: () => void;
}

const colorPresets = ['#005BAC', '#003E7E', '#2E8A72', '#E59B2F', '#B34B4B', '#6554C0', '#C45D9B', '#4E647A'];

const emptyProject: Omit<Project, 'id'> = {
  name: '',
  color: '#005BAC',
  status: 'active',
  note: ''
};

const statusLabels: Record<Project['status'], string> = {
  active: 'Aktif',
  paused: 'Dijeda',
  done: 'Selesai'
};

const validColor = (color: string) => /^#[0-9a-f]{6}$/i.test(color);

export const ProjectManagerModal = ({ open, onClose }: ProjectManagerModalProps) => {
  const { data, addProject, updateProject, deleteProject } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Project, 'id'>>(emptyProject);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedProject = data.projects.find((project) => project.id === selectedId);
  const relatedCounts = useMemo(() => {
    if (!selectedId) return { tasks: 0, notes: 0 };
    return {
      tasks: data.tasks.filter((task) => task.projectId === selectedId).length,
      notes: data.notes.filter((note) => note.projectId === selectedId).length
    };
  }, [data.tasks, data.notes, selectedId]);

  useEffect(() => {
    if (!open) return;
    if (selectedId && !data.projects.some((project) => project.id === selectedId)) {
      setSelectedId(null);
      setForm(emptyProject);
      setConfirmDelete(false);
    }
  }, [open, selectedId, data.projects]);

  const startCreate = () => {
    setSelectedId(null);
    setForm(emptyProject);
    setConfirmDelete(false);
  };

  const startEdit = (project: Project) => {
    setSelectedId(project.id);
    setForm({
      name: project.name,
      color: project.color,
      status: project.status,
      note: project.note ?? ''
    });
    setConfirmDelete(false);
  };

  const submit = () => {
    const name = form.name.trim();
    if (!name) return;
    const payload = {
      ...form,
      name,
      color: validColor(form.color) ? form.color : '#005BAC',
      note: form.note?.trim() || undefined
    };
    if (selectedId) updateProject(selectedId, payload);
    else addProject(payload);
    startCreate();
  };

  const remove = () => {
    if (!selectedId) return;
    deleteProject(selectedId);
    startCreate();
  };

  const close = () => {
    startCreate();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Kelola proyek"
      description="Tambah, ubah, jeda, selesaikan, atau hapus proyek tanpa menghilangkan tugas dan catatan di dalamnya."
      wide
    >
      <div className="project-manager-layout">
        <section className="project-manager-list">
          <div className="project-manager-heading">
            <div>
              <strong>Daftar proyek</strong>
              <span>{data.projects.length} proyek tersimpan</span>
            </div>
            <button type="button" className="secondary-button compact-button" onClick={startCreate}>
              <Plus size={15} /> Baru
            </button>
          </div>

          <div className="project-manager-items">
            {data.projects.map((project) => {
              const activeTasks = data.tasks.filter(
                (task) => task.projectId === project.id && task.status !== 'done'
              ).length;
              const notes = data.notes.filter((note) => note.projectId === project.id).length;

              return (
                <button
                  type="button"
                  key={project.id}
                  className={`project-manager-item ${selectedId === project.id ? 'active' : ''}`}
                  onClick={() => startEdit(project)}
                >
                  <i style={{ background: project.color }} />
                  <div>
                    <strong>{project.name}</strong>
                    <span>{activeTasks} tugas aktif · {notes} catatan</span>
                  </div>
                  <em className={`project-status status-${project.status}`}>
                    {statusLabels[project.status]}
                  </em>
                  <Pencil size={14} />
                </button>
              );
            })}

            {data.projects.length === 0 && (
              <div className="empty-state compact">
                <FolderKanban size={26} />
                <strong>Belum ada proyek</strong>
                <p>Buat proyek pertama untuk mengelompokkan tugas dan catatan.</p>
              </div>
            )}
          </div>
        </section>

        <section className="project-editor">
          <div className="project-editor-title">
            <div>
              <strong>{selectedProject ? 'Edit proyek' : 'Proyek baru'}</strong>
              <span>
                {selectedProject
                  ? 'Perubahan langsung diterapkan ke seluruh relasi.'
                  : 'Gunakan proyek sebagai konteks, bukan daftar tugas tambahan.'}
              </span>
            </div>
            <span
              className="project-color-preview"
              style={{ background: validColor(form.color) ? form.color : '#005BAC' }}
            />
          </div>

          <div className="form-grid two-columns">
            <label className="field full-field">
              <span>Nama proyek</span>
              <input
                autoFocus
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Contoh: Pride Chicken"
              />
            </label>

            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as Project['status']
                  }))
                }
              >
                <option value="active">Aktif</option>
                <option value="paused">Dijeda</option>
                <option value="done">Selesai</option>
              </select>
            </label>

            <label className="field">
              <span>Warna khusus</span>
              <div className="color-input-row">
                <input
                  type="color"
                  value={validColor(form.color) ? form.color : '#005BAC'}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, color: event.target.value }))
                  }
                />
                <input
                  value={form.color}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, color: event.target.value }))
                  }
                  maxLength={7}
                  aria-label="Kode warna proyek"
                />
              </div>
            </label>

            <div className="field full-field">
              <span>Pilihan warna</span>
              <div className="project-color-picker">
                {colorPresets.map((color) => (
                  <button
                    type="button"
                    key={color}
                    aria-label={`Pilih warna ${color}`}
                    className={form.color.toLowerCase() === color.toLowerCase() ? 'active' : ''}
                    style={{ background: color }}
                    onClick={() => setForm((current) => ({ ...current, color }))}
                  />
                ))}
              </div>
            </div>

            <label className="field full-field">
              <span>Deskripsi singkat</span>
              <textarea
                rows={4}
                value={form.note ?? ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="Tujuan, batasan, atau konteks utama proyek…"
              />
            </label>
          </div>

          {selectedProject && (
            <div className="project-danger-zone">
              {!confirmDelete ? (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={15} /> Hapus proyek
                </button>
              ) : (
                <div className="delete-confirmation">
                  <div>
                    <strong>Hapus “{selectedProject.name}”?</strong>
                    <span>
                      {relatedCounts.tasks} tugas dan {relatedCounts.notes} catatan tidak ikut
                      terhapus, tetapi akan menjadi tanpa proyek.
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Batal
                    </button>
                    <button type="button" className="danger-button solid" onClick={remove}>
                      Ya, hapus
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions project-editor-actions">
            <button type="button" className="secondary-button" onClick={close}>
              Tutup
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!form.name.trim()}
              onClick={submit}
            >
              {selectedProject ? 'Simpan perubahan' : 'Tambah proyek'}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
};
