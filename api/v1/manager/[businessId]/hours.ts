import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { businessId } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', businessId)
        .order('day_of_week');

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ hours: data || [] });
    } catch (error) {
      console.error('Get hours error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { hours } = req.body;

      // Delete existing hours
      await supabase
        .from('business_hours')
        .delete()
        .eq('business_id', businessId);

      // Insert new hours
      const hoursWithBusinessId = hours.map((h: any) => ({
        ...h,
        business_id: businessId,
      }));

      const { data, error } = await supabase
        .from('business_hours')
        .insert(hoursWithBusinessId)
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ hours: data });
    } catch (error) {
      console.error('Update hours error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

