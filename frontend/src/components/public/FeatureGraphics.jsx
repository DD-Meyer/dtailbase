import React from "react";
import {
  Calendar,
  Clock,
  Check,
  ShieldCheck,
  User,
  Users,
  Smartphone,
  WifiOff,
} from "lucide-react";
import styles from "./FeatureGraphics.module.css";

// 1. Smart Online Booking Graphic
export function BookingGraphic() {
  return (
    <div className={styles.graphicBox}>
      <div className={styles.calendarCard}>
        <div className={styles.calendarGrid}>
          <div className={styles.slot}>
            <span>09:00 AM</span>
            <span className={styles.dot} />
          </div>
          <div className={`${styles.slot} ${styles.slotActive}`}>
            <span>11:30 AM</span>
            <span className={styles.dot} />
          </div>
          <div className={styles.slot}>
            <span>02:00 PM</span>
            <span className={styles.dot} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Payments Graphic
export function PaymentsGraphic() {
  return (
    <div className={styles.graphicBox}>
      <div className={styles.cardStage}>
        <div className={styles.layerBase} />
        <div className={styles.layerMiddle}>
          <div className={styles.chip} />
        </div>
        <div className={styles.layerTop}>
          <span>•••• 8842</span>
          <span>$150.00</span>
        </div>
      </div>
    </div>
  );
}

// 3. Job Cards Graphic
export function JobCardGraphic() {
  return (
    <div className={styles.graphicBox}>
      <div className={styles.jobCard}>
        <div className={styles.jobHeader}>
          <span>#JOB-8842</span>
          <Clock size={12} />
        </div>
        <div className={styles.lines}>
          <div className={styles.line} />
          <div className={`${styles.line} ${styles.lineShort}`} />
          <div className={styles.line} />
        </div>
        <div className={styles.scanBeam} />
      </div>
    </div>
  );
}

// 4. Team & Roles Graphic
export function TeamGraphic() {
  return (
    <div className={styles.graphicBox}>
      <div className={styles.teamStage}>
        <div className={`${styles.avatar} ${styles.avatarMain}`}>
          <User size={18} />
        </div>
        <div className={`${styles.avatar} ${styles.avatarLeft}`}>
          <Users size={16} />
        </div>
        <div className={`${styles.avatar} ${styles.avatarRight}`}>
          <Users size={16} />
        </div>
      </div>
    </div>
  );
}

// 5. Digital Indemnity Graphic
export function IndemnityGraphic() {
  return (
    <div className={styles.graphicBox}>
      <div className={styles.waiverCard}>
        <div className={styles.shieldBadge}>
          <Check size={16} strokeWidth={3} />
        </div>
        <svg width="100%" height="40" viewBox="0 0 100 40" fill="none">
          <path
            d="M5 25 Q 25 5, 45 25 T 85 15"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={styles.sigPath}
          />
        </svg>
      </div>
    </div>
  );
}

// 6. Runs On Any Phone Graphic
export function PhoneGraphic() {
  return (
    <div className={styles.graphicBox}>
      <div className={styles.phoneFrame}>
        <div className={styles.notch} />
        <div className={styles.screenContent}>
          <Smartphone size={24} className={styles.appIcon} />
          <span className={styles.offlineBadge}>
            <WifiOff size={10} style={{ marginRight: 2 }} /> Ready
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper mapping component
export function FeatureGraphicRenderer({ title }) {
  switch (title) {
    case "Smart online booking":
      return <BookingGraphic />;
    case "Smart pricing & services":
      return <PaymentsGraphic />;
    case "Job cards on the shop floor":
      return <JobCardGraphic />;
    case "Team management":
      return <TeamGraphic />;
    case "Digital indemnity":
      return <IndemnityGraphic />;
    case "Runs on any phone":
      return <PhoneGraphic />;
    default:
      return null;
  }
}