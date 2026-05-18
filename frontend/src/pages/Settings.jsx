import { useState, useEffect, useContext } from "react";
import api from "../axios_instance";
import "../styles/Settings.css";
import { useCompany } from "../context/CompanyContext";
import UpgradeValueCards from "../components/UpgradeValueCards";
import { Link, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  Building2,
  MapPin,
  Clock3,
  CreditCard,
  Globe,
  BadgeDollarSign,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  Trash2,
  Power,
} from "lucide-react";
import { countryOptions, getCountryLabel } from "../utils/countries";
import { showConfirm, showPrompt } from "../utils/uiFeedback";

function Settings() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [billingError, setBillingError] = useState("");
  const [billingSuccess, setBillingSuccess] = useState("");
  const [billingSummary, setBillingSummary] = useState(null);
  const [isLoadingBillingSummary, setIsLoadingBillingSummary] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [verificationChecks, setVerificationChecks] = useState(null);
  const [requestedCountryCode, setRequestedCountryCode] = useState("US");
  const [verificationDocument, setVerificationDocument] = useState(null);
  const [isSubmittingLocationChange, setIsSubmittingLocationChange] = useState(false);
  const [isProcessingLifecycle, setIsProcessingLifecycle] = useState(false);
  const { logout } = useContext(AuthContext);
  const { planLimits, currentPlan } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") || "business").toLowerCase() === "billing"
    ? "billing"
    : "business";

  const setActiveTab = (tab) => {
    if (tab === "billing") {
      setSearchParams({ tab: "billing" });
      return;
    }
    setSearchParams({});
  };

  const fetchCompany = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await api.get("company/my_company/");
      setCompany(res.data);
      setRequestedCountryCode((res.data?.country_code || "US").toUpperCase());
    } catch (err) {
      console.error("Error loading settings", err);
      const statusCode = err?.response?.status;
      if (statusCode >= 500) {
        setFetchError("Server error while loading business settings. Please try again in a moment.");
      } else if (statusCode === 404) {
        setFetchError("Company profile was not found for this account.");
      } else {
        setFetchError("Unable to load business settings right now. Please retry.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  useEffect(() => {
    const fetchBillingSummary = async () => {
      if (activeTab !== "billing") return;
      setIsLoadingBillingSummary(true);
      try {
        const res = await api.get("payments/billing-summary/");
        setBillingSummary(res.data || null);
      } catch {
        setBillingSummary(null);
        setBillingError("Unable to load latest billing details right now.");
      } finally {
        setIsLoadingBillingSummary(false);
      }
    };

    fetchBillingSummary();
  }, [activeTab, company?.id]);

  const handleSave = async (e) => {
      e.preventDefault();
      try {
        const normalizeWebsite = (value) => {
        const raw = (value || "").trim();
        if (!raw) return "";
        if (/^https?:\/\//i.test(raw)) return raw;
        return `https://${raw}`;
        };

        const payload = {
        name: company.name || "",
        website: normalizeWebsite(company.website),
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        opening_time: company.opening_time || "09:00",
        closing_time: company.closing_time || "17:00",
        booking_buffer: Number(company.booking_buffer || 15),
        };

        await api.patch(`company/${company.id}/`, payload);
        setCompany((prev) => ({ ...prev, website: payload.website }));
          setMsg("Settings updated successfully!");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => setMsg(""), 3000);
      } catch (err) {
          // 🛡️ Catch the Pro Feature validation error from Django
          const errorData = err.response?.data;
          if (errorData?.booking_buffer) {
              setMsg(errorData.booking_buffer);
        } else if (errorData?.website) {
          setMsg(Array.isArray(errorData.website) ? errorData.website[0] : String(errorData.website));
        } else if (errorData?.email) {
          setMsg(Array.isArray(errorData.email) ? errorData.email[0] : String(errorData.email));
        } else if (errorData && typeof errorData === "object") {
          const firstError = Object.values(errorData).flat?.()[0] || "Failed to update. Check all fields.";
          setMsg(String(firstError));
          } else {
              setMsg("Failed to update. Check all fields.");
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleLocationChangeRequest = async () => {
    setBillingError("");
    setBillingSuccess("");
    setVerificationChecks(null);

    if (!requestedCountryCode) {
      setBillingError("Please select a country.");
      return;
    }

    if (!verificationDocument) {
      setBillingError("Please upload a verification document (bank confirmation, etc). ");
      return;
    }

    const formData = new FormData();
    formData.append("country_code", requestedCountryCode);
    formData.append("verification_document", verificationDocument);

    setIsSubmittingLocationChange(true);
    try {
      const res = await api.post("company/location-verification/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setCompany((prev) => ({
        ...prev,
        country_code: res.data.country_code,
        currency: res.data.currency,
        requested_country_code: requestedCountryCode,
        requested_currency: requestedCountryCode === "ZA" ? "ZAR" : "USD",
        location_verification_status: res.data.status,
        location_verification_score: res.data.score,
        location_verification_notes: res.data.message,
      }));

      setBillingSuccess(
        res.data.verified
          ? "Location verified and updated successfully."
          : `Document uploaded, but automatic verification failed: ${res.data.message || "name match not strong enough"}`
      );
      setVerificationChecks(res.data?.checks || null);
      setVerificationDocument(null);
    } catch (err) {
      const errorData = err.response?.data;
      const details = errorData?.details ? ` (${errorData.details})` : "";
      const errorText = (errorData?.error || errorData?.message || "Failed to verify location document.") + details;
      setBillingError(errorText);
      setVerificationChecks(errorData?.checks || null);
    } finally {
      setIsSubmittingLocationChange(false);
    }
  };

  const verificationChecklistItems = [
    { key: "company", label: "Company Name" },
    { key: "country", label: "Selected Country" },
    { key: "address", label: "Business Address" },
  ];

  const handleDeactivateAccount = async () => {
    const confirmed = await showConfirm({
      title: "Deactivate account",
      message: "Deactivate this account? This will disable all users immediately.",
      confirmText: "Deactivate",
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    setIsProcessingLifecycle(true);
    try {
      await api.post("company/account-lifecycle/", { action: "deactivate" });
      logout();
      window.location.href = "/login";
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed to deactivate account.");
    } finally {
      setIsProcessingLifecycle(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = await showPrompt({
      title: "Delete account",
      message: `Type your company name exactly to delete: ${company.name}`,
      placeholder: "Company name",
      confirmText: "Delete",
      danger: true,
    });
    if (!confirmation) {
      return;
    }

    setIsProcessingLifecycle(true);
    try {
      await api.post("company/account-lifecycle/", {
        action: "delete",
        confirmation_name: confirmation,
      });
      logout();
      window.location.href = "/";
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed to delete account.");
    } finally {
      setIsProcessingLifecycle(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = await showConfirm({
      title: "Cancel subscription",
      message: "Cancel your subscription and downgrade to Starter?",
      confirmText: "Cancel Subscription",
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    setBillingError("");
    setBillingSuccess("");
    setIsCancellingSubscription(true);
    try {
      const res = await api.post("payments/cancel-subscription/");
      const message = res?.data?.message || "Subscription cancelled and downgraded to Starter.";
      setBillingSuccess(message);
      setCompany((prev) => ({
        ...prev,
        plan: "STARTER",
        is_subscription_active: false,
      }));

      const billingRes = await api.get("payments/billing-summary/");
      setBillingSummary(billingRes.data || null);
    } catch (err) {
      setBillingError(err?.response?.data?.error || "Failed to cancel subscription right now.");
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  if (loading) return <div className="p-10 ml-64 text-gray-500">Loading business profile...</div>;
  if (!company) {
    return (
      <div className="settings-wrapper">
        <div className="settings-container">
          <div className="settings-card">
            <h2 className="card-title">Business Settings</h2>
            {!!fetchError && <p className="alert-error">{fetchError}</p>}
            <p className="settings-note">Unable to load company settings right now. Please refresh or try again shortly.</p>
            <div className="save-button-container">
              <button type="button" className="btn-save" onClick={fetchCompany}>Retry Loading Settings</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const billingCountryLabel = getCountryLabel(company?.country_code || "US");
  const billingCurrency = 'USD';
  const effectivePlan = (billingSummary?.plan || company?.plan || currentPlan || "STARTER").toUpperCase();
  const isStarterPlan = effectivePlan === "STARTER";
  const hasActiveSubscription = Boolean(billingSummary?.is_subscription_active || company?.is_subscription_active);

  const formatMoney = (amount, currencyCode = "USD") => {
    if (amount === null || amount === undefined || amount === "") return "Not available";
    const parsed = Number(amount);
    if (Number.isNaN(parsed)) return `${amount} ${currencyCode}`;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsed);
  };

  const formatDateTime = (value) => {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";
    return date.toLocaleString();
  };

  return (
  <div className="settings-wrapper">
    <div className="settings-container settings-layout">
      <aside className="settings-submenu" aria-label="Settings sections">
        <button
          type="button"
          className={`settings-submenu-item ${activeTab === "business" ? "active" : ""}`}
          onClick={() => setActiveTab("business")}
        >
          <Building2 size={16} aria-hidden="true" />
          <span>Business Profile</span>
        </button>
        <button
          type="button"
          className={`settings-submenu-item ${activeTab === "billing" ? "active" : ""}`}
          onClick={() => setActiveTab("billing")}
        >
          <CreditCard size={16} aria-hidden="true" />
          <span>Billing</span>
        </button>
      </aside>

      <div className="settings-panel">
      
      <header className="settings-header">
        <div>
          <h1>{activeTab === "billing" ? "Billing Settings" : "Business Settings"}</h1>
          <p>
            {activeTab === "billing"
              ? <>Review subscription, payment method, and billing controls for <strong>{company.name}</strong></>
              : <>Configure the public profile for <strong>{company.name}</strong></>}
          </p>
          {!!company.website && (
            <a href={company.website} target="_blank" rel="noreferrer" className="view-site-link">View Website</a>
          )}
        </div>
        <span className="plan-badge">{company.is_active ? "Active Account" : "Paused"}</span>
      </header>

      {msg && <div className="alert-success"><CheckCircle2 size={16} aria-hidden="true" /> {msg}</div>}
      {!!fetchError && <div className="alert-error">{fetchError}</div>}

      <UpgradeValueCards currentPlan={currentPlan} />

      {activeTab === "business" && (
        <form onSubmit={handleSave}>
        
        {/* Section: Brand Identity */}
        <section className="settings-card">
          <h2 className="card-title"><Building2 size={18} aria-hidden="true" /> Brand Identity</h2>
          <div className="form-grid">
            <div className="input-group">
              <label>Business Name</label>
              <input 
                value={company.name || ""} 
                onChange={e => setCompany({...company, name: e.target.value})} 
              />
            </div>
            <div className="input-group">
              <label>Slug (URL Handle)</label>
              <input className="input-readonly" value={company.slug || ""} readOnly />
            </div>
            <div className="input-group full-width">
              <label>Website</label>
              <input 
                value={company.website || ""} 
                onChange={e => setCompany({...company, website: e.target.value})} 
              />
            </div>
          </div>
        </section>

        {/* Section: Contact & Location */}
        <section className="settings-card">
          <h2 className="card-title"><MapPin size={18} aria-hidden="true" /> Contact & Location</h2>
          <div className="form-grid">
            <div className="input-group">
              <label>Public Email</label>
              <input 
                value={company.email || ""} 
                onChange={e => setCompany({...company, email: e.target.value})} 
              />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input 
                value={company.phone || ""} 
                onChange={e => setCompany({...company, phone: e.target.value})} 
              />
            </div>
            <div className="input-group full-width">
              <label>Physical Address</label>
              <textarea 
                value={company.address || ""} 
                onChange={e => setCompany({...company, address: e.target.value})} 
              />
            </div>
          </div>
        </section>

        {/* Section: Operations */}
        <section className="settings-card">
          <h2 className="card-title"><Clock3 size={18} aria-hidden="true" /> Operational Rules</h2>
          <div className="form-grid">
            <div className="input-group">
              <label>Opening Time</label>
              <input 
                type="time" 
                value={company.opening_time || ""} 
                onChange={e => setCompany({...company, opening_time: e.target.value})} 
              />
            </div>
            <div className="input-group">
              <label>Closing Time</label>
              <input 
                type="time" 
                value={company.closing_time || ""} 
                onChange={e => setCompany({...company, closing_time: e.target.value})} 
              />
            </div>
            <div className="input-group full-width">
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <label>Booking Buffer</label>
                  <span style={{color: planLimits.buffer_timer ? '#3b82f6' : '#94a3b8', fontWeight: 'bold'}}>
                      {company.booking_buffer} min 
                      {!planLimits.buffer_timer && " (Pro Only)"}
                  </span>
              </div>
              <input 
                  type="range" 
                  className={`buffer-range ${!planLimits.buffer_timer ? 'opacity-50 cursor-not-allowed' : ''}`}
                  min="0" max="120" step="5" // Reduced max to 120 (2 hours) for better UX
                  value={company.booking_buffer || 15} 
                  disabled={!planLimits.buffer_timer} // 🛡️ Disable the slider if not allowed
                  onChange={e => setCompany({...company, booking_buffer: e.target.value})} 
              />
            </div>
          </div>
        </section>

        <div className="save-button-container">
          <button type="submit" className="btn-save">Save Company Profile</button>
        </div>

        <section className="settings-card settings-card-danger">
          <h2 className="card-title"><AlertTriangle size={18} aria-hidden="true" /> Account Controls</h2>
          <p className="settings-note">
            Deactivating will disable all users and block access. Deleting will permanently remove this company and all related data.
          </p>
          <div className="danger-actions">
            <button
              type="button"
              className="btn-danger-outline"
              onClick={handleDeactivateAccount}
              disabled={isProcessingLifecycle}
            >
              <Power size={16} aria-hidden="true" />
              {isProcessingLifecycle ? "Processing..." : "Deactivate Account"}
            </button>
            <button
              type="button"
              className="btn-danger-solid"
              onClick={handleDeleteAccount}
              disabled={isProcessingLifecycle}
            >
              <Trash2 size={16} aria-hidden="true" />
              {isProcessingLifecycle ? "Processing..." : "Delete Account"}
            </button>
          </div>
        </section>
        </form>
      )}

      {activeTab === "billing" && (
        <>
          <section className="settings-card">
            <h2 className="card-title"><CreditCard size={18} aria-hidden="true" /> Subscription & Payment Details</h2>
            {billingSuccess && (
              <p className="verification-status verification-approved">{billingSuccess}</p>
            )}
            {billingError && (
              <p className="verification-status verification-rejected">{billingError}</p>
            )}

            {isLoadingBillingSummary ? (
              <p className="settings-note">Loading billing details...</p>
            ) : (
              <div className="form-grid">
                <div className="input-group">
                  <label>Current Plan</label>
                  <input className="input-readonly" value={effectivePlan} readOnly />
                </div>

                <div className="input-group">
                  <label>Subscription Status</label>
                  <input className="input-readonly" value={billingSummary?.subscription_status || (company?.is_subscription_active ? "ACTIVE" : "INACTIVE")} readOnly />
                </div>

                <div className="input-group">
                  <label><BadgeDollarSign size={14} aria-hidden="true" /> Monthly Charge</label>
                  <input
                    className="input-readonly"
                    value={formatMoney(billingSummary?.monthly_amount || "0.00", billingCurrency)}
                    readOnly
                  />
                </div>

                <div className="input-group">
                  <label>Billing Cycle</label>
                  <input className="input-readonly" value={billingSummary?.billing_cycle || "MONTHLY"} readOnly />
                </div>

                <div className="input-group">
                  <label>Next Renewal Date</label>
                  <input className="input-readonly" value={formatDateTime(billingSummary?.next_billing_time)} readOnly />
                </div>

                <div className="input-group">
                  <label>Last Payment</label>
                  <input
                    className="input-readonly"
                    value={billingSummary?.last_payment
                      ? `${formatMoney(billingSummary.last_payment.amount, billingSummary.last_payment.currency)} on ${formatDateTime(billingSummary.last_payment.time)}`
                      : "Not available"}
                    readOnly
                  />
                </div>

                <div className="input-group">
                  <label>Payment Method</label>
                  <input className="input-readonly" value={billingSummary?.payment_method?.display || "Not available"} readOnly />
                </div>

                <div className="input-group">
                  <label>Subscription ID</label>
                  <input
                    className="input-readonly"
                    value={isStarterPlan ? "Not available" : (billingSummary?.paypal_subscription_id || "Not available")}
                    readOnly
                  />
                </div>

                <div className="input-group full-width">
                  <label>Billing Controls</label>
                  <div className="billing-actions">
                    <Link to="/plans" className="btn-save btn-billing-manage">
                      {isStarterPlan ? "Upgrade Plan" : "Change / Downgrade Plan"}
                    </Link>
                    {!isStarterPlan && hasActiveSubscription && Boolean(billingSummary?.cancel_available) && (
                      <button
                        type="button"
                        className="btn-danger-outline"
                        onClick={handleCancelSubscription}
                        disabled={isCancellingSubscription}
                      >
                        {isCancellingSubscription ? "Cancelling..." : "Cancel Subscription"}
                      </button>
                    )}
                  </div>
                  {!isStarterPlan && hasActiveSubscription && Boolean(billingSummary?.cancel_available) && (
                    <p className="settings-note billing-footnote">
                      Canceling ends recurring billing and downgrades this account to Starter.
                    </p>
                  )}
                </div>

                <div className="input-group full-width">
                  <label>Billing Notice</label>
                  <p className="settings-note">
                    This admin account is registered in <strong>{billingCountryLabel}</strong>. All subscriptions are billed in <strong>US Dollars</strong>.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="settings-card">
            <h2 className="card-title"><Globe size={18} aria-hidden="true" /> Billing Location & Verification</h2>
            <div className="form-grid">
              <div className="input-group">
                <label><Globe size={14} aria-hidden="true" /> Registered Country</label>
                <input className="input-readonly" value={`${billingCountryLabel} (${company?.country_code || "US"})`} readOnly />
              </div>

              <div className="input-group">
                <label><BadgeDollarSign size={14} aria-hidden="true" /> Billing Currency</label>
                <input className="input-readonly" value={company?.currency || "USD"} readOnly />
              </div>

              <div className="input-group full-width">
                <label><Globe size={14} aria-hidden="true" /> Request Location Change</label>
                <div className="location-change-form">
                  <select
                    value={requestedCountryCode}
                    onChange={(e) => setRequestedCountryCode(e.target.value)}
                    className="country-select"
                  >
                    {countryOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label} ({option.code})
                      </option>
                    ))}
                  </select>

                  <label className="upload-field">
                    <FileText size={15} aria-hidden="true" />
                    {verificationDocument ? verificationDocument.name : "Upload bank confirmation / proof document"}
                    <input
                      type="file"
                      accept=".pdf,.txt,.csv,.doc,.docx"
                      onChange={(e) => setVerificationDocument(e.target.files?.[0] || null)}
                    />
                  </label>

                  <button type="button" className="btn-save" disabled={isSubmittingLocationChange} onClick={handleLocationChangeRequest}>
                    <Upload size={15} aria-hidden="true" />
                    {isSubmittingLocationChange ? "Verifying..." : "Submit Verification"}
                  </button>
                </div>
              </div>

              {company?.location_verification_status && company.location_verification_status !== "NONE" && (
                <div className="input-group full-width">
                  <label>Latest Verification Result</label>
                  <p className={`verification-status verification-${company.location_verification_status.toLowerCase()}`}>
                    Status: {company.location_verification_status} | Score: {(Number(company.location_verification_score || 0) * 100).toFixed(1)}%
                  </p>
                  {!!company?.location_verification_notes && (
                    <p className="settings-note">{company.location_verification_notes}</p>
                  )}
                </div>
              )}

              {!!verificationChecks && (
                <div className="input-group full-width">
                  <label>Verification Checklist</label>
                  <div className="verification-checklist">
                    {verificationChecklistItems.map((item) => {
                      const check = verificationChecks[item.key];
                      const isPass = Boolean(check?.verified);
                      const reason = check?.reason || "No evidence result returned.";
                      return (
                        <div key={item.key} className="verification-check-item">
                          <span className={`check-badge ${isPass ? "pass" : "fail"}`}>
                            {isPass ? "PASS" : "FAIL"}
                          </span>
                          <div className="check-content">
                            <strong>{item.label}</strong>
                            <p>{reason}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
      </div>
    </div>
  </div>
);
}

export default Settings;