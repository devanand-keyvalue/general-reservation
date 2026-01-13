import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { businessId, blockId } = req.query;

  if (req.method === 'GET') {
    try {
      const { date } = req.query;
      let query = supabase
        .from('slot_blocks')
        .select('*')
        .eq('business_id', businessId);

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query.order('date');

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ blocks: data || [] });
    } catch (error) {
      console.error('Get blocks error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { date, start_time, end_time, table_id, staff_id, reason } = req.body;

      const { data, error } = await supabase
        .from('slot_blocks')
        .insert({
          business_id: businessId,
          date,
          start_time,
          end_time,
          table_id: table_id || null,
          staff_id: staff_id || null,
          reason: reason || null,
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json({ block: data });
    } catch (error) {
      console.error('Create block error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE' && blockId) {
    try {
      const { error } = await supabase
        .from('slot_blocks')
        .delete()
        .eq('id', blockId)
        .eq('business_id', businessId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete block error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

