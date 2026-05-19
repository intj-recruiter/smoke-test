"use client";

import { useEffect, useRef } from "react";
import { captureAttribution, track } from "@/lib/tracking";

export default function BehaviorTracker() {
  const visibleSince = useRef<Record<string, number>>({});
  const maxScroll = useRef(0);

  useEffect(() => {
    captureAttribution();
    track({ event_name: "page_view", event_target: "landing" });

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      for (const threshold of [25, 50, 75, 100]) {
        if (pct >= threshold && maxScroll.current < threshold) {
          maxScroll.current = threshold;
          track({ event_name: "scroll_depth", event_target: `${threshold}%` });
        }
      }
    };

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const el = entry.target as HTMLElement;
          const id = el.dataset.trackId || el.id || "unknown";
          if (entry.isIntersecting) {
            visibleSince.current[id] = Date.now();
            track({ event_name: "section_view", event_target: id });
          } else if (visibleSince.current[id]) {
            const durationMs = Date.now() - visibleSince.current[id];
            track({ event_name: "section_exit", event_target: id, metadata: { duration_ms: durationMs } });
            delete visibleSince.current[id];
          }
        });
      },
      { threshold: 0.55 }
    );

    document.querySelectorAll("[data-track-id]").forEach(el => observer.observe(el));
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
