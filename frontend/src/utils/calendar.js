export function localDate(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function parseCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return year >= 1900 && year <= 2100 && localDate(date) === value ? date : null;
}

export function shiftDate(value, days) {
  const date = parseCalendarDate(value);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

export function shiftMonth(value, offset) {
  const date = parseCalendarDate(`${value}-01`);
  date.setMonth(date.getMonth() + offset);
  return localDate(date).slice(0, 7);
}

export function dateLabel(value, options = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, options);
}

export function moneyLabel(value, currency) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value));
}
