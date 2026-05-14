// Floating navigation menu for mobile devices
import React from "react";
import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CalendarDays, Car, Users, Wrench, UserCog } from "lucide-react";


function MenuMobile() {
  const location = useLocation();
    const { user } = useContext(AuthContext);
    // Menu items - same as Sidebar but without the collapse toggle and with icons only

    const menuItems = [
        // display text below icons only mobile
        { path: "/customers", label: "Customers", icon: Users, text: "Customers" },
        { path: "/vehicles", label: "Vehicles", icon: Car, text: "Vehicles" },
        { path: "/bookings", label: "Bookings", icon: CalendarDays, text: "Bookings" },
        { path: "/services", label: "Services", icon: Wrench, text: "Services" },
    ];

    if (user?.role === 'OWNER') {
        // menuItems.push({ path: "/settings/indemnity", label: "Indemnity", icon: "🛡️" });
        menuItems.push({ path: "/team", label: "Team", icon: UserCog, text: "Team" });
        // menuItems.push({ path: "/settings", label: "Settings", icon: "⚙️" });
    }

    return (
        // Moved menu items into sub menu and display only 4 icons/text for mobile, with option to expand to show all
        <div
        // Use env(safe-area-inset-bottom) to ensure the menu is above the iOS home indicator
            className="fixed bottom-3 left-1/2 z-1000 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 md:hidden"
            style={{ bottom: "max(2rem, env(safe-area-inset-bottom))" }}
        >
            <div
                className="rounded-2xl border border-cyan-400/20 bg-linear-to-br from-slate-900/95 via-slate-800/92 to-cyan-950/90 p-4 shadow-2xl backdrop-blur-md"
            >
                <ul className={`grid gap-1 opacity-100 ${menuItems.length > 4 ? "grid-cols-5" : "grid-cols-4"}`}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    title={item.label}
                                    className={`flex text-[9px] opacity-100 min-h-12 flex-col items-center justify-center rounded-2xl text-xl transition-colors ${isActive ? "bg-cyan-500/20 text-emerald-500 border text-[9px]" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                                >
                                    {/* Center item pop out above the nav and is a larger icon */}
                                    <Icon className={`h-4.5 w-4.5 ${isActive ? 'h-5 w-5' : ''}`} strokeWidth={2.1} aria-hidden="true" />
                                    <span className="leading-tight tracking-wide">{item.text}</span>
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
