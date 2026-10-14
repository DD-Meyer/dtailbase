import test from "node:test";
import assert from "node:assert/strict";
import { JOB_LABELS, JOB_TRANSITIONS, jobError, nextJobAction } from "./jobStatus.js";

test("progression presents guarded signing or direct start without inventing a status", () => {
  assert.deepEqual(nextJobAction({ status: "PENDING" }), { label: "Confirm", status: "CONFIRMED" });
  assert.deepEqual(nextJobAction({ status: "CONFIRMED", can_start: false }), { label: "Sign & start", status: "IN_PROGRESS" });
  assert.deepEqual(nextJobAction({ status: "CONFIRMED", can_start: true }), { label: "Start job", status: "IN_PROGRESS" });
  assert.deepEqual(nextJobAction({ status: "IN_PROGRESS" }), { label: "Complete", status: "COMPLETED" });
  assert.equal(JOB_LABELS.IN_PROGRESS, "Started");
});

test("terminal records have no next action or valid transition", () => {
  for (const status of ["COMPLETED", "CANCELLED"]) {
    assert.equal(nextJobAction({ status }), null);
    assert.deepEqual(JOB_TRANSITIONS[status], []);
  }
});

test("status errors retain actionable API details", () => {
  assert.equal(jobError({ response: { data: { status: ["Reload job."] } } }), "status: Reload job.");
  assert.equal(jobError(new Error("Network unavailable")), "Network unavailable");
});
