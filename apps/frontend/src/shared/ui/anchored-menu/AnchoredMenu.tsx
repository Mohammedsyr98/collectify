import { MoreHorizontal } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { createPortal } from 'react-dom';

import { useAnchoredPopup } from '../anchored-popup/useAnchoredPopup';

const menuGap = 8;
const menuItemHeight = 44;
const menuWidth = 176;

export type AnchoredMenuItem = {
  icon?: ReactNode;
  id: string;
  label: string;
  onSelect?: () => void;
};

export function AnchoredMenu({
  items,
  menuLabel,
  onOpen,
  triggerLabel,
}: {
  items: readonly AnchoredMenuItem[];
  menuLabel: string;
  onOpen?: () => void;
  triggerLabel: string;
}) {
  const menuId = useId();
  const menu = useAnchoredPopup<HTMLButtonElement, HTMLDivElement>({
    estimatedHeight: Math.max(menuItemHeight, items.length * menuItemHeight),
    gap: menuGap,
    horizontalAlignment: 'visualEnd',
    width: menuWidth,
  });

  const toggleMenu = () => {
    if (!menu.isOpen) {
      onOpen?.();
    }

    menu.toggle();
  };

  return (
    <>
      <button
        aria-controls={menu.isOpen ? menuId : undefined}
        aria-expanded={menu.isOpen}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        onClick={toggleMenu}
        ref={menu.triggerRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={17} strokeWidth={2.5} />
      </button>
      {menu.isOpen && menu.position
        ? createPortal(
            <div
              aria-label={menuLabel}
              className={`fixed z-50 w-[176px] rounded-[5px] border border-border bg-card p-1 text-foreground shadow-md ${
                menu.position.placement === 'top' ? '-translate-y-full' : ''
              }`}
              id={menuId}
              ref={menu.popupRef}
              role="menu"
              style={{
                insetInlineStart: menu.position.insetInlineStart,
                top: menu.position.top,
              }}
            >
              {items.map((item) => (
                <button
                  className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-[4px] border-0 bg-transparent px-2.5 text-start text-[0.8rem] font-extrabold text-foreground transition duration-150 hover:bg-muted focus:bg-muted focus:outline-none"
                  key={item.id}
                  onClick={() => {
                    menu.close();
                    item.onSelect?.();
                  }}
                  role="menuitem"
                  type="button"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
