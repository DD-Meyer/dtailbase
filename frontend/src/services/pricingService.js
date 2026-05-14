const isObject = (value) => value !== null && typeof value === "object";

const getContentType = (response) =>
  (response?.headers?.["content-type"] || response?.headers?.["Content-Type"] || "").toLowerCase();

export const isValidPricingPayload = (data) => {
  if (!isObject(data)) {
    return false;
  }

  const hasPricingObject = isObject(data.pricing) && isObject(data.pricing.PRO) && isObject(data.pricing.ENTERPRISE);
  const hasPlansObject = isObject(data.plans) && isObject(data.plans.PRO) && isObject(data.plans.ENTERPRISE);
  return Boolean(data.currency && (hasPricingObject || hasPlansObject));
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

  throw lastError || new Error("Failed to fetch pricing payload");
};
