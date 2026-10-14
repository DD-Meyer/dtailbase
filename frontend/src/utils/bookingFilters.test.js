import test from "node:test";
import assert from "node:assert/strict";
import { bookingDatePreset, dateRangeError, filterBookings } from "./bookingFilters.js";

test("calendar presets remain local, inclusive and cross year boundaries", () => {
  assert.deepEqual(bookingDatePreset("today", "2026-01-01"), { start: "2026-01-01", end: "2026-01-01" });
  assert.deepEqual(bookingDatePreset("week", "2026-01-01"), { start: "2025-12-28", end: "2026-01-03" });
  assert.deepEqual(bookingDatePreset("week", "2026-03-01"), { start: "2026-03-01", end: "2026-03-07" });
  assert.deepEqual(bookingDatePreset("all", "2026-01-01"), { start: "", end: "" });
});
test("date ranges reject invalid and reversed dates but allow open endpoints", () => {
  assert.ok(dateRangeError("2026-02-30", ""));
  assert.ok(dateRangeError("2026-03-02", "2026-03-01"));
  assert.equal(dateRangeError("", "2026-03-01"), "");
  assert.equal(dateRangeError("2026-03-01", "2026-03-01"), "");
});
test("filters combine search/status/inclusive dates and preserve sorting without mutating input", () => {
  const rows = [
    { id: 1, customer_name: "Maya", customer_lastname: "Bennett", status: "CONFIRMED", booking_date: "2026-01-01", booking_time: "10:00", created_at: "2025-12-30" },
    { id: 2, customer_name: "Maya", customer_lastname: "Bennett", status: "PENDING", booking_date: "2026-01-03", booking_time: "09:00", created_at: "2025-12-31" },
  ];
  const filters = { status: "ALL", search: "MAYA", start: "2026-01-01", end: "2026-01-03", sort: "CREATED_DESC" };
  assert.deepEqual(filterBookings(rows, filters).map(row => row.id), [2, 1]);
  assert.deepEqual(filterBookings(rows, { ...filters, status: "CONFIRMED" }).map(row => row.id), [1]);
  assert.deepEqual(filterBookings(rows, { ...filters, sort: "APPOINTMENT" }).map(row => row.id), [1, 2]);
  assert.deepEqual(rows.map(row => row.id), [1, 2]);
});
