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
  const { resource_type, resource_id } = req.body;

  try {
    // Get business type
    const { data: business } = await supabase
      .from('businesses')
      .select('type')
      .eq('id', businessId)
      .single();

    const resourceType = resource_type || (business?.type === 'restaurant' ? 'table' : 'staff');

    // Delete existing assignment
    await supabase
      .from('booking_assignments')
      .delete()
      .eq('booking_id', bookingId)
      .eq('resource_type', resourceType);

    // Create new assignment
    const { data, error } = await supabase
      .from('booking_assignments')
      .insert({
        booking_id: bookingId,
        resource_type: resourceType,
        resource_id,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ assignment: data });
  } catch (error) {
    console.error('Reassign error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

