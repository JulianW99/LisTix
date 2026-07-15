import { useEffect, type ReactNode } from "react";
import "./Modal.css";

type ModalProps = { title: string; children: ReactNode; onClose: () => void; className?: string };

export function Modal({ title, children, onClose, className = "" }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`modal-panel panel ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><h2 id="modal-title">{title}</h2><button type="button" aria-label="Close" onClick={onClose}>×</button></div>{children}</section></div>;
}
