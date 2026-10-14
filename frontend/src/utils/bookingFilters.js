import { parseCalendarDate, shiftDate } from "./calendar.js";

export function dateRangeError(start, end) {
  if ((start && !parseCalendarDate(start)) || (end && !parseCalendarDate(end))) return "Enter valid dates between 1900 and 2100.";
  if (start && end && start > end) return "From date must be on or before To date.";
  return "";
}

export function bookingDatePreset(preset, today) {
  if (preset === "today") return { start: today, end: today };
  if (preset === "week") {
    const offset = parseCalendarDate(today).getDay();
    return { start: shiftDate(today, -offset), end: shiftDate(today, 6 - offset) };
  }
  return { start: "", end: "" };
}

export function filterBookings(bookings, { status, search, start, end, sort }) {
  return bookings.filter(booking =>
    (status === "ALL" || booking.status === status) &&
    `${booking.customer_name} ${booking.customer_lastname} ${booking.vehicle_details?.registration}`.toLowerCase().includes(search.toLowerCase()) &&
    (!start || booking.booking_date >= start) && (!end || booking.booking_date <= end)
  ).sort((a, b) => sort === "APPOINTMENT" ?
    `${a.booking_date}T${a.booking_time}`.localeCompare(`${b.booking_date}T${b.booking_time}`) :
    (new Date(a.created_at) - new Date(b.created_at)) * (sort === "CREATED_DESC" ? -1 : 1));
}
