'use client';
import { useState } from 'react';
import { clearBrowserResearch } from '@/lib/atlas/privacy-storage';

export function PrivacyControls() {
  const [message, setMessage] = useState('');
  function clear() {
    try {
      const count = clearBrowserResearch();
      setMessage(
        count
          ? 'Saved places and checklists have been cleared from this browser.'
          : 'There are no saved places or checklists in this browser.',
      );
    } catch {
      setMessage(
        'This browser did not allow deletion. Please use its site-data settings to clear saved data for this website.',
      );
    }
  }
  return (
    <div className="privacy-controls">
      <button className="secondary-button" onClick={clear}>
        Clear saved places & checklists
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
