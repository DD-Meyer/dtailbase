import { createElement, useRef, useState } from "react";
import { CalendarDays, Car, ClipboardList, House, Monitor, MoreHorizontal, Smartphone, UsersRound, Wrench } from "lucide-react";
import styles from "./AppDemo.module.css";

const SCREENS = [
  { id: "home", label: "Home", icon: House },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "bookings", label: "Bookings", icon: ClipboardList },
  { id: "customers", label: "Customers", icon: UsersRound },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "services", label: "Services", icon: Wrench },
];

export default function AppDemo() {
  const [device, setDevice] = useState(() => window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop");
  const [screen, setScreen] = useState(SCREENS[0]);
  const [imageState, setImageState] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const moreRef = useRef(null);
  const src = `/landing/images/demo-${screen.id}-${device}.webp`;
  const imageKey = `${src}:${attempt}`;
  const status = imageState?.key === imageKey ? imageState.status : "loading";

  return (
    <figure className={styles.demo} aria-label="Read-only DtailBase preview">
      <div className={styles.toolbar}>
        <span className={styles.previewLabel}>Explore the app</span>
        <div className={styles.toggle} role="group" aria-label="Preview device">
          <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
            <Monitor size={17} aria-hidden="true" />Desktop
          </button>
          <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
            <Smartphone size={17} aria-hidden="true" />Mobile
          </button>
        </div>
      </div>
      <div className={styles.stage}>
        <div className={`${styles.frame} ${device === "mobile" ? styles.mobile : styles.desktop}`}>
          <div className={styles.brand} aria-hidden="true">Dtail<span>base</span><small>PREVIEW</small></div>
          <nav className={styles.navigation} aria-label="Preview screens">
            {(device === "mobile" ? SCREENS.slice(0, 3) : SCREENS).map((item) => (
              <button key={item.id} type="button" aria-current={screen.id === item.id ? "page" : undefined}
                aria-label={item.label} title={item.label} onClick={() => {
                  setScreen(item);
                  if (moreRef.current) moreRef.current.open = false;
                }}>
                {createElement(item.icon, { size: 18, "aria-hidden": true })}
                <span>{item.label}</span>
              </button>
            ))}
            {device === "mobile" && (
              <details ref={moreRef} className={styles.more} onKeyDown={(event) => {
                if (event.key === "Escape" && moreRef.current.open) {
                  event.preventDefault();
                  moreRef.current.open = false;
                  moreRef.current.querySelector("summary").focus();
                }
              }}>
                <summary aria-label="More preview screens" data-active={SCREENS.slice(3).some((item) => item.id === screen.id)}>
                  <MoreHorizontal size={18} aria-hidden="true" /><span>More</span>
                </summary>
                <div className={styles.moreScreens} role="group" aria-label="More preview screens">
                  {SCREENS.slice(3).map((item) => (
                    <button key={item.id} type="button" aria-current={screen.id === item.id ? "page" : undefined} onClick={() => {
                      setScreen(item);
                      moreRef.current.open = false;
                      moreRef.current.querySelector("summary").focus();
                    }}>
                      {createElement(item.icon, { size: 18, "aria-hidden": true })}<span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </nav>
          <div className={styles.screen} aria-busy={status === "loading"}>
            <img key={imageKey} src={src} alt={`${screen.label} screen in ${device} view, showing fictional demonstration data`}
              width={device === "desktop" ? 959 : 375}
              height={device === "desktop" ? (screen.id === "home" ? 857 : 793) : (screen.id === "home" ? 775 : 711)}
              loading="lazy" decoding="async" draggable="false"
              onLoad={() => setImageState({ key: imageKey, status: "loaded" })}
              onError={() => setImageState({ key: imageKey, status: "error" })} />
            {status === "loading" && <span className={styles.feedback} role="status">Loading preview...</span>}
            {status === "error" && <div className={styles.feedback} role="alert">
              <p>This screen could not be loaded.</p>
              <button type="button" onClick={() => setAttempt((current) => current + 1)}>Retry preview</button>
            </div>}
          </div>
        </div>
      </div>
      <figcaption className={styles.caption}>
        <strong role="status">{screen.label} · {device === "desktop" ? "Desktop" : "Mobile"}</strong>
        <span>Use the preview navigation to switch screens.</span>
      </figcaption>
    </figure>
  );
}
