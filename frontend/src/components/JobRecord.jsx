import { Link } from "react-router-dom";
import { Building2, Car, Clock3 } from "lucide-react";
import { moneyLabel } from "../utils/calendar";
import JobActions, { JobTimer } from "./JobActions";

export default function JobRecord({ booking, currency, onUpdated, onDelete }) {
  const name = `${booking.customer_name} ${booking.customer_lastname}`.trim();
  const LocationIcon = booking.location_type === "MOBILE" ? Car : Building2;
  return <article className="job-record" aria-label={`Job for ${name}`}>
    <Link to={`/bookings/${booking.id}`} className="job-record-main">
      <span className="record-avatar" aria-hidden="true">{booking.customer_name?.[0]}{booking.customer_lastname?.[0]}</span>
      <div className="job-record-copy">
        <div className="job-record-title"><strong>{name}</strong><span>{moneyLabel(booking.estimated_value ?? booking.total_price, currency)}</span></div>
        <p>{booking.service_name} · {booking.vehicle_details?.make} {booking.vehicle_details?.model} {booking.vehicle_details?.registration}</p>
        <div className="job-record-meta"><span><Clock3 size={12} aria-hidden="true" />{booking.booking_date} · {booking.booking_time?.slice(0, 5)}–{booking.booking_end_time?.slice(0, 5)}</span>
          <span><LocationIcon size={12} aria-hidden="true" />{booking.location_type === "MOBILE" ? "Mobile" : "On-site"}</span>
          {booking.status === "IN_PROGRESS" && booking.started_at && <JobTimer startedAt={booking.started_at} />}
        </div>
      </div>
    </Link>
    <JobActions booking={booking} name={name} onUpdated={onUpdated} onDelete={onDelete} />
  </article>;
}
