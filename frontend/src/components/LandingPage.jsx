import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axios_instance";
import { AuthContext } from "../context/AuthContext";
import FeatureSetsSection from "./landing/ComparisonTable";
import LandingFeatures from "./landing/LandingFeatures";
import LandingFooter from "./landing/LandingFooter";
import LandingHero from "./landing/LandingHero";
import LandingNav from "./landing/LandingNav";
import OnboardingFlow from "./landing/OnboardingFlow";
import { FEATURE_SETS, FEATURES } from "./landing/data";

function LandingPage() {
  const { isAuthenticated, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [emailCapture, setEmailCapture] = useState({
    email: "",
  });
  const [signupError, setSignupError] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    ownerFirstName: "",
    ownerLastName: "",
    phone: "",
    website: "",
    address: "",
    bookingBuffer: 15,
  });
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);

  const canStartSignup = useMemo(() => /^\S+@\S+\.\S+$/.test(emailCapture.email.trim()), [emailCapture.email]);

  const extractErrorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (!data) {
      return fallback;
    }
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (typeof data.error === "string") {
      return data.error;
    }
    if (typeof data.message === "string") {
      return data.message;
    }
    const firstError = Object.values(data)[0];
    if (Array.isArray(firstError) && firstError[0]) {
      return String(firstError[0]);
    }
    if (typeof firstError === "string") {
      return firstError;
    }
    return fallback;
  };

  const buildBootstrapUser = (email) => {
    const local = (email.split("@")[0] || "detailer").toLowerCase();
    const safeBase = local.replace(/[^a-z0-9]/g, "").slice(0, 20) || "detailer";
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    return {
      username: `${safeBase}${suffix}`,
      company_name: `${safeBase} Studio`,
      first_name: "New",
      last_name: "Owner",
    };
  };

  const handleTryNowSubmit = async (event) => {
    event.preventDefault();
    setSignupError("");

    if (!canStartSignup) {
      setSignupError("Enter a valid email address to continue.");
      return;
    }

    const bootstrap = buildBootstrapUser(emailCapture.email.trim());
    setOnboardingData((prev) => ({
      ...prev,
      email: emailCapture.email.trim(),
      companyName: prev.companyName || bootstrap.company_name,
      ownerFirstName: prev.ownerFirstName || "",
      ownerLastName: prev.ownerLastName || "",
    }));
    setOnboardingStep(1);
    setIsOnboardingOpen(true);
  };

  const submitOnboarding = async () => {
    setSignupError("");

    if (onboardingData.password.length < 8 || onboardingData.password !== onboardingData.confirmPassword) {
      setSignupError("Choose a password with at least 8 characters and confirm it correctly.");
      setOnboardingStep(1);
      return;
    }

    if (!onboardingData.companyName.trim()) {
      setSignupError("Add your business name to continue.");
      setOnboardingStep(2);
      return;
    }

    try {
      setIsSavingOnboarding(true);
      setIsCreatingAccount(true);

      const bootstrap = buildBootstrapUser(onboardingData.email.trim());

      await api.post("users/", {
        email: onboardingData.email.trim(),
        password: onboardingData.password,
        username: bootstrap.username,
        company_name: onboardingData.companyName.trim(),
        first_name: onboardingData.ownerFirstName.trim() || bootstrap.first_name,
        last_name: onboardingData.ownerLastName.trim() || bootstrap.last_name,
        role: "OWNER",
      });

      const tokenResponse = await api.post("token/", {
        email: onboardingData.email.trim(),
        password: onboardingData.password,
        remember_me: true,
        mobile_app: false,
      });

      login(tokenResponse.data.access, tokenResponse.data.refresh, tokenResponse.data.user, {
        rememberMe: true,
      });

      const companyId = tokenResponse.data?.user?.company_id || tokenResponse.data?.user?.company?.id;

      if (companyId) {
        await api.patch(`company/${companyId}/`, {
          name: onboardingData.companyName.trim(),
          phone: onboardingData.phone,
          email: onboardingData.email.trim(),
          website: onboardingData.website,
          address: onboardingData.address,
          booking_buffer: Number(onboardingData.bookingBuffer) || 15,
        });
      }

      setIsOnboardingOpen(false);
      navigate("/bookings");
    } catch (error) {
      setSignupError(extractErrorMessage(error, "Account created, but setup could not be saved. You can finish setup in Settings."));
    } finally {
      setIsSavingOnboarding(false);
      setIsCreatingAccount(false);
    }
  };

  return (
    <div className="marketing-home relative min-h-screen overflow-hidden text-zinc-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* AURORA BACKGROUND (Supabase-inspired) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.07)_1px,transparent_0)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_85%_60%_at_50%_20%,#000_40%,transparent_100%)]" />
        <div className="absolute -top-24 left-[18%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.55),transparent_65%)] blur-[90px] mix-blend-screen aurora-blob aurora-blob--primary" />
        <div className="absolute top-[20%] right-[8%] h-[540px] w-[540px] rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(16,185,129,0.5),transparent_65%)] blur-[90px] mix-blend-screen aurora-blob aurora-blob--accent" />
        <div className="absolute top-[55%] left-[5%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.45),transparent_65%)] blur-[90px] mix-blend-screen aurora-blob aurora-blob--violet" />
        <div className="absolute top-[40%] right-[22%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.3),transparent_65%)] blur-[90px] mix-blend-screen aurora-blob aurora-blob--rose" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_40%,transparent_40%,rgba(6,9,15,0.55)_80%,rgba(6,9,15,0.9)_100%)]" />
      </div>

      <div className="relative z-10">
        <LandingNav />
        <LandingHero
          emailCapture={emailCapture}
          setEmailCapture={setEmailCapture}
          signupError={signupError}
          isAuthenticated={isAuthenticated}
          isCreatingAccount={isCreatingAccount}
          canStartSignup={canStartSignup}
          onSubmit={handleTryNowSubmit}
        />
        <LandingFeatures features={FEATURES} />
        <FeatureSetsSection featureSets={FEATURE_SETS} />
        <LandingFooter />
      </div>

      <OnboardingFlow
        isOpen={isOnboardingOpen}
        onboardingStep={onboardingStep}
        onboardingData={onboardingData}
        setOnboardingData={setOnboardingData}
        setIsOnboardingOpen={setIsOnboardingOpen}
        setOnboardingStep={setOnboardingStep}
        submitOnboarding={submitOnboarding}
        isSavingOnboarding={isSavingOnboarding}
        signupError={signupError}
        navigate={navigate}
      />
    </div>
  );
}

export default LandingPage;
