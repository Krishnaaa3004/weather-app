import { type RefObject, useEffect } from 'react';

/**
 * Lets a mouse drag a horizontally scrolling element, the way a finger can.
 * Touch and trackpad already scroll natively, so only mouse pointers are handled.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let startX = 0;
    let startScroll = 0;
    let dragging = false;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      startScroll = element.scrollLeft;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = 'true';
    };
    const onMove = (event: PointerEvent) => {
      if (dragging) element.scrollLeft = startScroll - (event.clientX - startX);
    };
    const onUp = () => {
      dragging = false;
      delete element.dataset.dragging;
    };

    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
    };
  }, [ref]);
}
