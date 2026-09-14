import type { Pipe, Property } from './data';
export interface DetailHistory {
  year: number;
  assessedValue: number | null;
  status: string;
}
export interface PublicPropertyDetails {
  pipe: Pipe | null;
  history: DetailHistory[] | null;
  sourceStatus: { water: string; history: string };
  fetchedAt: string;
}
const requests = new Map<string, Promise<PublicPropertyDetails>>();
export function getPublicPropertyDetails(property: Property) {
  let pending = requests.get(property.rollNumber);
  if (!pending) {
    pending = fetch('/api/property-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roll: property.rollNumber,
        address: property.address,
      }),
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    }).then(async (response) => {
      if (!response.ok) throw Error('Additional City records are unavailable.');
      return response.json() as Promise<PublicPropertyDetails>;
    });
    requests.set(property.rollNumber, pending);
    pending.catch(() => requests.delete(property.rollNumber));
  }
  return pending;
}
