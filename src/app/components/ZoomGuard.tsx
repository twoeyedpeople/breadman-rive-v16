"use client";

import { useEffect } from "react";

export default function ZoomGuard() {
  useEffect(() => {
    const root = document.documentElement;

    // “CSS nuke zoom” (layout scale)
    const enforceCssZoom = () => {
      // either zoom (Chrome)...
      (root.style as any).zoom = "1";
      // ...or transform fallback if you prefer (more consistent cross-browser)
      // root.style.transform = "scale(1)";
      // root.style.transformOrigin = "0 0";
    };

    enforceCssZoom();

    // 1) Kill mouse double-click (UPDD often emits mouse dblclick)
    const onDblClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      enforceCssZoom();
    };

    // 2) Kill “Ctrl/Cmd + wheel” zoom
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        enforceCssZoom();
      }
    };

    // 3) Kill zoom shortcuts (Cmd/Ctrl +/-, 0)
    const onKeyDown = (e: KeyboardEvent) => {
      const isZoomCombo =
        (e.ctrlKey || e.metaKey) &&
        (e.key === "+" || e.key === "-" || e.key === "0" || e.key === "=");
      if (isZoomCombo) {
        e.preventDefault();
        enforceCssZoom();
      }
    };

    // 4) Optional: detect “double tap” pattern from click events
    let lastClick = 0;
    const onClickCapture = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastClick < 300) {
        // treat as double tap/click
        e.preventDefault();
        e.stopPropagation();
        enforceCssZoom();
      }
      lastClick = now;
    };

    window.addEventListener("dblclick", onDblClick, { capture: true });
    window.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("click", onClickCapture, { capture: true });

    return () => {
      window.removeEventListener("dblclick", onDblClick, true as any);
      window.removeEventListener("wheel", onWheel, true as any);
      window.removeEventListener("keydown", onKeyDown, true as any);
      window.removeEventListener("click", onClickCapture, true as any);
    };
  }, []);

  return null;
}
