import React from "react";

function OnboardingFlow({
  isOpen,
  onboardingStep,
  onboardingData,
  setOnboardingData,
  setIsOnboardingOpen,
  setOnboardingStep,
  submitOnboarding,
  isSavingOnboarding,
  signupError,
  navigate,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#0b0e14] p-6 text-zinc-100 shadow-2xl md:p-7">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Finish your setup</h3>
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">Step {onboardingStep} of 3</span>
        </div>

        {signupError && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {signupError}
          </div>
        )}

        {onboardingStep === 1 && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Business Email</label>
              <input
                type="email"
                readOnly
                className="w-full rounded-lg border border-zinc-700 bg-[#0b0e14] px-3 py-2.5 text-zinc-300 outline-none"
                value={onboardingData.email}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2.5 outline-none focus:border-blue-500"
                value={onboardingData.password}
                onChange={(e) => setOnboardingData((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Confirm Password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2.5 outline-none focus:border-blue-500"
                value={onboardingData.confirmPassword}
                onChange={(e) => setOnboardingData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
              />
            </div>
          </div>
        )}

        {onboardingStep === 2 && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Company Name</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2.5 outline-none focus:border-blue-500"
                value={onboardingData.companyName}
                onChange={(e) => setOnboardingData((prev) => ({ ...prev, companyName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Owner First Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2.5 outline-none focus:border-blue-500"
                  value={onboardingData.ownerFirstName}
                  onChange={(e) => setOnboardingData((prev) => ({ ...prev, ownerFirstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Owner Last Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2.5 outline-none focus:border-blue-500"
                  value={onboardingData.ownerLastName}
                  onChange={(e) => setOnboardingData((prev) => ({ ...prev, ownerLastName: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {onboardingStep === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Business Phone</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2.5 outline-none focus:border-blue-500"
                  value={onboardingData.phone}
                  onChange={(e) => setOnboardingData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Website</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2.5 outline-none focus:border-blue-500"
                  value={onboardingData.website}
                  onChange={(e) => setOnboardingData((prev) => ({ ...prev, website: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Business Address</label>
              <textarea
                className="min-h-[94px] w-full rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2.5 outline-none focus:border-blue-500"
                value={onboardingData.address}
                onChange={(e) => setOnboardingData((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Default Booking Buffer (minutes)</label>
              <input
                type="number"
                min={0}
                max={120}
                className="w-full rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2.5 outline-none focus:border-blue-500"
                value={onboardingData.bookingBuffer}
                onChange={(e) => setOnboardingData((prev) => ({ ...prev, bookingBuffer: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (onboardingStep === 1) {
                setIsOnboardingOpen(false);
                return;
              }
              setOnboardingStep((prev) => Math.max(1, prev - 1));
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white"
          >
            {onboardingStep === 1 ? "Close" : "Back"}
          </button>

          {onboardingStep < 3 ? (
            <button
              type="button"
              onClick={() => setOnboardingStep((prev) => prev + 1)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submitOnboarding}
              disabled={isSavingOnboarding}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingOnboarding ? "Creating..." : "Create Account"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;