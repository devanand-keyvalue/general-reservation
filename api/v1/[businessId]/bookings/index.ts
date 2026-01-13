import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { businessId } = req.query;

  if (req.method === 'GET') {
    return handleGetBookings(req, res, businessId as string);
  } else if (req.method === 'POST') {
    return handleCreateBooking(req, res, businessId as string);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetBookings(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { phone, reference } = req.query;

  try {
    let query = supabase
      .from('bookings')
      .select('*, booking_assignments(*)')
      .eq('business_id', businessId);

    if (phone) {
      query = query.eq('customer_phone', phone);
    }
    if (reference) {
      query = query.eq('reference', reference);
    }

    const { data, error } = await query.order('booking_date', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ bookings: data || [] });
  } catch (error) {
    console.error('Get bookings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCreateBooking(req: VercelRequest, res: VercelResponse, businessId: string) {
  try {
    const {
      date,
      start_time,
      customer_name,
      customer_phone,
      party_size,
      service_id,
      staff_id,
      notes,
    } = req.body;

    // Validate required fields
    if (!date || !start_time || !customer_name || !customer_phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get business
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Generate reference
    const reference = generateReference();

    // Calculate duration
    let durationMinutes = 60;
    if (business.type === 'restaurant') {
      const { data: config } = await supabase
        .from('restaurant_configs')
        .select('default_seating_duration_minutes')
        .eq('business_id', businessId)
        .single();
      durationMinutes = config?.default_seating_duration_minutes || 90;
    } else if (service_id) {
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', service_id)
        .single();
      durationMinutes = service?.duration_minutes || 60;
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        business_id: businessId,
        reference,
        customer_name,
        customer_phone,
        booking_date: date,
        start_time,
        duration_minutes: durationMinutes,
        party_size: party_size || null,
        service_id: service_id || null,
        notes: notes || null,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking error:', bookingError);
      return res.status(400).json({ error: bookingError.message });
    }

    // Create assignment
    if (business.type === 'restaurant') {
      // Find available table
      const { data: tables } = await supabase
        .from('tables')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .gte('capacity', party_size || 1)
        .order('capacity');

      if (tables && tables.length > 0) {
        await supabase.from('booking_assignments').insert({
          booking_id: booking.id,
          resource_type: 'table',
          resource_id: tables[0].id,
        });
      }
    } else if (staff_id) {
      await supabase.from('booking_assignments').insert({
        booking_id: booking.id,
        resource_type: 'staff',
        resource_id: staff_id,
      });
    }

    return res.status(201).json({ booking });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function generateReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

