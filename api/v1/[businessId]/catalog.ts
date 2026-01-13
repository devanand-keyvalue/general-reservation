import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessId } = req.query;

  try {
    // Get business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get business hours
    const { data: hours } = await supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', businessId)
      .order('day_of_week');

    // Get restaurant config if applicable
    let restaurant_config = null;
    if (business.type === 'restaurant') {
      const { data } = await supabase
        .from('restaurant_configs')
        .select('*')
        .eq('business_id', businessId)
        .single();
      restaurant_config = data;
    }

    // Get services if spa
    let services = null;
    if (business.type === 'spa') {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      services = data;
    }

    // Get staff if spa
    let staff = null;
    if (business.type === 'spa') {
      const { data } = await supabase
        .from('staff')
        .select('*, staff_services(service_id)')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      staff = data;
    }

    return res.status(200).json({
      business,
      hours: hours || [],
      restaurant_config,
      services,
      staff,
    });
  } catch (error) {
    console.error('Catalog error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

