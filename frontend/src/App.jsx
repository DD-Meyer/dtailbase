import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MenuMobile from "./components/MenuMobile";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./components/PublicLayout";
import { CompanyProvider } from './context/CompanyContext';

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Customers from "./pages/Customers";
import Vehicles from "./pages/Vehicles";
import Services from "./pages/Services";
import Bookings from "./pages/Bookings";
import NewBooking from "./pages/NewBooking";
import IndemnityForm from "./components/IndemnityForm";
import AgreementsList from "./components/AgreementsList";
import TeamManagement from "./components/TeamManagement";
import Profile from "./components/Profile";
import Settings from "./pages/Settings";
import IndemnitySettings from "./pages/IndemnitySettings";
import Hero from "./components/Hero";
import BookingDetail from "./pages/BookingDetails";
import About from "./pages/About";
import Products from "./pages/Products";
import Plans from "./pages/Plans";
import Legal from "./pages/Legal";
import Contact from "./pages/Contact";
import ContentPage from "./pages/ContentPage";
import PublicBooking from "./pages/PublicBooking";
import BookingConfirmation from "./pages/BookingConfirmation";
import PublicBookings from "./pages/PublicBookings";
import PaymentSuccess from "./pages/PaymentSuccess";
import Payments from "./pages/Payments";
import ShareBooking from "./pages/ShareBooking";
import SupportAdminInbox from "./pages/SupportAdminInbox";


