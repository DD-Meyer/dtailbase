// src/utils/formatters.js

/**
 * Converts a UUID to a short 8-character reference string.
 */
export const formatShortRef = (uuid) => {
  if (!uuid) return "N/A";
  return uuid.substring(0, 8).toUpperCase();
};