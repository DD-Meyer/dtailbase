// Floating navigation menu for mobile devices
import React from "react";
import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";


function MenuMobile() {
  const location = useLocation();
    const { user } = useContext(AuthContext);
    // Menu items - same as Sidebar but without the collapse toggle and with icons only

    const menuItems = [
        // display text below icons only mobile
        // { path: "/", label: "Home", icon: "🏠" },
        { path: "/customers", label: "Customers", icon: "👥", text: "Customers" },
        { path: "/vehicles", label: "Vehicles", icon: "🚗", text: "Vehicles" },
        { path: "/bookings", label: "Bookings", icon: "📅", text: "Bookings" },
        { path: "/services", label: "Services", icon: "🛠️", text: "Services" },
        // sub menu
        // { path: "/profile", label: "Profile", icon: "👤" },
    ];

    if (user?.role === 'OWNER') {
        // menuItems.push({ path: "/settings/indemnity", label: "Indemnity", icon: "🛡️" });
        menuItems.push({ path: "/team", label: "Team", icon: "🏗️", text: "Team" });
        // menuItems.push({ path: "/settings", label: "Settings", icon: "⚙️" });
    }

    return (
        // Moved menu items into sub menu and display only 4 icons/text for mobile, with option to expand to show all
        <div
        // Use env(safe-area-inset-bottom) to ensure the menu is above the iOS home indicator
            className="fixed bottom-3 left-1/2 z-1000 w-[calc(100%-1rem)] max-w-md -translate-x-1/2 md:hidden"
            style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
            <div
                className="rounded-2xl border border-slate-700/50 bg-mist-100 p-4 shadow-2xl backdrop-blur-sm"
            >
                <ul className="grid grid-cols-5 gap-1 sm:grid-cols-5 opacity-100">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    title={item.label}
                                    className={`flex opacity-100 min-h-12 flex-col items-center justify-center rounded-xl text-xl transition-colors ${isActive ? "bg-cyan-500/20 text-cyan-200" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                                >
                                    {/* Center item pop out above the nav and is a larger icon */}
                                    <span className="icon">{item.icon}</span>
                                    <span className="text-xs">{item.text}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

export default MenuMobile;
