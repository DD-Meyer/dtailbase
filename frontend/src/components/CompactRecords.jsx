import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import RecordDialog from "./RecordDialog";

export default function CompactRecords({ records, emptyMessage = "No records found." }) {
  const [selectedId, setSelectedId] = useState(null);
  const triggerRef = useRef(null);
  const selected = records.find((record) => record.id === selectedId);
  return <>
    <div className="compact-records">
      {!records.length && <p className="record-empty">{emptyMessage}</p>}
      {records.map((record) => <article className="compact-record" key={record.id}>
        <button className="compact-record-open" onClick={(event) => { triggerRef.current = event.currentTarget; setSelectedId(record.id); }} aria-label={`View ${record.title}`}>
          <span className="record-avatar" aria-hidden="true">{record.title.slice(0, 2).toUpperCase()}</span>
          <span className="compact-record-copy"><strong>{record.title}</strong><span>{record.subtitle}</span></span>
          <span className="compact-record-meta">{record.meta}</span><ChevronRight size={18} aria-hidden="true" />
        </button>
      </article>)}
    </div>
    {selected && <RecordDialog title={selected.title} onClose={() => setSelectedId(null)}>
      <dl className="record-details">{selected.fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>)}</dl>
      <div className="record-detail-actions">{selected.actions.map((action) => <button key={action.label}
        className={`btn ${action.danger ? "text-btn-danger" : "btn-secondary"}`} onClick={(event) => {
          event.currentTarget.closest("dialog").close();
          triggerRef.current?.focus();
          setSelectedId(null);
          action.run();
        }}>{action.label}</button>)}</div>
    </RecordDialog>}
  </>;
}
