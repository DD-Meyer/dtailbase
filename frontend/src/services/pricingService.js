const isObject = (value) => value !== null && typeof value === "object";

export const DEFAULT_PRICE_FALLBACKS = {
  USD: { PRO: "129.00", ENTERPRISE: "299.00" },
};

export const DEFAULT_PLAN_FEATURES = {
  STARTER: [
    "10 Monthly Bookings",
    "1 User Account",
    "2 Before / 2 After Photos (Up to 1280x720)",
    "Basic Digital Waivers",
    "Up to 1,000 Customers",
  ],
  PRO: [
    "60 Monthly Bookings",
    "10 Team Members",
    "10 Before / 10 After HD Condition Captures (1920x1080)",
    "Store up to 5 Templates (1 Active)",
    "Manual template selection per booking",
    "Legally-Binding Asset Vault (Auto-Bound PDFs)",
    "Lightweight High-Speed Bay Architecture",
    "Buffer Timer Enabled",
    "Up to 5,000 Customers",
  ],
  ENTERPRISE: [
    "Unlimited Bookings",
    "50 Team Members",
    "25 Before / 25 After 4K Condition Captures (3840x2160)",
    "20 Smart-Linked Service Templates",
    "Automatically binds the exact liability contract per booked service",
    "100GB Premium Cloud Vault Storage",
    "Enterprise Asset Vault + Forever Booking Sync",
    "Lifetime Legal History",
    "Priority Bay Support",
    "No-Lag Upload Pipeline for High-Res Logs",
    "Unlimited Customers",
  ],
};

const getContentType = (response) =>
  (response?.headers?.["content-type"] || response?.headers?.["Content-Type"] || "").toLowerCase();

export const isValidPricingPayload = (data) => {
  if (!isObject(data)) {
    return false;
  }

  const hasPricingObject = isObject(data.pricing) && isObject(data.pricing.PRO) && isObject(data.pricing.ENTERPRISE);
  const hasPlansObject = isObject(data.plans) && isObject(data.plans.PRO) && isObject(data.plans.ENTERPRISE);
  // Accept features as part of plans
  return Boolean(data.currency && (hasPricingObject || hasPlansObject));
};

export const extractPlanFeatures = (plansData, planId) => {
  const fallback = DEFAULT_PLAN_FEATURES[planId] || [];
  const planData = plansData?.[planId];

  if (!isObject(planData)) {
    return fallback;
  }

  if (Array.isArray(planData.features)) {
    return planData.features;
  }

  if (Array.isArray(planData.display_features)) {
    return planData.display_features;
  }

  if (isObject(planData.features) && Array.isArray(planData.features.features)) {
    return planData.features.features;
  }

  return fallback;
};

const warnInvalidPayload = (source, response, attemptedUrl) => {
  const contentType = getContentType(response) || "unknown";
  const dataType = typeof response?.data;
  console.warn(
    `[pricing] ${source}: invalid payload from '${attemptedUrl}' (content-type='${contentType}', data type='${dataType}').`
  );
};

export const fetchPricingWithFallback = async (apiClient, source) => {
  const attempts = [
    "/payments/plans/",
    "payments/plans/",
    `${window.location.origin}/payments/plans/`,
  ];

  let lastError = null;

  for (const url of attempts) {
    try {
      const response = await apiClient.get(url);
      if (isValidPricingPayload(response?.data)) {
        return response;
      }

      warnInvalidPayload(source, response, url);
      lastError = new Error(`Unexpected pricing payload from ${url}`);
    } catch (error) {
      lastError = error;
      console.warn(`[pricing] ${source}: request failed for '${url}':`, error?.message || error);
    }
  }

  // Fallback: provide static plan features and new prices
  return {
    data: {
      currency: "USD",
      pricing: {
        STARTER: { amount: 0 },
        PRO: { amount: 129 },
        ENTERPRISE: { amount: 299 },
      },
      plans: {
        STARTER: {
          features: DEFAULT_PLAN_FEATURES.STARTER,
        },
        PRO: {
          features: DEFAULT_PLAN_FEATURES.PRO,
        },
        ENTERPRISE: {
          features: DEFAULT_PLAN_FEATURES.ENTERPRISE,
        },
      },
    },
  };
};
