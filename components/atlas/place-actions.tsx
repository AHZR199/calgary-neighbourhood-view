'use client';
import { Columns3, Ellipsis, Printer, Share2 } from 'lucide-react';

export function PlaceActions({
  compared,
  onCompare,
  onShare,
  onBrief,
}: {
  compared: boolean;
  onCompare: () => void;
  onShare: () => void;
  onBrief: () => void;
}) {
  return (
    <details
      className="place-actions-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.currentTarget.open = false;
          event.currentTarget.querySelector('summary')?.focus();
        }
      }}
    >
      <summary aria-label="Place actions" title="Compare, share or print">
        <Ellipsis size={20} />
      </summary>
      <div>
        {[
          {
            label: compared ? 'Remove comparison' : 'Compare this place',
            icon: Columns3,
            action: onCompare,
          },
          { label: 'Share this place', icon: Share2, action: onShare },
          { label: 'Print research brief', icon: Printer, action: onBrief },
        ].map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={(event) => {
              event.currentTarget.closest('details')?.removeAttribute('open');
              action();
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
    </details>
  );
}
