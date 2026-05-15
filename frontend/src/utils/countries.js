import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

const countryNames = countries.getNames("en", { select: "official" });

const allCountries = Object.entries(countryNames)
  .map(([code, label]) => ({ code, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const getCountryLabel = (countryCode) => {
  if (!countryCode) return "Unknown";
  return countryNames[countryCode.toUpperCase()] || countryCode.toUpperCase();
};

export const countryOptions = allCountries;
