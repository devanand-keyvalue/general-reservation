import { v4 as uuidv4 } from 'uuid';

export function generateBookingReference(): string {
  // Generate a short, human-readable reference like "BK-A3F2"
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  return `BK-${uuid.substring(0, 4)}`;
}

export function generateManageToken(bookingId: string): string {
  // Simple token for manage links (in production, use JWT or similar)
  const uuid = uuidv4().replace(/-/g, '');
  return `${bookingId}-${uuid.substring(0, 8)}`;
}

