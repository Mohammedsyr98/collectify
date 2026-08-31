import { ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAnchoredPopup } from './useAnchoredPopup';

const actionsMenuGap = 8;
const actionsMenuEstimatedHeight = 48;
const actionsMenuWidth = 176;

type CustomerActionsCellProps = {
  customerId: string;
  customerName: string;
};

export function CustomerActionsCell({
  customerId,
  customerName,
}: CustomerActionsCellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuId = useId();
  const openDetailsRef = useRef<HTMLButtonElement>(null);
  const menu = useAnchoredPopup<HTMLButtonElement, HTMLDivElement>({
    estimatedHeight: actionsMenuEstimatedHeight,
    gap: actionsMenuGap,
    horizontalAlignment: 'visualEnd',
    initialFocusRef: openDetailsRef,
    width: actionsMenuWidth,
  });

  const openDetails = () => {
    menu.close();
    void navigate(`/customers/${customerId}`);
  };

  return (
    <>
      <button
        aria-controls={menu.isOpen ? menuId : undefined}
        aria-expanded={menu.isOpen}
        aria-haspopup="menu"
        aria-label={t('customers.list.actions.openMenu', {
          name: customerName,
        })}
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        onClick={menu.toggle}
        ref={menu.triggerRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={17} strokeWidth={2.5} />
      </button>
      {menu.isOpen && menu.position
        ? createPortal(
            <div
              aria-label={t('customers.list.actions.menuLabel', {
                name: customerName,
              })}
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
              <button
                className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-[4px] border-0 bg-transparent px-2.5 text-start text-[0.8rem] font-extrabold text-foreground transition duration-150 hover:bg-muted focus:bg-muted focus:outline-none"
                onClick={openDetails}
                ref={openDetailsRef}
                role="menuitem"
                type="button"
              >
                <ArrowUpRight aria-hidden="true" size={15} strokeWidth={2.5} />
                {t('customers.list.actions.openDetails')}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
