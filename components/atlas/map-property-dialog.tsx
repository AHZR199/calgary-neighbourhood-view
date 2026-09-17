'use client';
import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { money, type Property } from '@/lib/atlas/data';

export interface MapPropertyChoices {
  records: Property[];
  truncated: boolean;
}

export function MapPropertyDialog({
  result,
  onClose,
  onSelect,
  onSearch,
}: {
  result: MapPropertyChoices | null;
  onClose: () => void;
  onSelect: (property: Property) => void;
  onSearch: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [filter, setFilter] = useState({ result, query: '' });
  const query = filter.result === result ? filter.query : '';
  const records =
    result?.records.filter((record) =>
      `${record.address} ${record.rollNumber}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    ) ?? [];
  return (
    <Dialog
      open={!!result}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setFilter({ result: null, query: '' });
        }
      }}
    >
      <DialogContent
        className="map-property-dialog"
        onOpenAutoFocus={(event) => {
          if (window.matchMedia('(max-width: 760px), (pointer: coarse)').matches) {
            event.preventDefault();
            titleRef.current?.focus({ preventScroll: true });
          }
        }}
      >
        <DialogTitle ref={titleRef} tabIndex={-1}>
          Choose the address and unit
        </DialogTitle>
        <DialogDescription>
          {result?.records.length} residential accounts overlap this point.
          Confirm the address before opening a record.
        </DialogDescription>
        <label className="map-property-filter">
          <span>Filter address or account</span>
          <input
            type="search"
            value={query}
            onChange={(event) =>
              setFilter({ result, query: event.target.value })
            }
            placeholder="Unit, street or assessment account"
          />
        </label>
        <div
          className="map-property-options"
          aria-label="Matching property accounts"
        >
          {records.map((record) => (
            <button
              key={record.rollNumber}
              onClick={() => {
                onClose();
                setFilter({ result: null, query: '' });
                onSelect(record);
              }}
            >
              <span>{record.address}</span>
              <small>
                {money(record.assessedValue)} assessed · account{' '}
                {record.rollNumber}
              </small>
            </button>
          ))}
          {!records.length && <p>No accounts match this filter.</p>}
        </div>
        <p className="map-property-count" role="status">
          {records.length} of {result?.records.length} accounts shown
        </p>
        {result?.truncated && (
          <p className="map-property-count">
            More records may exist. Search the full address to narrow the
            results.
          </p>
        )}
        <button
          className="map-property-search"
          onClick={() => {
            onClose();
            setFilter({ result: null, query: '' });
            onSearch();
          }}
        >
          Search by address instead
        </button>
      </DialogContent>
    </Dialog>
  );
}
