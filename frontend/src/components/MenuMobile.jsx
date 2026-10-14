import { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CalendarDays, CalendarRange, Car, House, MoreHorizontal, Users, Wrench, UserCog } from "lucide-react";

function MenuMobile() {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const nav = useRef(null);
  const trigger = useRef(null);
  const items = [
    { path: "/dashboard", label: "Home", icon: House },
    { path: "/customers", label: "Customers", icon: Users },
    { path: "/bookings", label: "Bookings", icon: CalendarDays },
    { path: "/schedule", label: "Schedule", icon: CalendarRange },
  ];
  const secondary = [
    { path: "/vehicles", label: "Vehicles", icon: Car },
    { path: "/services", label: "Services", icon: Wrench },
    ...(user?.role === "OWNER" ? [{ path: "/team", label: "Team", icon: UserCog }] : []),
  ];
  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (event.type === "keydown" && event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      } else if (event.type === "pointerdown" && !nav.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [open]);
  const renderLink = (item) => {
    const Icon = item.icon;
    const active = location.pathname === item.path || (item.path === "/bookings" && location.pathname.startsWith("/bookings/"));
    return <Link to={item.path} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
      <Icon size={20} aria-hidden="true" /><span>{item.label}</span>
    </Link>;
  };
  return <nav className="mobile-app-nav has-team" aria-label="Main navigation" ref={nav}>
    <ul>{items.map((item) => <li key={item.path}>{renderLink(item)}</li>)}
      <li><button ref={trigger} className="mobile-more-trigger" aria-expanded={open} aria-controls="mobile-more-links" onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal size={20} aria-hidden="true" /><span>More</span></button></li>
    </ul>
    {open && <div id="mobile-more-links" className="mobile-more-panel">{secondary.map((item) => <div key={item.path}>{renderLink(item)}</div>)}</div>}
  </nav>;
}

export default MenuMobile;
