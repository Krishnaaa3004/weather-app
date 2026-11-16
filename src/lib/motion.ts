import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll is the camera. The WebGL sky moves forward through its cloud layers
 * as the page scrolls, and the DOM follows the same idea: each section starts
 * a little further away (negative translateZ) and arrives as you reach it,
 * while the hero continues past the viewer. Movements are scrubbed to the
 * scroll position, so nothing animates unless the reader moves.
 *
 * Returns a function that undoes everything.
 */
export function initMotion(): () => void {
  const lenis = new Lenis({ lerp: 0.1, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const context = gsap.context(() => {
    for (const element of gsap.utils.toArray<HTMLElement>('[data-depth="enter"]')) {
      gsap.fromTo(
        element,
        { z: -180, opacity: 0, rotateX: 3 },
        {
          z: 0,
          opacity: 1,
          rotateX: 0,
          ease: 'none',
          scrollTrigger: { trigger: element.parentElement, start: 'top 98%', end: 'top 58%', scrub: true },
        },
      );
    }

    for (const element of gsap.utils.toArray<HTMLElement>('[data-depth="exit"]')) {
      gsap.to(element, {
        z: 150,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: element.parentElement, start: 'top top', end: 'bottom 30%', scrub: true },
      });
    }
  });

  // Web fonts change section heights after first layout.
  void document.fonts.ready.then(() => ScrollTrigger.refresh());

  return () => {
    context.revert();
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}
