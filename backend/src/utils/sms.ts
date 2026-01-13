import type { Booking, Business, Service } from '../types/index.js';

// SMS Provider interface for future implementation
interface SMSProvider {
  send(to: string, message: string): Promise<boolean>;
}

// Stub SMS provider for development
class StubSMSProvider implements SMSProvider {
  async send(to: string, message: string): Promise<boolean> {
    console.log(`[SMS STUB] To: ${to}`);
    console.log(`[SMS STUB] Message: ${message}`);
    return true;
  }
}

const smsProvider: SMSProvider = new StubSMSProvider();

export async function sendBookingConfirmation(
  booking: Booking,
  business: Business,
  service?: Service
): Promise<void> {
  const manageLink = `${process.env.FRONTEND_URL}/manage/${booking.id}`;
  
  let message: string;
  
  if (business.type === 'restaurant') {
    message = `✅ Booking confirmed at ${business.name}: ${booking.booking_date} ${booking.start_time} for ${booking.party_size} guests. Ref: ${booking.reference}. Manage: ${manageLink}`;
  } else {
    const serviceName = service?.name || 'your service';
    message = `✅ Appointment confirmed at ${business.name}: ${serviceName} on ${booking.booking_date} ${booking.start_time}. Ref: ${booking.reference}. Manage: ${manageLink}`;
  }
  
  await smsProvider.send(booking.customer_phone, message);
}

export async function sendBookingModified(
  booking: Booking,
  business: Business
): Promise<void> {
  const message = `✏️ Booking updated at ${business.name}: ${booking.booking_date} ${booking.start_time}. Ref: ${booking.reference}`;
  await smsProvider.send(booking.customer_phone, message);
}

export async function sendBookingCancelled(
  booking: Booking,
  business: Business
): Promise<void> {
  const message = `❌ Booking cancelled at ${business.name}: ${booking.booking_date} ${booking.start_time}. Ref: ${booking.reference}`;
  await smsProvider.send(booking.customer_phone, message);
}

