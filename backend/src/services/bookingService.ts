import supabase from '../utils/supabase.js';
import { generateBookingReference } from '../utils/generateReference.js';
import { sendBookingConfirmation, sendBookingModified, sendBookingCancelled } from '../utils/sms.js';
import { getRestaurantAvailability, getSpaAvailability, createHold, releaseHolds } from './availabilityService.js';
import type { 
  Booking, 
  CreateBookingRequest, 
  ModifyBookingRequest,
  Business
} from '../types/index.js';

export async function createBooking(
  businessId: string,
  request: CreateBookingRequest
): Promise<Booking> {
  // Get business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();
  
  if (businessError || !business) {
    throw new Error('Business not found');
  }
  
  // Validate availability
  let availableSlot;
  
  if (business.type === 'restaurant') {
    if (!request.party_size) {
      throw new Error('Party size is required for restaurant bookings');
    }
    
    // Don't pass time range - get all available slots and find the matching one
    const slots = await getRestaurantAvailability(
      businessId,
      request.date,
      request.party_size
    );
    
    availableSlot = slots.find(s => s.start_time === request.start_time);
  } else {
    if (!request.service_id) {
      throw new Error('Service ID is required for spa bookings');
    }
    
    // Don't pass time range - get all available slots and find the matching one
    const slots = await getSpaAvailability(
      businessId,
      request.date,
      request.service_id,
      request.staff_id
    );
    
    availableSlot = slots.find(s => s.start_time === request.start_time);
  }
  
  if (!availableSlot) {
    throw new Error('Selected time slot is no longer available');
  }
  
  // Create hold
  const holdIds = await createHold(
    businessId,
    request.date,
    availableSlot.start_time,
    availableSlot.end_time,
    availableSlot.resources
  );
  
  try {
    // Create booking
    const reference = generateBookingReference();
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        business_id: businessId,
        reference,
        customer_name: request.customer_name,
        customer_phone: request.customer_phone,
        booking_date: request.date,
        start_time: availableSlot.start_time,
        end_time: availableSlot.end_time,
        party_size: request.party_size || null,
        service_id: request.service_id || null,
        notes: request.notes || null,
        status: 'confirmed'
      })
      .select()
      .single();
    
    if (bookingError || !booking) {
      throw new Error('Failed to create booking');
    }
    
    // Create assignments
    const assignments = availableSlot.resources.map(r => ({
      booking_id: booking.id,
      resource_type: r.type,
      resource_id: r.id
    }));
    
    await supabase
      .from('booking_assignments')
      .insert(assignments);
    
    // Release holds
    await releaseHolds(holdIds);
    
    // Send SMS
    if (business.sms_enabled) {
      let service;
      if (request.service_id) {
        const { data } = await supabase
          .from('services')
          .select('*')
          .eq('id', request.service_id)
          .single();
        service = data;
      }
      await sendBookingConfirmation(booking, business, service);
    }
    
    return booking;
  } catch (error) {
    // Release holds on failure
    await releaseHolds(holdIds);
    throw error;
  }
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_assignments(*),
      services(*)
    `)
    .eq('id', bookingId)
    .single();
  
  if (error) return null;
  return data;
}

export async function getBookingByReference(reference: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_assignments(*),
      services(*)
    `)
    .eq('reference', reference)
    .single();
  
  if (error) return null;
  return data;
}

