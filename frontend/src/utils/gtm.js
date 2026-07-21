const GTM_DATA_LAYER = "dataLayer";

const ensureDataLayer = () => {
  if (typeof window === "undefined") {
    return null;
  }

  window[GTM_DATA_LAYER] = window[GTM_DATA_LAYER] || [];
  return window[GTM_DATA_LAYER];
};

export const pushGtmEvent = (payload) => {
  const dataLayer = ensureDataLayer();
  if (!dataLayer || !payload || typeof payload !== "object") {
    return;
  }

  dataLayer.push(payload);
};

export const trackSpaPageView = ({ pathname, search = "", title = "" }) => {
  pushGtmEvent({
    event: "spa_page_view",
    page_path: `${pathname}${search}`,
    page_location: typeof window !== "undefined" ? window.location.href : pathname,
    page_title: title || (typeof document !== "undefined" ? document.title : "DtailBase"),
  });
};

export const trackSubscriptionConfirmed = ({ subscriptionId, planId, value, currency = "USD" }) => {
  pushGtmEvent({
    event: "subscription_confirmed",
    conversion_source: "paypal",
    subscription_id: subscriptionId,
    transaction_id: subscriptionId,
    plan_id: planId,
    value,
    currency,
    ecommerce: {
      transaction_id: subscriptionId,
      value,
      currency,
      items: [
        {
          item_id: planId,
          item_name: planId,
          price: value,
          quantity: 1,
        },
      ],
    },
  });
};