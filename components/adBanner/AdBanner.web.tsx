import React, { useEffect, useRef } from "react";

const AD_CLIENT = process.env.EXPO_PUBLIC_ADSENSE_CLIENT;
const AD_SLOT = process.env.EXPO_PUBLIC_ADSENSE_SLOT || "";

let scriptReady = false;
const scriptReadyCallbacks: Array<() => void> = [];

function ensureAdSenseScript(client: string, onReady: () => void) {
  if (scriptReady) {
    onReady();
    return;
  }

  scriptReadyCallbacks.push(onReady);

  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src*="adsbygoogle"]`)) {
    scriptReady = true;
    scriptReadyCallbacks.forEach((cb) => cb());
    scriptReadyCallbacks.length = 0;
    return;
  }

  const script = document.createElement("script");
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.onload = () => {
    scriptReady = true;
    scriptReadyCallbacks.forEach((cb) => cb());
    scriptReadyCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

export function AdBanner() {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!AD_CLIENT) return;

    let ro: ResizeObserver | null = null;

    const tryPush = () => {
      if (pushed.current) return;
      const ins = insRef.current;
      if (!ins || ins.offsetWidth === 0) return;

      try {
        const w = window as any;
        (w.adsbygoogle = w.adsbygoogle || []).push({});
        pushed.current = true;
        ro?.disconnect();
      } catch {
        // ad-blocker or transient failure
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
      style={{ display: "block" }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={AD_SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