export async function getBookingsByPhone(
  businessId: string,
  phone: string
): Promise<Booking[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_assignments(*),
      services(*)
    `)
    .eq('business_id', businessId)
    .eq('customer_phone', phone)
    .gte('booking_date', today)
    .eq('status', 'confirmed')
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true });
  
  if (error) return [];
  return data || [];
}

export async function modifyBooking(
  bookingId: string,
  request: ModifyBookingRequest
): Promise<Booking> {
  // Get existing booking
  const { data: existingBooking, error: fetchError } = await supabase
    .from('bookings')
    .select('*, booking_assignments(*)')
    .eq('id', bookingId)
    .single();
  
  if (fetchError || !existingBooking) {
    throw new Error('Booking not found');
  }
  
  if (existingBooking.status !== 'confirmed') {
    throw new Error('Cannot modify a cancelled or no-show booking');
  }
  
  // Get business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', existingBooking.business_id)
    .single();
  
  if (!business) {
    throw new Error('Business not found');
  }
  
  // If date/time is changing, validate new availability
  if (request.date || request.start_time || request.party_size || request.service_id) {
    const newDate = request.date || existingBooking.booking_date;
    const newTime = request.start_time || existingBooking.start_time;
    
    let availableSlot;
    
    if (business.type === 'restaurant') {
      const partySize = request.party_size || existingBooking.party_size;
      const slots = await getRestaurantAvailability(
        existingBooking.business_id,
        newDate,
        partySize
      );
      availableSlot = slots.find(s => s.start_time === newTime);
    } else {
      const serviceId = request.service_id || existingBooking.service_id;
      const slots = await getSpaAvailability(
        existingBooking.business_id,
        newDate,
        serviceId,
        undefined
      );
      availableSlot = slots.find(s => s.start_time === newTime);
    }
    
    if (!availableSlot) {
      throw new Error('Selected time slot is not available');
    }
    
    // Update booking with new time and resources
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_date: newDate,
        start_time: availableSlot.start_time,
        end_time: availableSlot.end_time,
        party_size: request.party_size || existingBooking.party_size,
        service_id: request.service_id || existingBooking.service_id,
        notes: request.notes !== undefined ? request.notes : existingBooking.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (updateError) {
      throw new Error('Failed to update booking');
    }
    
    // Update assignments
    await supabase
      .from('booking_assignments')
      .delete()
      .eq('booking_id', bookingId);
    
    const assignments = availableSlot.resources.map(r => ({
      booking_id: bookingId,
      resource_type: r.type,
      resource_id: r.id
    }));
    
    await supabase
      .from('booking_assignments')
      .insert(assignments);
    
    // Send SMS
    if (business.sms_enabled) {
      await sendBookingModified(updatedBooking, business);
    }
    
    return updatedBooking;
  } else {
    // Just updating notes
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        notes: request.notes !== undefined ? request.notes : existingBooking.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (updateError) {
      throw new Error('Failed to update booking');
    }
    
    return updatedBooking;
  }
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  const { data: existingBooking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();
  
  if (fetchError || !existingBooking) {
    throw new Error('Booking not found');
  }
  
  if (existingBooking.status !== 'confirmed') {
    throw new Error('Booking is already cancelled or marked as no-show');
  }
  
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();
  
  if (updateError) {
    throw new Error('Failed to cancel booking');
  }
  
  // Get business for SMS
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', existingBooking.business_id)
    .single();
  
  if (business?.sms_enabled) {
    await sendBookingCancelled(updatedBooking, business);
  }
  
  return updatedBooking;
}

export async function markNoShow(bookingId: string): Promise<Booking> {
  const { data: updatedBooking, error } = await supabase
    .from('bookings')
    .update({
      status: 'no_show',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();
  
  if (error) {
    throw new Error('Failed to mark booking as no-show');
  }
  
  return updatedBooking;
}

export async function reassignBooking(
  bookingId: string,
  newResourceId: string,
  resourceType: 'table' | 'staff' | 'room'
): Promise<void> {
  // Verify booking exists
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, booking_assignments(*)')
    .eq('id', bookingId)
    .single();
  
  if (!booking || booking.status !== 'confirmed') {
    throw new Error('Booking not found or not confirmed');
  }
  
  // Find the assignment to update
  const assignment = booking.booking_assignments.find(
    (a: any) => a.resource_type === resourceType
  );
  
  if (!assignment) {
    throw new Error('No assignment found for this resource type');
  }
  
  // Update assignment
  await supabase
    .from('booking_assignments')
    .update({ resource_id: newResourceId })
    .eq('id', assignment.id);
}

