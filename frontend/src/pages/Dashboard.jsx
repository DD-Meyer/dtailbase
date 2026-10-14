import { useContext, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import JobRecord from "../components/JobRecord";
import { AuthContext } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { dateLabel, moneyLabel, parseCalendarDate, shiftDate, shiftMonth } from "../utils/calendar";
import { useDashboardData, useToday } from "../utils/dashboard";
import "../styles/HomeDashboard.css";

export function DashboardFeedback({ error, retry }) {
  return (
    <section className="home-panel dashboard-feedback" aria-live="polite" aria-busy={!error}>
      {error ? <><h2>Unable to load bookings</h2><p role="alert">{error}</p><button className="btn btn-primary" onClick={retry}>Try again</button></> :
        <><h2>Loading your workspace</h2><p>Fetching bookings and calendar activity...</p><div className="dashboard-skeleton" /></>}
    </section>
  );
}

export function BookingCards({ bookings, currency, onUpdated }) {
  if (!bookings.length) return <p className="agenda-empty">No bookings for this date and filter. Choose another date or create a booking.</p>;
  return <div className="home-booking-grid">{bookings.map((booking) =>
    <JobRecord key={booking.id} booking={booking} currency={currency} onUpdated={onUpdated} />)}</div>;
}

function BookingCalendar({ data, selected, today, month, onMonth, onSelect, focusDateRef }) {
  const grid = useRef(null);
  useEffect(() => {
    if (focusDateRef.current) {
      grid.current?.querySelector(`[data-date="${focusDateRef.current}"]`)?.focus();
      focusDateRef.current = null;
    }
  }, [data, focusDateRef]);
  const first = parseCalendarDate(`${month}-01`);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const counts = new Map(data.month_counts.map((day) => [day.date, day.count]));
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const handleKey = (event, date) => {
    const shifts = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next;
    if (event.key in shifts) next = shiftDate(date, shifts[event.key]);
    else if (event.key === "Home") next = `${month}-01`;
    else if (event.key === "End") next = `${month}-${String(last).padStart(2, "0")}`;
    else return;
    if (!parseCalendarDate(next)) return;
    event.preventDefault();
    focusDateRef.current = next;
    onSelect(next);
  };
  return (
    <section className="home-panel home-calendar" aria-label="Booking calendar">
      <div className="home-panel-heading"><h2>Booking calendar</h2><Link to={`/schedule?date=${selected}`}>View schedule <ArrowRight size={14} aria-hidden="true" /></Link></div>
      <div className="calendar-controls">
        <strong aria-live="polite">{monthLabel}</strong>
        <div><button onClick={() => onSelect(today)}>Today</button>
          <button aria-label="Previous month" disabled={month === "1900-01"} onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button>
          <button aria-label="Next month" disabled={month === "2100-12"} onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button></div>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={index}>{day}</span>)}</div>
      <div className="calendar-days" ref={grid}>
        {Array.from({ length: first.getDay() }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: last }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, "0")}`;
          return <button key={date} data-date={date} className={date === selected ? "selected" : ""}
            aria-label={`${dateLabel(date)}${date === today ? ", today" : ""}, ${counts.get(date) || 0} bookings`}
            aria-pressed={date === selected} aria-current={date === today ? "date" : undefined}
            onKeyDown={(event) => handleKey(event, date)} onClick={() => onSelect(date)}>
            {index + 1}{counts.has(date) && <span className="calendar-marker" aria-hidden="true" />}
          </button>;
        })}
      </div>
      <p className="calendar-legend"><span className="calendar-marker" /> Scheduled bookings, excluding cancelled</p>
      <div className="calendar-preview">
        <strong>{selected === today ? "Today" : dateLabel(selected, { month: "short", day: "numeric" })}</strong>
        {data.agenda.items.slice(0, 3).map((booking) => <Link key={booking.id} to={`/bookings/${booking.id}`}><span>{booking.booking_time.slice(0, 5)}</span>{booking.customer_name} {booking.customer_lastname}</Link>)}
        {!data.agenda.count && <p>No bookings scheduled.</p>}
        {data.agenda.count > 3 && <Link to={`/schedule?date=${selected}`}>View all {data.agenda.count} bookings <ArrowRight size={14} aria-hidden="true" /></Link>}
      </div>
    </section>
  );
}

function WeeklyChart({ week, currency, metric, setMetric, active, setActive }) {
  const values = week.days.map((day) => Number(day[metric]));
  const maximum = Math.max(1, ...values);
  const points = values.map((value, index) => [48 + index * 90, 185 - (value / maximum) * 145]);
  const line = points.map((point) => point.join(",")).join(" ");
  const format = (value) => metric === "count" ? `${value} bookings` : moneyLabel(value, currency);
  return (
    <section className="home-panel home-chart" aria-label="Weekly booking activity">
      <div className="home-panel-heading"><div><h2>Weekly activity</h2><p>{dateLabel(week.start, { month: "short", day: "numeric" })} - {dateLabel(week.end, { month: "short", day: "numeric" })}</p></div>
        <strong>{format(values.reduce((sum, value) => sum + value, 0))}</strong></div>
      <div className="chart-tabs" aria-label="Chart metric">
        <button aria-pressed={metric === "estimated_value"} onClick={() => setMetric("estimated_value")}>Estimated value</button>
        <button aria-pressed={metric === "count"} onClick={() => setMetric("count")}>Booking count</button>
      </div>
      <svg className="weekly-chart" viewBox="0 0 640 225" role="img" aria-label={`Daily ${metric === "count" ? "booking counts" : "estimated booking values"}. Full values available below.`}>
        {[40, 88, 137, 185].map((y) => <line key={y} x1="48" x2="588" y1={y} y2={y} className="chart-gridline" />)}
        <polygon points={`48,185 ${line} 588,185`} className="chart-fill" />
        <polyline points={line} className="chart-line" />
        {points.map(([x, y], index) => <circle key={week.days[index].date} cx={x} cy={y} r={index === active ? 6 : 3} className="chart-point" />)}
      </svg>
      <div className="chart-day-controls" aria-label="Inspect daily activity">{week.days.map((day, index) => <button key={day.date} aria-pressed={active === index}
        aria-label={`${dateLabel(day.date)}, ${format(values[index])}`} onClick={() => setActive(index)} onFocus={() => setActive(index)}>
        {dateLabel(day.date, { weekday: "short" })}</button>)}</div>
      <p className="chart-selected" aria-live="polite">{dateLabel(week.days[active].date, { weekday: "long", month: "short", day: "numeric" })}: <strong>{format(values[active])}</strong></p>
      <p className="chart-note">{week.change_percent === null ? "No prior-week value for a percentage comparison." : `${Number(week.change_percent) > 0 ? "+" : ""}${week.change_percent}% estimated value vs the previous full week.`}</p>
      <details className="chart-data"><summary>View daily values</summary><table><caption>Scheduled bookings for the full week</caption><thead><tr><th>Date</th><th>Bookings</th><th>Estimated value</th></tr></thead>
        <tbody>{week.days.map((day) => <tr key={day.date}><td>{dateLabel(day.date, { weekday: "short", day: "numeric" })}</td><td>{day.count}</td><td>{moneyLabel(day.estimated_value, currency)}</td></tr>)}</tbody></table></details>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const { company } = useCompany();
  const today = useToday();
  const [search, setSearch] = useSearchParams();
  const requested = search.get("date");
  const selected = requested && parseCalendarDate(requested) ? requested : today;
  const [visibleMonth, setVisibleMonth] = useState(null);
  const focusDateRef = useRef(null);
  const [metric, setMetric] = useState("estimated_value");
  const [active, setActive] = useState(() => (new Date().getDay() + 6) % 7);
  const month = visibleMonth || selected.slice(0, 7);
  const { data, error, retry } = useDashboardData({ today, date: selected, month });
  const select = (date) => { setVisibleMonth(null); setSearch({ date }); };
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.name || user?.username || "there";
  const hour = new Date().getHours();
  return (
    <div className="home-dashboard">
      <header className="home-welcome">
        <div className="home-welcome-top"><div><p>Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}</p><h1>{name}</h1><p>{dateLabel(today)}{company?.name && ` · ${company.name}`}</p></div></div>
        <div className="home-kpis">
          <div><strong>{data ? data.kpis.jobs : "..."}</strong><span>Jobs today</span></div>
          <div><strong>{data ? moneyLabel(data.kpis.estimated_value, data.currency) : "..."}</strong><span>Estimated value today</span></div>
          <div><strong>{data ? data.kpis.pending : "..."}</strong><span>Pending today</span></div>
        </div>
      </header>
      {requested && !parseCalendarDate(requested) && <p role="alert">Invalid calendar date. Showing today. <Link to="/dashboard">Clear date</Link></p>}
      {!data ? <DashboardFeedback error={error} retry={retry} /> : <>
        <div className="home-insights"><WeeklyChart week={data.week} currency={data.currency} metric={metric} setMetric={setMetric} active={active} setActive={setActive} />
          <BookingCalendar data={data} selected={selected} today={today} month={month} onMonth={setVisibleMonth} onSelect={select} focusDateRef={focusDateRef} /></div>
        <section className="home-daily"><div className="home-panel-heading"><h2>{selected === today ? "Today's bookings" : dateLabel(selected, { month: "long", day: "numeric" })}</h2>
          <div className="home-job-links"><Link to={`/schedule?date=${selected}`}>{data.agenda.count} jobs</Link><Link to={`/new-booking?date=${selected}`} aria-label="New booking" className="home-add-job"><Plus size={18} aria-hidden="true" /></Link></div></div>
          <BookingCards bookings={data.agenda.items} currency={data.currency} onUpdated={retry} />
          {data.agenda.next_page && <Link className="agenda-more" to={`/schedule?date=${selected}`}>View all {data.agenda.count} bookings</Link>}
        </section>
        <p className="dashboard-estimate-note">Estimated values use current service prices, exclude cancelled bookings, and are not collected payments. Dates follow your local calendar.</p>
      </>}
    </div>
  );
}
