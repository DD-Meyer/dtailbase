import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../axios_instance';
import { AuthContext } from './AuthContext';

const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usageStats, setUsageStats] = useState({ monthly_bookings: 0 });

  const PLAN_HIERARCHY = ["STARTER", "PRO", "ENTERPRISE"];

  const getNextPlan = (currentPlan) => {
    const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan);
    if (currentIndex !== -1 && currentIndex < PLAN_HIERARCHY.length - 1) {
      return PLAN_HIERARCHY[currentIndex + 1];
    }
    return null;
  };

  const fetchCompanyData = async () => {
      if (!isAuthenticated) {
        setCompany(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("company/my_company/");
        setCompany(res.data);
        // If your backend doesn't send usage yet, we can fetch it separately
        // Or better: ensure the backend includes 'booking_count' in the res.data
        if (res.data.usage_stats) {
            setUsageStats(res.data.usage_stats);
        }
      } catch (err) {
        console.error("Error loading company context:", err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchCompanyData();
  }, [isAuthenticated]);

  // Derived values for easy access
  const currentPlan = company?.plan || "STARTER";
  const nextPlan = getNextPlan(currentPlan);
  const planLimits = company?.plan_limits || {
    monthly_bookings: 10,
    max_users: 1,
    max_images_before: 2,
    max_images_after: 2,
    max_image_width: 1280,
    max_image_height: 720,
    max_customers: 1000,
    indemnity_history_limit: 0, // No history saved
    buffer_timer: false,
  };

  // Get the actual number of bookings done this month
  const currentMonthlyUsage = usageStats?.monthly_bookings || 0;

  return (
    <CompanyContext.Provider value={{ 
      company, 
      currentPlan, // "STARTER"
      nextPlan,    // "PRO"
      planLimits, 
      usageStats,
      currentMonthlyUsage,
      refreshCompany: fetchCompanyData, // Expose function to refresh company data after changes
      loading 
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);