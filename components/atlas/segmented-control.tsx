'use client';

import type { ComponentProps, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { RadioGroup } from 'radix-ui';

const Selection = createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

export function SegmentedControl({
  value,
  onValueChange,
  children,
  ...props
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  'aria-label': string;
}) {
  return (
    <Selection.Provider value={{ value, onValueChange }}>
      <RadioGroup.Root
        {...props}
        data-slot="tabs"
        orientation="horizontal"
        value={value}
        onValueChange={(next) => {
          if (next) onValueChange(next);
        }}
      >
        {children}
      </RadioGroup.Root>
    </Selection.Provider>
  );
}

export function Segment({
  value,
  onFocus,
  ...props
}: ComponentProps<typeof RadioGroup.Item>) {
  const selection = useContext(Selection);
  return (
    <RadioGroup.Item
      data-slot="tabs-trigger"
      {...props}
      value={value}
      onFocus={(event) => {
        onFocus?.(event);
        if (!event.defaultPrevented && selection && selection.value !== value)
          selection.onValueChange(value);
      }}
    />
  );
}
