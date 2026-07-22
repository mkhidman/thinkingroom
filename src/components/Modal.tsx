import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  closable?: boolean;
}

export const Modal = ({ open, title, description, onClose, children, wide, closable = true }: ModalProps) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={closable ? onClose : undefined}>
      <section
        className={`modal-card ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {closable && (
            <button className="icon-button" onClick={onClose} aria-label="Tutup">
              <X size={19} />
            </button>
          )}
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
};