function AppContent() {
  const { isAuthenticated, user } = useContext(AuthContext); 
  const location = useLocation();
  const getInstalledState = () => {
    const standaloneDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = window.navigator.standalone === true;
    const androidTrustedWebApp = document.referrer?.startsWith("android-app://");

    return standaloneDisplayMode || iosStandalone || androidTrustedWebApp;
  };

  const [isInstalledApp, setIsInstalledApp] = useState(() => getInstalledState());
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(() => !getInstalledState());

  const APP_ALLOWED_ROUTES = [
    "/login",
    "/register",
    "/bookings",
    "/customers",
    "/vehicles",
    "/services",
    "/new-booking",
    "/share-booking",
    "/profile",
    "/team",
    "/settings",
    "/settings/indemnity",
    "/indemnity",
    "/plans",
    "/payments",
    "/payment-success",
    "/admin/support",
  ];

  const APP_ALLOWED_PREFIXES = ["/bookings/", "/indemnity/sign/"];

  const isAllowedInInstalledApp = (pathname) => {
    const normalizedPath = pathname.toLowerCase();
    if (APP_ALLOWED_ROUTES.includes(normalizedPath)) {
      return true;
    }
    return APP_ALLOWED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const syncInstalledState = () => {
      const installed = getInstalledState();
      setIsInstalledApp(installed);
      setShowInstallButton(!installed);
    };

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      if (!getInstalledState()) {
        setShowInstallButton(true);
      }
    };

    const onInstalled = () => {
      setShowInstallButton(false);
      setDeferredInstallPrompt(null);
      setIsInstalledApp(true);
    };

    syncInstalledState();
    mediaQuery.addEventListener("change", syncInstalledState);
    window.addEventListener("pageshow", syncInstalledState);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      mediaQuery.removeEventListener("change", syncInstalledState);
      window.removeEventListener("pageshow", syncInstalledState);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredInstallPrompt) {
      const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
      const manualInstallMessage = isIOS
        ? "To install DtailBase: tap Share in Safari, then choose 'Add to Home Screen'."
        : "To install DtailBase: open your browser menu and choose 'Install app' or 'Add to Home Screen'.";
      window.alert(manualInstallMessage);
      return;
    }

    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
    if (result?.outcome === "accepted") {
      setShowInstallButton(false);
    } else {
      setShowInstallButton(true);
    }
  };

  // 1. Identify ALL public-facing "Marketing" pages
  const publicRoutes = ["/", "/hero", "/about", "/products", "/plans", "/payments", "/contact", "/legal", "/community", "/features", "/security", "/our-Story", "/support", "/help-center", "/tutorials", "/public-booking/:companySlug", "/payment-success", "/book/:companySlug", "/booking-confirmation/:companySlug", "/public/bookings/:companySlug"];
  const isLandingPage = publicRoutes.includes(location.pathname);

  if (isInstalledApp && !isAllowedInInstalledApp(location.pathname)) {
    return <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace />;
  }

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const isMinimalChromeRoute = location.pathname === "/share-booking";
  const isPlatformAdmin = Boolean(user?.is_superuser || user?.is_staff);
  
  // 2. Sidebar/Header only show if Authenticated AND not on any public/auth pages
  const showDashboardChrome = isAuthenticated && !isLandingPage && !isAuthPage && !isMinimalChromeRoute;

  // Example: Legal Page
  const Features = () => (
    <ContentPage 
      title="Engineered for" highlight="Performance."
      intro="The only tool built specifically for high-end detailing studios where precision isn't optional."
      sections={[
        { title: "Smart Scheduling", desc: "Accounts for coating cure times and weather variables automatically.", tag: "CORE", wide: true },
        { title: "WhatsApp CRM", desc: "Automatic follow-ups and maintenance reminders sent directly to client phones.", tag: "AUTOMATION" },
        { title: "Digital Inspections", desc: "360° high-res inspection forms that clients can sign digitally.", tag: "TRUST" },
        { title: "Inventory Tracking", desc: "Track every ml of ceramic coating used and know your exact profit-per-car.", tag: "FINANCE", wide: true }
      ]}
    />
  );

  const Tutorials = () => (
    <ContentPage 
      title="Master the" highlight="Workflow."
      intro="Get the most out of Dtailbase with step-by-step guides, video tutorials, and best practices from top studios."
      sections={[
        { title: "Getting Started", desc: "Setup your first service and booking link in under 10 minutes.", button: "Read Article" },
        { title: "WhatsApp Automation", desc: "How to setup automated follow-ups for ceramic maintenance.", button: "Watch Video", wide: true },
        { title: "Team Management", desc: "Managing multiple technicians and bay assignments.", button: "Learn More" }
      ]}
    />
  );

  const HelpCenter = () => (
    <ContentPage 
      title="We're here to" highlight="Help."
      intro="Whether you're facing a technical issue or need guidance on best practices, our support team has your back."
      sections={[
        { title: "Contact Support", desc: "Get in touch with our support team for personalized assistance.", button: "Contact Us" },
        { title: "FAQs", desc: "Find answers to common questions about using Dtailbase.", button: "View FAQs", wide: true },
        { title: "Community Forums", desc: "Connect with other detailers, share tips, and learn from each other's experiences.", button: "Join the Community" }
      ]}
    />
  );

  const Security = () => (
    <ContentPage 
      title="Bank-Grade" highlight="Protection."
      intro="Your studio's data is your most valuable asset. We guard it like a 1-of-1 hypercar."
      sections={[
        { title: "AES-256 Encryption", desc: "Every byte of data is encrypted at rest and in transit.", tag: "ENCRYPTION" },
        { title: "Data Ownership", desc: "You own your data. Export your entire client list at any time with one click.", tag: "LEGAL", wide: true },
        { title: "99.9% Uptime", desc: "Built on global cloud infrastructure to ensure your business never stops.", tag: "INFRA" }
      ]}
    />
  );

  const OurStory = () => (
    <ContentPage 
      title="Built by" highlight="Detailers."
      intro="We didn't build Dtailbase in a tech office. We built it in the wash bay, between ceramic coatings."
      sections={[
        { title: "The Problem", desc: "General CRM tools are too messy. Detailers need specific workflows for cure times and inspections.", wide: true },
        { title: "The Mission", desc: "To give every detailer the software 'operating system' they need to go from hobbyist to studio owner.", tag: "VISION" }
      ]}
    />
  );

  const Support = () => (
    <ContentPage 
      title="Knowledge" highlight="Base."
      intro="Master the workflow. Learn how to automate your business in under 10 minutes."
      sections={[
        { title: "Quick Start Guide", desc: "Setup your first service and booking link in 5 minutes.", button: "Read Article" },
        { title: "Mastering WhatsApp", desc: "How to setup automated follow-ups for ceramic maintenance.", button: "Watch Video", wide: true },
        { title: "Team Management", desc: "Managing multiple technicians and bay assignments.", button: "Learn More" }
      ]}
    />
  );

  // Example: Community Page
  const CommunityPage = () => (
    <ContentPage 
      title="The" 
      subtitle="Inner Circle" 
      sections={[
        { header: "Global Discord", content: "Connect with 5,000+ detailers worldwide.", link: "#" },
        { header: "Monthly Meetups", content: "Live webinars on business scaling.", link: "#" },
        { header: "Resource Library", content: "Downloadable checklist and SOP templates.", wide: true }
      ]} 
    />
  );

  return (
  
    <div className={isAuthPage ? "auth-wrapper" : (isLandingPage || isMinimalChromeRoute) ? "landing-wrapper" : "app-layout"}>
      
      {/* Sidebar hidden on Hero and Auth pages */}
      {showDashboardChrome && (
        <Sidebar />
      )}

      {showDashboardChrome && (
        <MenuMobile />
      )}
      
      <main className={isLandingPage || isAuthPage || isMinimalChromeRoute ? "full-page-content" : "main-content"}>
        {/* Header hidden on Hero and Auth pages */}
        {showDashboardChrome && (
          <Header showInstallButton={showInstallButton && !isInstalledApp} handleInstallClick={handleInstallClick} />
        )}
        <div className={isLandingPage || isAuthPage || isMinimalChromeRoute ? "" : "page-body"}>
          <Routes>
            {/* Public Routes */}
            <Route path="/book/:companySlug" element={<PublicBooking />} />
            <Route path="/booking-confirmation/:companySlug" element={<BookingConfirmation />} />
            <Route path="/public/bookings/:companySlug" element={<PublicBookings />} />
            
            {/* Landing Page is now the root */}
            <Route path="/" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <Hero isAuthenticated={isAuthenticated} />} />
            <Route path="/hero" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <Navigate to="/" replace />} />
            <Route path="/about" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <PublicLayout><About /></PublicLayout>} />
            <Route path="/products" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <PublicLayout><Products /></PublicLayout>} />
            <Route path="/plans" element={<PublicLayout><Plans /></PublicLayout>} />
            <Route path="/payments" element={<PublicLayout showNav={false} showFooter={false}><Payments /></PublicLayout>} />
            <Route path="/legal" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <PublicLayout><Legal /></PublicLayout>} />
            <Route path="/contact" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <PublicLayout><Contact /></PublicLayout>} />
            <Route path="/payment-success" element={<PublicLayout><PaymentSuccess /></PublicLayout>} />

            {/* Example of using the reusable ContentPage for a new "Community" page */}
            <Route path="/Features" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <Features />} />
            <Route path="/Security" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <Security />} />
            <Route path="/Our-Story" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <OurStory />} />
            <Route path="/Support" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <Support />} />
            <Route path="/community" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <CommunityPage />} />
            <Route path="/tutorials" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <Tutorials />} />
            <Route path="/help-center" element={isInstalledApp ? <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace /> : <HelpCenter />} />


            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
            <Route path="/new-booking" element={<ProtectedRoute><NewBooking /></ProtectedRoute>} />
            <Route path="/share-booking" element={<ProtectedRoute><ShareBooking /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
            <Route path="/indemnity" element={<AgreementsList />} />
            <Route path="/indemnity/sign/:bookingId" element={<IndemnityForm />} />
            <Route path="/settings/indemnity" element={<ProtectedRoute><IndemnitySettings /></ProtectedRoute>} />
            
            {/* Admin Only */}
            <Route path="/team" element={(isAuthenticated && user?.role === 'OWNER') ? <TeamManagement /> : <Navigate to="/bookings" />} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route
              path="/admin/support"
              element={
                <ProtectedRoute>
                  {isPlatformAdmin ? <SupportAdminInbox /> : <Navigate to="/bookings" replace />}
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Install button is now only in the header for all devices */}
        </div>

        {!showDashboardChrome && showInstallButton && !isInstalledApp && (
          <button className="install-app-fab" onClick={handleInstallClick}>
            Install App
          </button>
        )}
      </main>
    </div>
  
  );
}



function App() {
  const paypalInitialOptions = {
    'client-id': import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test',
    currency: 'USD',
    intent: 'subscription',
    vault: true,
  };

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <CompanyProvider>
          <PayPalScriptProvider options={paypalInitialOptions}>
            <AppContent />
          </PayPalScriptProvider>
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;