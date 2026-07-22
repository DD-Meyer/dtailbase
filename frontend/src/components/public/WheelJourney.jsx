// WheelJourney.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, CreditCard, Wrench, ShieldCheck, ArrowRight } from 'lucide-react';
import ScrubWheel from './ScrubWheel'; // Import the graphic component
import styles from './WheelJourney.module.css';

// Define the journey data structure (Content Modules)
const JOURNEY_STEPS = [
  { id: '01', icon: Calendar, title: "Online Booking", body: "Customers book online directly into your schedule.", stage: 'dry' },
  { id: '02', icon: Wrench, title: "Live Job Cards", body: "Paperless tracking and timers on the shop floor.", stage: 'rinse' },
  { id: '03', icon: ShieldCheck, title: "Digital Indemnity", body: "Legal waivers signed on the glass, stored with the job.", stage: 'rinse' },
  { id: '04', icon: ArrowRight, title: "GEO-Location", body: "Location based signing, proof of presence.", stage: 'finish' },
];

export default function WheelJourney() {
  const containerRef = useRef(null);
  
  // States to drive the animations
  const [activeStep, setActiveStep] = useState(0); // 0 to 4
  const [totalScrollProgress, setTotalScrollProgress] = useState(0); // 0 to 1

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const { top, height } = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate how far through the sticky section we are (0.0 to 1.0)
      let progress = (top * -1) / (height - viewportHeight);
      progress = Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1
      
      setTotalScrollProgress(progress);

      // Determine which text module is active based on progress (5 steps)
      const stepIndex = Math.floor(progress * JOURNEY_STEPS.length);
      // Clamp the final index
      const clampedIndex = Math.min(JOURNEY_STEPS.length - 1, stepIndex);

      if (clampedIndex !== activeStep) {
        setActiveStep(clampedIndex);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeStep]);

  return (
    <section ref={containerRef} className={styles.sectionWrapper}>
      <div className={styles.stickyContainer}>
        
        {/* ============================================================
           WHEEL GRAPHICS COLUMN (Left)
           ============================================================ */}
        <div className={styles.visualColumn}>
          {JOURNEY_STEPS.map((step, index) => (
            <ScrubWheel 
              key={step.id}
              // This is the active module if its index matches the current step
              isActive={index === activeStep}
              stage={step.stage} 
              // Pass the global progress, used to calculate rotation
              spinProgress={totalScrollProgress} 
            />
          ))}
        </div>

        {/* ============================================================
           JOURNEY TEXT COLUMN (Right)
           ============================================================ */}
        <div className={styles.textColumn}>
          {JOURNEY_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isPointActive = index === activeStep;

            return (
              <div 
                key={step.id} 
                className={`${styles.journeyPoint} ${isPointActive ? styles.pointActive : ''}`}
              >
                {/* The Marker Module */}
                <div className={styles.marker}>
                  <div className={styles.numberCircle}>{step.id}</div>
                  {/* Don't show the connecting line on the last step */}
                  {index < JOURNEY_STEPS.length - 1 && (
                    <div className={styles.connectingLine} />
                  )}
                </div>

                {/* The Text Content Module */}
                <div className={styles.textContent}>
                  <div className={styles.titleRow}>
                    <Icon className={styles.icon} size={20} strokeWidth={2.5} />
                    <h3>{step.title}</h3>
                  </div>
                  <p>{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}