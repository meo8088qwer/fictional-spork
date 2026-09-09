import { useLayoutEffect, useRef, useState, DependencyList } from 'react';

/**
 * Measures a container's available box against its content's natural
 * (unscaled) size and returns a <=1 CSS scale factor that shrinks the
 * content down to fit exactly -- so a screen shorter/narrower than the
 * layout was designed for (a laptop instead of an actual TV) never needs to
 * scroll, it just renders everything proportionally smaller. Never scales
 * content up past 1x, so a real TV still renders at its designed size.
 *
 * `offsetWidth`/`offsetHeight` reflect real layout size and are unaffected
 * by the `transform: scale()` already applied to the content element, so
 * re-measuring after a scale change doesn't feed back into itself.
 */
export function useFitToContainer<TContainer extends HTMLElement, TContent extends HTMLElement>(
  deps: DependencyList = []
) {
  const containerRef = useRef<TContainer>(null);
  const contentRef = useRef<TContent>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content || typeof ResizeObserver === 'undefined') return;

    const recompute = () => {
      const availableWidth = container.clientWidth;
      const availableHeight = container.clientHeight;
      const naturalWidth = content.offsetWidth;
      const naturalHeight = content.offsetHeight;
      if (naturalWidth === 0 || naturalHeight === 0) return;
      const next = Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    ro.observe(content);
    recompute();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { containerRef, contentRef, scale };
}
