import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocalization } from '../../localization';

type PaginationControlsProps = {
  ariaLabel: string;
  canMoveToNextPage: boolean;
  canMoveToPreviousPage: boolean;
  nextPageLabel: string;
  onNextPage: () => void;
  onPreviousPage: () => void;
  previousPageLabel: string;
  isDisabled?: boolean;
};

export function PaginationControls({
  ariaLabel,
  canMoveToNextPage,
  canMoveToPreviousPage,
  nextPageLabel,
  onNextPage,
  onPreviousPage,
  previousPageLabel,
  isDisabled = false,
}: PaginationControlsProps) {
  const { metadata } = useLocalization();
  const isRtl = metadata.direction === 'rtl';
  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label={ariaLabel} className="flex items-center justify-end gap-2">
      <button
        aria-label={previousPageLabel}
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isDisabled || !canMoveToPreviousPage}
        onClick={onPreviousPage}
        type="button"
      >
        <PreviousIcon aria-hidden="true" size={17} strokeWidth={2.5} />
      </button>
      <button
        aria-label={nextPageLabel}
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isDisabled || !canMoveToNextPage}
        onClick={onNextPage}
        type="button"
      >
        <NextIcon aria-hidden="true" size={17} strokeWidth={2.5} />
      </button>
    </nav>
  );
}
