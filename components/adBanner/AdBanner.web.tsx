import React, { useEffect, useRef } from "react";

const AD_CLIENT = process.env.EXPO_PUBLIC_ADSENSE_CLIENT;
const AD_SLOT = process.env.EXPO_PUBLIC_ADSENSE_SLOT || "";

let scriptLoaded = false;
const pendingCallbacks: Array<() => void> = [];

function ensureAdSenseScript(client: string, onReady: () => void) {
  if (scriptLoaded) {
    onReady();
    return;
  }

  pendingCallbacks.push(onReady);

  if (typeof document === "undefined") return;

  const existing = document.querySelector(
    `script[src*="adsbygoogle"]`
  ) as HTMLScriptElement | null;

  const flushCallbacks = () => {
    scriptLoaded = true;
    pendingCallbacks.forEach((cb) => cb());
    pendingCallbacks.length = 0;
  };

  if (existing) {
    if (existing.dataset.loaded === "true") {
      flushCallbacks();
    } else {
      existing.addEventListener("load", flushCallbacks, { once: true });
    }
    return;
  }

  const script = document.createElement("script");
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.onload = () => {
    script.dataset.loaded = "true";
    flushCallbacks();
  };
  script.onerror = () => {
    console.warn("[AdBanner] AdSense script failed to load (ad-blocker?)");
  };
  document.head.appendChild(script);
}

export function AdBanner() {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!AD_CLIENT) {
      console.warn(
        "[AdBanner] EXPO_PUBLIC_ADSENSE_CLIENT is not set — ad will not render."
      );
      return;
    }

    let ro: ResizeObserver | null = null;

    const tryPush = () => {
      if (pushed.current) return;
      if (!insRef.current) return;

      try {
        const w = window as any;
        (w.adsbygoogle = w.adsbygoogle || []).push({});
        pushed.current = true;
        ro?.disconnect();
      } catch (e) {
        console.warn("[AdBanner] adsbygoogle.push failed:", e);
      }
    };

    ensureAdSenseScript(AD_CLIENT, () => {
      tryPush();

      if (!pushed.current && insRef.current) {
        ro = new ResizeObserver(() => tryPush());
        ro.observe(insRef.current);
      }
    });

    return () => ro?.disconnect();
  }, []);

  if (!AD_CLIENT) return null;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: "block", width: "100%" }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={AD_SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
