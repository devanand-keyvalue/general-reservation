import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessId, bookingId } = req.query;

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'no_show' })
      .eq('business_id', businessId)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ booking: data });
  } catch (error) {
    console.error('No-show error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

