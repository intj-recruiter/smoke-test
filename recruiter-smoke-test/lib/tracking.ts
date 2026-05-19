"use client";

import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

type EventPayload = {
  event_name: string;
  event_target?: string;
  metadata?: Record<string, any>;
};

const VISITOR_KEY = "rst_visitor_id";
const SESSION_KEY = "rst_session_id";
const FIRST_TOUCH_KEY = "rst_first_touch";
const FIRST_SEEN_KEY = "rst_first_seen_at";

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function getIds() {
  if (typeof window === "undefined") return { visitor_id: "", session_id: "" };

  let visitor_id = localStorage.getItem(VISITOR_KEY);
  let session_id = sessionStorage.getItem(SESSION_KEY);

  if (!visitor_id) {
    visitor_id = uuid();
    localStorage.setItem(VISITOR_KEY, visitor_id);
    localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
  }
  if (!session_id) {
    session_id = uuid();
    sessionStorage.setItem(SESSION_KEY, session_id);
  }
  return { visitor_id, session_id };
}

export function getFirstSeenAt() {
  if (typeof window === "undefined") return Date.now();
  const value = localStorage.getItem(FIRST_SEEN_KEY);
  return value ? Number(value) : Date.now();
}

export function captureAttribution() {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem(FIRST_TOUCH_KEY);
  if (existing) return JSON.parse(existing);

  const params = new URLSearchParams(window.location.search);
  const touch = {
    landing_page: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    captured_at: new Date().toISOString()
  };
  localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
  return touch;
}

export async function track({ event_name, event_target, metadata = {} }: EventPayload) {
  if (typeof window === "undefined") return;
  const { visitor_id, session_id } = getIds();
  const firstSeen = getFirstSeenAt();
  const payload = {
    visitor_id,
    session_id,
    event_name,
    event_target: event_target || null,
    page_path: window.location.pathname,
    milliseconds_since_first_visit: Date.now() - firstSeen,
    metadata: {
      ...metadata,
      first_touch: captureAttribution(),
      viewport: { width: window.innerWidth, height: window.innerHeight }
    }
  };

  window.gtag?.("event", event_name, {
    event_category: "smoke_test",
    event_label: event_target,
    value: Math.round(payload.milliseconds_since_first_visit / 1000),
    ...metadata
  });

  if (!supabase) {
    console.log("[track]", payload);
    return;
  }

  const { error } = await supabase.from("events").insert(payload);
  if (error) console.error("tracking error", error);
}

export async function saveLead(form: Record<string, any>) {
  const { visitor_id, session_id } = getIds();
  const firstSeen = getFirstSeenAt();
  const first_touch = captureAttribution();

  const payload = {
    visitor_id,
    session_id,
    ...form,
    milliseconds_to_submit: Date.now() - firstSeen,
    first_touch
  };

  if (!supabase) {
    console.log("[lead]", payload);
    return { ok: true };
  }

  const { error } = await supabase.from("leads").insert(payload);
  if (error) return { ok: false, error };
  await track({ event_name: "lead_submit", event_target: "diagnosis_form", metadata: { price: form.price_choice } });
  return { ok: true };
}
