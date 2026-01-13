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
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('business_id', businessId)
        .order('name');

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ tables: data || [] });
    } catch (error) {
      console.error('Get tables error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, capacity, zone } = req.body;

      const { data, error } = await supabase
        .from('tables')
        .insert({
          business_id: businessId,
          name,
          capacity,
          zone: zone || null,
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json({ table: data });
    } catch (error) {
      console.error('Create table error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

