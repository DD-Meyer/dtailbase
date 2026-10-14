import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import "../styles/Records.css";

export default function RecordDialog({ title, children, onClose, busy = false, variant }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!busy && dialog.open && !dialog.contains(document.activeElement)) {
      dialog.querySelector("button:not(:disabled)")?.focus();
    }
  }, [busy]);
  return <dialog ref={dialogRef} className={`record-dialog${variant === "signing" ? " record-dialog-signing" : ""}`} aria-labelledby={titleId} aria-busy={busy}
    onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy) onClose();
      }
    }}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="record-dialog-header"><h2 id={titleId}>{title}</h2>
      <button type="button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={20} aria-hidden="true" /></button></header>
    <div className="record-dialog-body">{children}</div>
  </dialog>;
}
