import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { businessId } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('restaurant_configs')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Restaurant config not found' });
      }

      return res.status(200).json({ config: data });
    } catch (error) {
      console.error('Get restaurant config error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const updates = req.body;

      const { data, error } = await supabase
        .from('restaurant_configs')
        .update(updates)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ config: data });
    } catch (error) {
      console.error('Update restaurant config error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

