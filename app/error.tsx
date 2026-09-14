'use client';
import { Layers3, RotateCcw } from 'lucide-react';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="app-recovery">
      <Layers3 size={34} />
      <h1>Let’s reopen the map.</h1>
      <p>
        This view couldn’t be loaded. Your saved places remain on this device.
      </p>
      <button className="primary-button" onClick={reset}>
        <RotateCcw size={17} />
        Try again
      </button>
    </main>
  );
}
