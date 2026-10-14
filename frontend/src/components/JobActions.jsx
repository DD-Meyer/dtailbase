import { useEffect, useRef, useState } from "react";
import api from "../axios_instance";
import { useCompany } from "../context/CompanyContext";
import { JOB_LABELS, jobError, nextJobAction } from "../utils/jobStatus";
import { resizeImagesToPlanLimit } from "../utils/imageResize";
import { showConfirm } from "../utils/uiFeedback";
import RecordDialog from "./RecordDialog";
import IndemnityForm from "./IndemnityForm";

function CompletionForm({ booking, onSuccess, onBusyChange }) {
  const { planLimits } = useCompany();
  const limit = planLimits?.max_images_after ?? 2;
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const urls = useRef(new Set());
  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  const addPhotos = async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = "";
    if (lock.current) return;
    if (photos.length + files.length > limit) {
      setError(`Your plan allows up to ${limit} AFTER photos. Choose fewer files.`);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const resized = await resizeImagesToPlanLimit(files, planLimits?.max_image_width ?? 1280, planLimits?.max_image_height ?? 720);
      setPhotos((current) => [...current, ...resized.map((file) => {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        return { file, url };
      })]);
    } catch (failure) { setError(jobError(failure)); }
    finally { lock.current = false; setBusy(false); }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    if (!photos.length) { setError("Upload at least one AFTER photo before completing this job."); return; }
    lock.current = true;
    setBusy(true);
    setError("");
    const payload = new FormData();
    payload.append("status", "COMPLETED");
    payload.append("expected_status", booking.status);
    photos.forEach(({ file }) => payload.append("uploaded_images", file));
    try {
      await api.patch(`bookings/${booking.id}/update_status/`, payload);
      await onSuccess();
    } catch (failure) { setError(jobError(failure)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <form className="job-upload" onSubmit={submit}>
    <p>Upload AFTER photos to finish the job. {photos.length} / {limit} photos selected. Existing plan and storage limits apply.</p>
    <div className="photo-grid">{photos.map(({ url }, index) => <div key={url} className="photo-preview-item">
      <img src={url} alt={`After photo ${index + 1}`} />
      <button type="button" className="remove-photo-btn" disabled={busy} aria-label={`Remove after photo ${index + 1}`} onClick={() => {
        URL.revokeObjectURL(url); urls.current.delete(url); setPhotos((current) => current.filter((photo) => photo.url !== url));
      }}>Remove</button>
    </div>)}</div>
    <label>AFTER photos<input type="file" accept="image/*" multiple disabled={busy || photos.length >= limit} onChange={addPhotos} /></label>
    {error && <p className="job-action-error" role="alert">{error}</p>}
    <button className="btn btn-primary" disabled={busy || !photos.length}>{busy ? "Processing..." : "Confirm & complete"}</button>
  </form>;
}

export function JobTimer({ startedAt }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000));
  return <span aria-label={`Started ${elapsed} minutes ago`}>{Math.floor(elapsed / 60)}h {elapsed % 60}m</span>;
}

export default function JobActions({ booking, name, onUpdated, onDelete }) {
  const { refreshCompany } = useCompany();
  const [busy, setBusy] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const action = nextJobAction(booking);
  const refresh = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try { await onUpdated(); }
    catch (failure) { setError(jobError(failure)); }
    finally { lock.current = false; setBusy(false); }
  };
  const updated = async () => {
    setSheet(null);
    await onUpdated();
    await refreshCompany();
  };
  const changeStatus = async (status) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (status === "CANCELLED" && !await showConfirm({ title: "Cancel booking", message: "Cancel this booking? This cannot be undone.", confirmText: "Cancel booking", danger: true })) return;
      if (status === "IN_PROGRESS" && !booking.can_start) { setSheet("sign"); return; }
      if (status === "COMPLETED") { setSheet("complete"); return; }
      const payload = new FormData();
      payload.append("status", status);
      payload.append("expected_status", booking.status);
      await api.patch(`bookings/${booking.id}/update_status/`, payload);
      await updated();
    } catch (failure) { setError(jobError(failure)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <>
    <div className="job-record-footer">
      <span className={`job-status job-status-${booking.status.toLowerCase()}`} aria-live="polite">{JOB_LABELS[booking.status]}</span>
      <div className="job-action-controls">
        {action && <button className="job-next-action" disabled={busy} onClick={() => changeStatus(action.status)} aria-label={`${action.label} job for ${name}`}>{busy ? "Updating..." : action.label}</button>}
        {["PENDING", "CONFIRMED"].includes(booking.status) && <button disabled={busy} onClick={() => changeStatus("CANCELLED")} aria-label={`Cancel job for ${name}`}>Cancel</button>}
        {onDelete && !["IN_PROGRESS", "COMPLETED"].includes(booking.status) && <button disabled={busy} onClick={onDelete} aria-label={`Delete job for ${name}`}>Delete</button>}
      </div>
    </div>
    {error && <div className="job-action-error" role="alert"><p>{error}</p>
      <div className="job-action-controls"><button disabled={busy} onClick={refresh}>Refresh job data</button></div></div>}
    {sheet && <RecordDialog title={sheet === "sign" ? "Sign & start job" : "Complete job"} variant={sheet === "sign" ? "signing" : undefined} busy={sheetBusy} onClose={() => setSheet(null)}>
      {sheet === "sign" ? <IndemnityForm bookingId={booking.id} onSuccess={updated} onClose={() => setSheet(null)} onBusyChange={setSheetBusy} /> :
        <CompletionForm booking={booking} onSuccess={updated} onBusyChange={setSheetBusy} />}
    </RecordDialog>}
  </>;
}
