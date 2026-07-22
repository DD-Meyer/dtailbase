// ScrubWheel.jsx
import React from 'react';
import styles from './WheelJourney.module.css';

// SVG assets would ideally be imported here. Using placeholders for clarity.
const WheelBaseSVG = '/landing/images/wheel-base.svg'; // Base wheel graphic
const FoamEffectSVG = '/landing/images/Foam-wheel-animation.svg'; // Foam overlay graphic
const RinseEffectSVG = '/landing/images/Rinse-wheel-animation.svg'; // Rinse overlay graphic
const ShineEffectSVG = '/landing/images/Shine-wheel-animation.svg'; // Shine overlay graphic

export default function ScrubWheel({ 
  isActive,     // Boolean: is this the current step?
  stage,        // String: 'dry', 'foam', 'rinse', 'polish'
  spinProgress // Number: 0 to 1, maps scroll to rotation
}) {
  
  // Calculate specific rotation based on scroll (e.g., 3 full spins)
  const rotation = spinProgress * 360 * 3;

  // Define visual effects based on the stage
  const getStageGraphic = () => {
    switch (stage) {
      case 'foam':
        return (
          <div className={styles.foamOverlay}>
            {/* Replace with actual wash foam graphic component/SVG */}
            <img src={FoamEffectSVG} alt="Foam Effect" />
          </div>
        );
      case 'rinse':
        return (
          <div className={styles.waterJets}>
            {/* Replace with actual water spray graphic component/SVG */}
            <img src={RinseEffectSVG} alt="Rinse Effect" />
          </div>
        );
      case 'finish':
        return (
          <div className={styles.ceramicShine}>
            {/* High gloss shine effect */}
            <img src={ShineEffectSVG} alt="Shine Effect" />
          </div>
        );
      default: // 'dry'
        return null; 
    }
  };

  return (
    <div 
      className={`${styles.wheelGraphic} ${isActive ? styles.wheelActive : ''}`}
      // Apply the rotation dynamic style
      style={{ transform: `rotate(${rotation}deg)` }} 
    >
      {/* Base Wheel Image/SVG (Copy this graphic asset) */}
      <img src={WheelBaseSVG} alt="Detailing Wheel Base" />

      {/* Layer the specific wash stage graphic over the wheel */}
      {getStageGraphic()}
    </div>
  );
}