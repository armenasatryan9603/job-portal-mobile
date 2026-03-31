import React, { useEffect, useRef } from "react";

const AD_CLIENT =
  process.env.EXPO_PUBLIC_ADSENSE_CLIENT || "ca-pub-7411351649298687";
const AD_SLOT = process.env.EXPO_PUBLIC_ADSENSE_SLOT || "";

let scriptLoaded = false;

function loadAdSenseScript(client: string) {
  if (scriptLoaded) return;
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src*="adsbygoogle"]`)) {
    scriptLoaded = true;
    return;
  }

  const script = document.createElement("script");
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.async = true;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
  scriptLoaded = true;
}

export function AdBanner() {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!AD_CLIENT) return;
    loadAdSenseScript(AD_CLIENT);
  }, []);

  useEffect(() => {
    if (pushed.current) return;
    if (!AD_CLIENT || !adRef.current) return;

    const timer = setTimeout(() => {
      try {
        const w = window as any;
        (w.adsbygoogle = w.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {
        // AdSense not ready yet or ad-blocker present
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (!AD_CLIENT) return null;

  return (
    <div
      ref={adRef}
      style={{
        width: "100%",
        minHeight: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
        }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
