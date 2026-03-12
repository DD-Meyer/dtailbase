import { useEffect } from 'react';

const useOrbitalEffects = () => {
  useEffect(() => {
    // Paste all the logic (handleMouseMove, handleScroll, IntersectionObserver) 
    // from your Hero.jsx here...
    // 1. Mouse Tracking for Glowing Cards
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll(".feature-card, .stat-card, .pricing-card");
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      }
    };

    // 2. Parallax Scroll Logic for Background Rings
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const rings = document.querySelectorAll('.ring');
      const core = document.querySelector('.orbital-core');

      rings.forEach((ring, i) => {
        const speed = (i + 1) * 0.15;
        // Optimization: Use translate3d for hardware acceleration
        ring.style.transform = `translate3d(-50%, calc(-50% + ${scrolled * speed}px), 0) rotate(${scrolled * 0.05}deg)`;
      });

      if (core) {
        core.style.transform = `translate3d(-50%, calc(-50% + ${scrolled * 0.1}px), 0)`;
      }
    };

    // 3. Intersection Observer for Reveal Animations
    const observerOptions = { threshold: 0.15 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    // 4. Global Event Listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, []);
};

export default useOrbitalEffects;