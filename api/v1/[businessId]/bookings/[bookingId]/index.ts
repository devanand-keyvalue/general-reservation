import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { businessId, bookingId } = req.query;

  if (req.method === 'GET') {
    return handleGetBooking(res, businessId as string, bookingId as string);
  } else if (req.method === 'PATCH') {
    return handleUpdateBooking(req, res, businessId as string, bookingId as string);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetBooking(res: VercelResponse, businessId: string, bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, booking_assignments(*), services(*)')
      .eq('business_id', businessId)
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    return res.status(200).json({ booking: data });
  } catch (error) {
    console.error('Get booking error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleUpdateBooking(
  req: VercelRequest,
  res: VercelResponse,
  businessId: string,
  bookingId: string
) {
  try {
    const updates = req.body;

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('business_id', businessId)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ booking: data });
  } catch (error) {
    console.error('Update booking error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

