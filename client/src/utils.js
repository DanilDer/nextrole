import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { USER_KEY } from './api.js';

/** Formatting helpers shared by the dashboard, trackers and analysis views. */

/** "14 Aug 2026" — day-first, since the month-first form is ambiguous. */
export function formatDate(value) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "14 Aug 2026, 2:30 pm" */
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return 'No date set';
  return `${formatDate(date)}, ${date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

/** "in 3 days" / "9 days ago" / "today" — the phrasing that actually helps. */
export function formatRelative(value) {
  const date = toDate(value);
  if (!date) return '';

  const dayMs = 86_400_000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(date);
  startOfTarget.setHours(0, 0, 0, 0);

  const days = Math.round((startOfTarget - startOfToday) / dayMs);

  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return days < 7 ? `in ${days} days` : `in ${Math.round(days / 7)} weeks`;
  const past = Math.abs(days);
  return past < 7 ? `${past} days ago` : `${Math.round(past / 7)} weeks ago`;
}

/** For <input type="datetime-local">, which needs local time, not UTC. */
export function toDateTimeInputValue(value) {
  const date = toDate(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** For <input type="date">. */
export function toDateInputValue(value) {
  const date = toDate(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayInputValue() {
  return toDateInputValue(new Date());
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ── Labels ───────────────────────────────────────────────── */

const STATUS_LABELS = {
  applied: 'Applied',
  interview: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

export function statusLabel(status) {
  const key = String(status ?? '').toLowerCase();
  return STATUS_LABELS[key] ?? 'Applied';
}

/** Falls back to 'neutral' so an unexpected value still gets valid styling. */
export function statusKey(status) {
  const key = String(status ?? '').toLowerCase();
  return key in STATUS_LABELS ? key : 'neutral';
}

const TYPE_LABELS = {
  phone: 'Phone screen',
  technical: 'Technical',
  onsite: 'On-site',
  final: 'Final round',
};

export function interviewTypeLabel(type) {
  const key = String(type ?? '').toLowerCase();
  return TYPE_LABELS[key] ?? (type ? capitalise(type) : 'Interview');
}

function capitalise(text) {
  const s = String(text);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── ATS score ────────────────────────────────────────────── */

/**
 * Bands the 0–100 score into plain language. The copy tells the reader
 * what to do next rather than just naming the tier, because a number on
 * its own doesn't tell you whether to rewrite the resume or move on.
 */
export function scoreBand(score) {
  if (score === null || score === undefined) {
    return { key: 'unknown', label: 'No score returned', note: 'The model did not include a score in its reply.' };
  }
  if (score >= 80) {
    return {
      key: 'offer',
      label: 'Strong match',
      note: 'This resume lines up well with the posting. Work through any missing keywords below and send it.',
    };
  }
  if (score >= 60) {
    return {
      key: 'interview',
      label: 'Reasonable match',
      note: 'The essentials are there. Adding the missing keywords should lift this before you apply.',
    };
  }
  if (score >= 40) {
    return {
      key: 'interview',
      label: 'Needs work',
      note: 'Enough gaps that an automated screen may filter this out. Start with the suggestions below.',
    };
  }
  return {
    key: 'rejected',
    label: 'Weak match',
    note: 'This resume and this posting are far apart. Consider a version rewritten for this role.',
  };
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

/* ============================================================
   Hooks
   ============================================================ */

/** Stable reference, so `data ?? EMPTY` doesn't build a new array each render. */
export const EMPTY = Object.freeze([]);

/**
 * Loads data once and exposes { data, error, isLoading, reload, setData }.
 *
 * Requests abort when the component unmounts, and a stale response can never
 * overwrite fresher state — worth having because React 19's StrictMode mounts
 * effects twice in development, firing every fetch two times.
 *
 * `setData` is exposed so pages can apply a create or delete locally once the
 * server confirms it, rather than refetching the whole list.
 *
 * Two constraints shape the structure, both from the project's lint rules:
 * state is only set from async callbacks rather than synchronously in an
 * effect body, and the loader ref is updated in an effect rather than during
 * render.
 *
 * @param {(opts: { signal: AbortSignal }) => Promise<any>} loader
 * @param {Array} deps  Re-runs the loader when these change.
 */
export function useResource(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loaderRef = useRef(loader);
  const requestId = useRef(0);
  const controllerRef = useRef(null);

  // Declared before the fetch effect so it has run by the time that fires.
  // useRef already holds the first loader, so mount is covered either way.
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  /** Kicks off a load, settling state from the promise callbacks only. */
  const start = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const id = ++requestId.current;

    loaderRef.current({ signal: controller.signal }).then(
      (result) => {
        if (id !== requestId.current) return;
        setData(result);
        setError(null);
        setIsLoading(false);
      },
      (caught) => {
        if (caught?.name === 'AbortError' || id !== requestId.current) return;
        setError(caught);
        setIsLoading(false);
      },
    );

    return controller;
  }, []);

  useEffect(() => {
    const controller = start();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  /**
   * Retry from a button. Setting state synchronously is fine here because
   * this runs from an event handler rather than an effect.
   */
  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    start();
  }, [start]);

  return { data, error, isLoading, reload, setData };
}

/**
 * Reads the signed-in user for display purposes — currently just the
 * first name in the dashboard greeting.
 *
 * ── Swap point ────────────────────────────────────────────────
 * This reads localStorage because Susana's AuthContext doesn't exist yet.
 * When it does, replace the body with:
 *
 *   import { useAuth } from '../context/AuthContext.jsx';
 *   export function useCurrentUser() {
 *     const { user } = useAuth();
 *     return user;
 *   }
 *
 * That is the only edit needed — every page imports this hook rather than
 * touching storage directly, so nothing else changes.
 *
 * The backend returns { user_id, name, email, created_at } from both
 * /api/auth/login and /api/auth/register. Note the JWT payload itself
 * holds only user_id, so the name has to come from the login response —
 * it cannot be decoded from the token.
 */
export function useCurrentUser() {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
      return user && typeof user === 'object' ? user : null;
    } catch {
      return null;
    }
  }, []);
}

/** "Priya" from "Priya Raman" — used for the greeting. */
export function firstNameOf(user) {
  const name = String(user?.name ?? '').trim();
  if (!name) return null;
  return name.split(/\s+/)[0];
}
