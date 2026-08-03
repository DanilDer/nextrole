import { useEffect, useRef } from 'react';

/**
 * Loading, error and empty states used across my pages.
 *
 * These are intentionally minimal. Susana owns the shared component
 * library, so if hers ends up covering any of these, delete the version
 * here and re-point the imports — the props are deliberately plain.
 */

export function Spinner({ label = 'Loading' }) {
  return (
    <>
      <span className="nr-spinner" aria-hidden="true" />
      <span className="nr-sr">{label}</span>
    </>
  );
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="nr-loading" role="status">
      <span className="nr-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="nr-skeleton-row" key={i}>
          <div className="nr-skeleton" style={{ width: '42%' }} />
          <div className="nr-skeleton" style={{ width: '26%' }} />
        </div>
      ))}
    </div>
  );
}

/**
 * @param {'error'|'success'|'info'} tone
 * Errors get role="alert" so screen readers announce them immediately;
 * quieter tones use role="status" so they don't interrupt.
 */
export function Alert({ tone = 'info', title, children }) {
  return (
    <div className="nr-alert" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      {title ? <strong className="nr-alert-title">{title}</strong> : null}
      {children ? <span>{children}</span> : null}
    </div>
  );
}

export function EmptyState({ title, children, actions }) {
  return (
    <div className="nr-empty">
      <h3 className="nr-empty-title">{title}</h3>
      {children ? <p className="nr-empty-body">{children}</p> : null}
      {actions ? <div className="nr-empty-actions">{actions}</div> : null}
    </div>
  );
}

/**
 * Shown when a request fails for reasons other than a missing endpoint.
 * Session expiry gets different copy and no retry button, because
 * retrying an expired token just fails again.
 */
export function ErrorState({ error, onRetry }) {
  const isAuth = error?.isAuthError;

  return (
    <div className="nr-empty">
      <h3 className="nr-empty-title">
        {isAuth ? 'Your session has expired' : "That didn't load"}
      </h3>
      <p className="nr-empty-body">
        {isAuth
          ? 'Log in again to pick up where you left off.'
          : (error?.message ?? 'Something went wrong. Try again in a moment.')}
      </p>
      {!isAuth && onRetry ? (
        <div className="nr-empty-actions">
          <button type="button" className="nr-btn nr-btn--outline" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The honest state for the applications and interviews trackers: the UI is
 * finished, the server route isn't. Lists the exact routes needed so the
 * running app documents its own gap instead of failing silently.
 *
 * @param {string} feature   e.g. 'Job applications'
 * @param {string[]} routes  e.g. ['GET /api/applications', ...]
 */
export function BackendPending({ feature, routes = [], children }) {
  return (
    <div className="nr-pending">
      <div>
        <h3 className="nr-pending-title">{feature} needs a backend route</h3>
        <p className="nr-pending-body">
          {children ??
            `The ${feature.toLowerCase()} screens are built and ready, but the server does not expose these routes yet. server/index.js currently mounts only /api/auth and /api/analysis. Once the routes below exist, this page fills with real data — no frontend changes required.`}
        </p>
      </div>

      {routes.length > 0 ? (
        <ul className="nr-routes">
          {routes.map((route) => (
            <li key={route}>
              <code className="nr-route-code">{route}</code>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Banner shown on every page affected by USE_MOCK_DATA. */
export function MockDataBanner() {
  return (
    <div className="nr-mock-flag" role="status">
      <strong>Sample data</strong>
      <span>
        These records are placeholders for checking the layout. Nothing here is saved, and edits are
        refused. Set USE_MOCK_DATA to false in src/api/config.js to go back to the real API.
      </span>
    </div>
  );
}

/* ============================================================
   Page shell
   ============================================================ */

/** Page title, one line of orientation, and any page-level actions. */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="nr-page-head">
      <div>
        <h1 className="nr-page-title">{title}</h1>
        {subtitle ? <p className="nr-page-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="nr-page-actions">{actions}</div> : null}
    </header>
  );
}

/**
 * A bordered section. `flush` removes body padding for list content that
 * draws its own row dividers edge to edge.
 */
export function Panel({ title, action, children, flush = false }) {
  return (
    <section className="nr-panel">
      {title || action ? (
        <div className="nr-panel-head">
          {title ? <h2>{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className={flush ? 'nr-panel-body nr-panel-body--flush' : 'nr-panel-body'}>
        {children}
      </div>
    </section>
  );
}

/**
 * Modal used for the add/edit forms.
 *
 * Handles the things that make a dialog usable rather than just visible:
 * Escape closes it, focus moves inside on open and returns to the trigger
 * on close, Tab cycles within the dialog, the background is locked from
 * scrolling, and a click on the backdrop dismisses it.
 */
export function Modal({ title, onClose, children }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    const firstField = panelRef.current?.querySelector(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    firstField?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="nr-modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="nr-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
      >
        <div className="nr-modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="nr-btn nr-btn--quiet nr-btn--sm"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <div className="nr-modal-body">{children}</div>
      </div>
    </div>
  );
}
