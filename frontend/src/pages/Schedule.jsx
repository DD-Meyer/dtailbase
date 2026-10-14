import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { BookingCards, DashboardFeedback } from "./Dashboard";
import { BOOKING_STATUSES, useDashboardData, useToday } from "../utils/dashboard";
import { dateLabel, parseCalendarDate, shiftDate } from "../utils/calendar";

export default function Schedule() {
  const today = useToday();
  const [search, setSearch] = useSearchParams();
  const requested = search.get("date");
  const date = requested && parseCalendarDate(requested) ? requested : today;
  const requestedStatus = search.get("status") || "ACTIVE";
  const status = ["ACTIVE", "ALL", ...Object.keys(BOOKING_STATUSES)].includes(requestedStatus) ? requestedStatus : "ACTIVE";
  const rawPage = Number(search.get("page") || 1);
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1;
  const { data, error, retry } = useDashboardData({ today, date, month: date.slice(0, 7), status, page });
  useEffect(() => {
    if (data && page > 1 && !data.agenda.items.length) {
      setSearch({ date, status, page: Math.max(1, Math.ceil(data.agenda.count / 50)) }, { replace: true });
    }
  }, [data, page, date, status, setSearch]);
  const changeDate = (next) => { if (parseCalendarDate(next)) setSearch({ date: next, status }); };
  return <div className="home-dashboard">
    <header className="schedule-header"><div><h1>Your schedule</h1><p>Bookings in scheduled order, all in one place.</p></div>
      <Link className="btn btn-primary" to={`/new-booking?date=${date}`}><Plus size={16} aria-hidden="true" /> New booking</Link></header>
    {((requested && !parseCalendarDate(requested)) || requestedStatus !== status || rawPage !== page) &&
      <p role="alert">Invalid schedule filter. Showing valid defaults. <Link to="/schedule">Clear filters</Link></p>}
    <section className="home-panel schedule-toolbar">
      <fieldset className="schedule-filter-group"><legend>Appointment date</legend><div className="schedule-date-controls">
        <button aria-label="Previous day" disabled={date === "1900-01-01"} onClick={() => changeDate(shiftDate(date, -1))}><ChevronLeft size={18} /></button>
        <label>Date<input type="date" min="1900-01-01" max="2100-12-31" value={date} onChange={(event) => changeDate(event.target.value)} /></label>
        <button aria-label="Next day" disabled={date === "2100-12-31"} onClick={() => changeDate(shiftDate(date, 1))}><ChevronRight size={18} /></button>
        <button onClick={() => changeDate(today)}>Today</button>
      </div></fieldset>
      <fieldset className="schedule-filter-group"><legend>Job status</legend><label>Status<select value={status} onChange={(event) => setSearch({ date, status: event.target.value })}>
        <option value="ACTIVE">Scheduled (not cancelled)</option><option value="ALL">All statuses</option>
        {Object.entries(BOOKING_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label></fieldset>
    </section>
    {!data ? <DashboardFeedback error={error} retry={retry} /> : <section className="home-daily">
      <div className="home-panel-heading"><h2>{dateLabel(date)}</h2><span>{data.agenda.count} bookings</span></div>
      <BookingCards bookings={data.agenda.items} currency={data.currency} onUpdated={retry} />
      <nav className="agenda-pagination" aria-label="Agenda pages">
        <button disabled={page === 1} onClick={() => setSearch({ date, status, page: page - 1 })}>Previous</button>
        <span>Page {page}</span>
        <button disabled={!data.agenda.next_page} onClick={() => setSearch({ date, status, page: data.agenda.next_page })}>Next</button>
      </nav>
    </section>}
    <p className="dashboard-estimate-note">Values are estimates using current service prices, not collected payments. Update jobs here or open a record for full details.</p>
  </div>;
}
