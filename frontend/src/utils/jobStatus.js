export const JOB_LABELS = {
  PENDING: "Pending", CONFIRMED: "Confirmed", IN_PROGRESS: "Started",
  COMPLETED: "Completed", CANCELLED: "Cancelled",
};

export const JOB_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [], CANCELLED: [],
};

export function jobError(error) {
  const data = error.response?.data;
  if (data && typeof data === "object") {
    return Object.entries(data).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(" ") : value}`).join(" ");
  }
  return error.message || "Could not update this job. Please try again.";
}

export function nextJobAction(booking) {
  if (booking.status === "PENDING") return { label: "Confirm", status: "CONFIRMED" };
  if (booking.status === "CONFIRMED") return { label: booking.can_start ? "Start job" : "Sign & start", status: "IN_PROGRESS" };
  if (booking.status === "IN_PROGRESS") return { label: "Complete", status: "COMPLETED" };
  return null;
}
