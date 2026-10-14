import assert from "node:assert/strict";
import { test } from "node:test";
import { dateLabel, localDate, moneyLabel, parseCalendarDate, shiftDate, shiftMonth } from "./calendar.js";

test("calendar dates stay local and reject invalid inputs", () => {
  assert.equal(localDate(new Date(2026, 9, 14, 0)), "2026-10-14");
  assert.equal(localDate(new Date(2026, 9, 14, 23)), "2026-10-14");
  assert.equal(localDate(parseCalendarDate("2024-02-29")), "2024-02-29");
  for (const value of ["2026-02-29", "2026-02-30", "2026-13-01", "2026-2-01", "20261014", "1899-01-01", null]) {
    assert.equal(parseCalendarDate(value), null);
  }
});

test("date movement handles leap days and year boundaries", () => {
  assert.equal(shiftDate("2024-02-28", 1), "2024-02-29");
  assert.equal(shiftDate("2024-02-29", 1), "2024-03-01");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDate("2027-01-01", -1), "2026-12-31");
  assert.equal(shiftDate("2026-10-31", 1), "2026-11-01");
});

test("month movement does not carry over invalid end-of-month days", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2027-01", -1), "2026-12");
  assert.equal(shiftMonth("2024-03", -1), "2024-02");
});

test("labels support derived boundary weeks and format actual currency", () => {
  assert.match(dateLabel("1899-12-31", { year: "numeric" }), /1899/);
  assert.match(dateLabel("2101-01-01", { year: "numeric" }), /2101/);
  assert.equal(moneyLabel("430.00", "USD"), new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(430));
  assert.equal(moneyLabel("0.00", "ZAR"), new Intl.NumberFormat(undefined, { style: "currency", currency: "ZAR" }).format(0));
});
