import { useEffect, useState } from "react";
import api from "../axios_instance";
import { localDate } from "./calendar";

export const BOOKING_STATUSES = {
  PENDING: "Pending", CONFIRMED: "Confirmed", IN_PROGRESS: "In progress",
  COMPLETED: "Completed", CANCELLED: "Cancelled",
};

export function useDashboardData(params) {
  const query = new URLSearchParams(params).toString();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const key = `${query}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    api.get(`dashboard/?${query}`, { signal: controller.signal }).then(({ data }) => {
      if (!data?.kpis || !data?.week || !data?.agenda ||
          !Array.isArray(data.week.days) || data.week.days.length !== 7 ||
          !Array.isArray(data.month_counts) || !Array.isArray(data.agenda.items) ||
          !/^[A-Z]{3}$/.test(data.currency)) {
        throw new Error("Unexpected dashboard response. Please reload and try again.");
      }
      setResult({ key, data });
    }).catch((error) => {
      if (!controller.signal.aborted) {
        const details = typeof error.response?.data === "object" ? error.response.data : null;
        const validation = details && Object.entries(details).map(([field, value]) => `${field}: ${value}`).join(" ");
        setResult({ key, error: details?.detail || validation || error.message || "Could not load your dashboard. Please try again." });
      }
    });
    return () => controller.abort();
  }, [query, key]);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  return {
    data: result?.key === key ? result.data : null,
    error: result?.key === key ? result.error : null,
    retry: () => setRevision((value) => value + 1),
  };
}

export function useToday() {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const interval = setInterval(() => setToday(localDate()), 60000);
    return () => clearInterval(interval);
  }, []);
  return today;
}
