import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessId, date, party_size, service_id, staff_id } = req.query;

  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
    // Get business
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get business hours for the day
    const dayOfWeek = new Date(date).getDay();
    const { data: hours } = await supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', businessId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!hours || hours.is_closed) {
      return res.status(200).json({ slots: [] });
    }

    // Generate time slots based on slot_interval
    const slots = generateTimeSlots(
      hours.open_time,
      hours.close_time,
      business.slot_interval || 30
    );

    // Get existing bookings for the date
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, booking_assignments(*)')
      .eq('business_id', businessId)
      .eq('booking_date', date)
      .eq('status', 'confirmed');

    // Get blocked slots
    const { data: blocks } = await supabase
      .from('slot_blocks')
      .select('*')
      .eq('business_id', businessId)
      .eq('date', date);

    // Filter available slots based on business type
    let availableSlots;
    if (business.type === 'restaurant') {
      availableSlots = await getRestaurantAvailability(
        businessId as string,
        date,
        slots,
        bookings || [],
        blocks || [],
        parseInt(party_size as string) || 2
      );
    } else {
      availableSlots = await getSpaAvailability(
        businessId as string,
        date,
        slots,
        bookings || [],
        blocks || [],
        service_id as string,
        staff_id as string
      );
    }

    return res.status(200).json({ slots: availableSlots });
  } catch (error) {
    console.error('Availability error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function generateTimeSlots(openTime: string, closeTime: string, interval: number): string[] {
  const slots: string[] = [];
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  let currentMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  while (currentMinutes < closeMinutes - interval) {
    const hour = Math.floor(currentMinutes / 60);
    const min = currentMinutes % 60;
    slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    currentMinutes += interval;
  }
  
  return slots;
}

async function getRestaurantAvailability(
  businessId: string,
  date: string,
  slots: string[],
  bookings: any[],
  blocks: any[],
  partySize: number
): Promise<Array<{ start_time: string; available: boolean }>> {
  // Get tables
  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true);

  // Get restaurant config
  const { data: config } = await supabase
    .from('restaurant_configs')
    .select('*')
    .eq('business_id', businessId)
    .single();

  const seatingDuration = config?.default_seating_duration_minutes || 90;
  const suitableTables = (tables || []).filter(t => t.capacity >= partySize);

  return slots.map(slot => {
    // Check if any suitable table is available at this time
    const slotMinutes = timeToMinutes(slot);
    const slotEndMinutes = slotMinutes + seatingDuration;

    const available = suitableTables.some(table => {
      // Check if table is blocked
      const isBlocked = blocks.some(block => {
        if (block.table_id && block.table_id !== table.id) return false;
        const blockStart = timeToMinutes(block.start_time);
        const blockEnd = timeToMinutes(block.end_time);
        return slotMinutes < blockEnd && slotEndMinutes > blockStart;
      });
      if (isBlocked) return false;

      // Check if table has a booking at this time
      const hasBooking = bookings.some(booking => {
        const assignment = booking.booking_assignments?.find(
          (a: any) => a.resource_type === 'table' && a.resource_id === table.id
        );
        if (!assignment) return false;
        
        const bookingStart = timeToMinutes(booking.start_time);
        const bookingEnd = bookingStart + (booking.duration_minutes || seatingDuration);
        return slotMinutes < bookingEnd && slotEndMinutes > bookingStart;
      });

      return !hasBooking;
    });

    return { start_time: slot, available };
  });
}

async function getSpaAvailability(
  businessId: string,
  date: string,
  slots: string[],
  bookings: any[],
  blocks: any[],
  serviceId?: string,
  staffId?: string
): Promise<Array<{ start_time: string; available: boolean; staff_id?: string }>> {
  // Get service duration
  let serviceDuration = 60;
  if (serviceId) {
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single();
    serviceDuration = service?.duration_minutes || 60;
  }

  // Get staff members
  let staffQuery = supabase
    .from('staff')
    .select('*, staff_schedules(*)')
    .eq('business_id', businessId)
    .eq('is_active', true);

  if (staffId) {
    staffQuery = staffQuery.eq('id', staffId);
  }

  const { data: staffMembers } = await staffQuery;
  const dayOfWeek = new Date(date).getDay();

  return slots.map(slot => {
    const slotMinutes = timeToMinutes(slot);
    const slotEndMinutes = slotMinutes + serviceDuration;

    // Find an available staff member
    const availableStaff = (staffMembers || []).find(staff => {
      // Check staff schedule
      const schedule = staff.staff_schedules?.find(
        (s: any) => s.day_of_week === dayOfWeek
      );
      if (!schedule || !schedule.is_available) return false;

      const scheduleStart = timeToMinutes(schedule.start_time);
      const scheduleEnd = timeToMinutes(schedule.end_time);
      if (slotMinutes < scheduleStart || slotEndMinutes > scheduleEnd) return false;

      // Check if blocked
      const isBlocked = blocks.some(block => {
        if (block.staff_id && block.staff_id !== staff.id) return false;
        const blockStart = timeToMinutes(block.start_time);
        const blockEnd = timeToMinutes(block.end_time);
        return slotMinutes < blockEnd && slotEndMinutes > blockStart;
      });
      if (isBlocked) return false;

      // Check existing bookings
      const hasBooking = bookings.some(booking => {
        const assignment = booking.booking_assignments?.find(
          (a: any) => a.resource_type === 'staff' && a.resource_id === staff.id
        );
        if (!assignment) return false;

        const bookingStart = timeToMinutes(booking.start_time);
        const bookingEnd = bookingStart + (booking.duration_minutes || serviceDuration);
        return slotMinutes < bookingEnd && slotEndMinutes > bookingStart;
      });

      return !hasBooking;
    });

    return {
      start_time: slot,
      available: !!availableStaff,
      staff_id: availableStaff?.id,
    };
  });
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

