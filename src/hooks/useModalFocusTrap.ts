import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PREFERRED_INITIAL_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';

function isVisible(el: HTMLElement): boolean {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => container.contains(el) && isVisible(el),
  );
}

export type ModalFocusTrapOptions = {
  /** Called when user presses Escape (e.g. close modal) */
  onEscape?: () => void;
};

/**
 * Keeps keyboard focus inside `containerRef` while `active`, restores focus on deactivate,
 * and prefers focusing the first field control over decorative/header buttons.
 */
export function useModalFocusTrap<T extends HTMLElement>(
  active: boolean,
  containerRef: RefObject<T | null>,
  options?: ModalFocusTrapOptions,
) {
  const onEscapeRef = useRef(options?.onEscape);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onEscapeRef.current = options?.onEscape;
  }, [options?.onEscape]);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusInitial = () => {
      const preferred = container.querySelector<HTMLElement>(PREFERRED_INITIAL_SELECTOR);
      if (preferred && container.contains(preferred)) {
        preferred.focus();
        return;
      }
      const list = getFocusableElements(container);
      if (list.length > 0) list[0].focus();
      else {
        if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
        container.focus();
      }
    };

    const id = requestAnimationFrame(focusInitial);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscapeRef.current?.();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = getFocusableElements(container);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (!activeEl || !container.contains(activeEl)) return;
      if (e.shiftKey) {
        if (activeEl === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', handleKeyDown, true);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus();
        } catch {
          /* ignore focus errors from detached nodes */
        }
      }
    };
  }, [active, containerRef]);
}
