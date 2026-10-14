import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Plus, Search, Share2, SlidersHorizontal } from "lucide-react";
import api from "../axios_instance";
import { useCompany } from "../context/CompanyContext";
import JobRecord from "../components/JobRecord";
import UpgradeValueCards from "../components/UpgradeValueCards";
import PlanUsageBanner from "../components/PlanUsageBanner";
import { JOB_LABELS, jobError } from "../utils/jobStatus";
import { dateLabel, localDate } from "../utils/calendar";
import { bookingDatePreset, dateRangeError, filterBookings } from "../utils/bookingFilters";
import { showConfirm, showToast } from "../utils/uiFeedback";
import "../styles/Bookings.css";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(() => window.innerWidth > 767);
  const [sort, setSort] = useState("CREATED_DESC");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const { company, planLimits, usageStats, nextPlan } = useCompany();
  const navigate = useNavigate();
  const monthlyUsage = usageStats?.monthly_bookings || 0;
  const monthlyLimit = planLimits?.monthly_bookings;
  const limitReached = company?.plan === "STARTER" && monthlyLimit != null && monthlyUsage >= monthlyLimit;
  const fetchBookings = useCallback(async () => {
    setError("");
    try {
      const response = await api.get("bookings/");
      if (!Array.isArray(response.data)) throw new Error("Unexpected booking response.");
      setBookings(response.data);
    } catch (failure) { setError(jobError(failure)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    fetchBookings();
    window.addEventListener("focus", fetchBookings);
    return () => window.removeEventListener("focus", fetchBookings);
  }, [fetchBookings]);
  const copyTracking = async () => {
    if (!company?.slug) { showToast("Company information is not available.", "error"); return; }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/public/bookings/${company.slug}`);
      showToast("Tracking link copied.", "success");
    } catch (failure) { showToast(`Could not copy the link: ${failure.message}`, "error"); }
  };
  const remove = async (booking) => {
    if (!await showConfirm({ title: "Delete booking", message: "Are you sure you want to delete this booking?", confirmText: "Delete", danger: true })) return;
    try {
      await api.delete(`bookings/${booking.id}/`);
      await fetchBookings();
      showToast("Booking deleted.", "success");
    } catch (failure) { showToast(jobError(failure), "error"); }
  };
  const rangeError = dateRangeError(start, end);
  const filtered = rangeError ? [] : filterBookings(bookings, { status, search, start, end, sort });
  const activeCount = Number(Boolean(search)) + Number(Boolean(start || end)) + Number(status !== "ALL") + Number(sort !== "CREATED_DESC");
  const applyPreset = (preset) => {
    const range = bookingDatePreset(preset, localDate());
    setStart(range.start);
    setEnd(range.end);
  };
  const rangeLabel = rangeError ? "Check appointment dates" : !start && !end ? "All appointment dates" :
    `${start ? dateLabel(start, { month: "short", day: "numeric", year: "numeric" }) : "Any date"} – ${end ? dateLabel(end, { month: "short", day: "numeric", year: "numeric" }) : "Any date"}`;
  return <div className="page-container bookings-record-page">
    <div className="card-banner mb-6"><div className="page-banner">
      <div className="page-banner-copy"><h1>Bookings</h1><p>Your jobs, from confirmation to completion.</p></div>
      <div className="page-banner-actions">
        <button className="btn btn-secondary" onClick={copyTracking}><Copy size={16} aria-hidden="true" /> Copy tracking link</button>
        <button className="btn btn-secondary" onClick={() => navigate("/share-booking")}><Share2 size={16} aria-hidden="true" /> Share booking</button>
        {limitReached ? <button className="btn btn-premium" onClick={() => navigate("/plans")}>Upgrade for more bookings</button> :
          <button className="btn btn-primary" onClick={() => navigate("/new-booking")}><Plus size={16} aria-hidden="true" />New booking</button>}
      </div>
    </div></div>
    <UpgradeValueCards currentPlan={company?.plan} />
    <PlanUsageBanner metrics={[{ label: "Bookings this month", used: monthlyUsage, total: monthlyLimit ?? null }]} currentPlan={company?.plan} nextPlan={nextPlan} />
    <div className="record-list-toolbar">
      <div className="search-wrapper bookings-search-wrapper"><input className="search-input bookings-search-input" aria-label="Search bookings by customer or registration" placeholder="Search customer or plate..." value={search} onChange={(event) => setSearch(event.target.value)} /><Search className="search-icon" size={18} aria-hidden="true" /></div>
      <button className="btn btn-secondary" aria-expanded={showFilters} aria-controls="booking-filters" onClick={() => setShowFilters((value) => !value)}><SlidersHorizontal size={16} aria-hidden="true" />Filters{activeCount ? ` (${activeCount} active)` : ""}</button>
    </div>
    {showFilters && <section id="booking-filters" className="record-filters" aria-label="Booking filters">
      <fieldset className="filter-date-group"><legend>Appointment dates</legend>
        <div className="filter-date-inputs">
          <label>From<input type="date" min="1900-01-01" max="2100-12-31" aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? "booking-date-error" : undefined} value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label>To<input type="date" min="1900-01-01" max="2100-12-31" aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? "booking-date-error" : undefined} value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        </div>
        <div className="filter-presets">{[["today", "Today"], ["week", "This week"], ["all", "All dates"]].map(([preset, label]) => {
          const range = bookingDatePreset(preset, localDate());
          return <button key={preset} aria-pressed={start === range.start && end === range.end} onClick={() => applyPreset(preset)}>{label}</button>;
        })}</div>
      </fieldset>
      <fieldset><legend>Job status</legend><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option>{Object.entries(JOB_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></fieldset>
      <fieldset><legend>Sort order</legend><label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="CREATED_DESC">Recently added</option><option value="CREATED_ASC">Oldest added</option><option value="APPOINTMENT">Appointment time</option></select></label></fieldset>
    </section>}
    {rangeError && <p id="booking-date-error" role="alert" className="job-action-error">{rangeError}</p>}
    <div className="filter-results"><p aria-live="polite">{rangeLabel}{!loading && !rangeError && !error ? ` · ${filtered.length} bookings` : ""}</p>
      {activeCount > 0 && <button className="btn btn-secondary" onClick={() => { setSearch(""); setStart(""); setEnd(""); setStatus("ALL"); setSort("CREATED_DESC"); }}>Clear filters</button>}
    </div>
    {error && <div role="alert" className="record-fetch-error"><p>{error}</p><button className="btn btn-secondary" onClick={fetchBookings}>Try again</button></div>}
    {loading ? <p role="status">Loading bookings...</p> : !rangeError && <div className="job-record-list">
      {filtered.map((booking) => <JobRecord key={booking.id} booking={booking} currency={company?.currency || "USD"} onUpdated={fetchBookings} onDelete={() => remove(booking)} />)}
      {!filtered.length && !error && <p className="record-empty">No bookings match your filters.</p>}
    </div>}
  </div>;
}
