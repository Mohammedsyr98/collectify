import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type AnchoredPopupHorizontalAlignment = 'start' | 'visualEnd';

type AnchoredPopupPosition = {
  insetInlineStart: number;
  placement: 'bottom' | 'top';
  top: number;
};

type UseAnchoredPopupOptions = {
  estimatedHeight: number;
  gap: number;
  horizontalAlignment?: AnchoredPopupHorizontalAlignment;
  initialFocusRef?: RefObject<HTMLElement | null>;
  width: number;
};

export function useAnchoredPopup<
  TTrigger extends HTMLElement,
  TPopup extends HTMLElement,
>({
  estimatedHeight,
  gap,
  horizontalAlignment = 'start',
  initialFocusRef,
  width,
}: UseAnchoredPopupOptions) {
  const triggerRef = useRef<TTrigger>(null);
  const popupRef = useRef<TPopup>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<AnchoredPopupPosition | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const inlineStart = getInlineStart(
      triggerRect,
      width,
      horizontalAlignment,
    );
    const popupHeight =
      popupRef.current?.getBoundingClientRect().height ?? estimatedHeight;
    const shouldPlaceAbove =
      triggerRect.bottom + gap + popupHeight > window.innerHeight &&
      triggerRect.top > popupHeight;

    setPosition({
      insetInlineStart: Math.max(
        gap,
        Math.min(inlineStart, window.innerWidth - width - gap),
      ),
      placement: shouldPlaceAbove ? 'top' : 'bottom',
      top: shouldPlaceAbove
        ? triggerRect.top - gap
        : triggerRect.bottom + gap,
    });
  }, [estimatedHeight, gap, horizontalAlignment, width]);

  const open = useCallback(() => {
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [close, isOpen, open]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    initialFocusRef?.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        triggerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }

      close();
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsidePointer);

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, [close, initialFocusRef, isOpen]);

  return {
    close,
    isOpen,
    popupRef,
    position,
    toggle,
    triggerRef,
  };
}

function getInlineStart(
  triggerRect: DOMRect,
  popupWidth: number,
  horizontalAlignment: AnchoredPopupHorizontalAlignment,
): number {
  // `visualEnd` preserves the current actions menu alignment in both LTR and RTL.
  if (document.documentElement.dir === 'rtl') {
    return window.innerWidth - (triggerRect.x + triggerRect.width);
  }

  if (horizontalAlignment === 'visualEnd') {
    return triggerRect.x + triggerRect.width - popupWidth;
  }

  return triggerRect.x;
}
