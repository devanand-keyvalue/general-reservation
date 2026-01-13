import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase';

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

  const { businessId, date } = req.query;

  try {
    let query = supabase
      .from('bookings')
      .select('*, booking_assignments(*), services(*)')
      .eq('business_id', businessId);

    if (date) {
      query = query.eq('booking_date', date);
    }

    const { data, error } = await query.order('start_time');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ bookings: data || [] });
  } catch (error) {
    console.error('Get manager bookings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

