import { Router, Request, Response } from 'express';
import supabase from '../utils/supabase.js';

const router = Router();

// GET /api/v1/:businessId/catalog - Get services, hours, and policies (for Vapi Q&A)
router.get('/:businessId/catalog', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    
    console.log('Fetching catalog for business:', businessId);
    
    // Get business info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    console.log('Business query result:', { business, error: businessError });
    
    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found', details: businessError?.message });
    }
    
    // Get business hours
    const { data: hours } = await supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', businessId)
      .order('day_of_week');
    
    let services = null;
    let tables = null;
    let staff = null;
    let restaurantConfig = null;
    
    if (business.type === 'spa') {
      // Get services for spa
      const { data: serviceData } = await supabase
        .from('services')
        .select('id, name, duration_minutes')
        .eq('business_id', businessId)
        .eq('is_active', true);
      services = serviceData;
      
      // Get staff
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('is_active', true);
      staff = staffData;
    } else {
      // Get restaurant config
      const { data: config } = await supabase
        .from('restaurant_configs')
        .select('seating_duration_minutes, max_party_size')
        .eq('business_id', businessId)
        .single();
      restaurantConfig = config;
      
      // Get table info
      const { data: tableData } = await supabase
        .from('tables')
        .select('id, name, capacity, zone')
        .eq('business_id', businessId)
        .eq('is_active', true);
      tables = tableData;
    }
    
    res.json({
      business: {
        id: business.id,
        name: business.name,
        type: business.type,
        timezone: business.timezone,
        max_booking_horizon_days: business.max_booking_horizon_days,
        allow_same_day: business.allow_same_day,
        notes_enabled: business.notes_enabled
      },
      hours: (hours || []).map(h => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed
      })),
      services,
      tables,
      staff,
      restaurant_config: restaurantConfig
    });
  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/:businessId/resources - Get resources (tables or staff)
router.get('/:businessId/resources', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { type } = req.query;
    
    // Get business type
    const { data: business } = await supabase
      .from('businesses')
      .select('type')
      .eq('id', businessId)
      .single();
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    let resources;
    
    if (type === 'table' || (!type && business.type === 'restaurant')) {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);
      resources = data;
    } else if (type === 'staff' || (!type && business.type === 'spa')) {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);
      resources = data;
    } else if (type === 'room') {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);
      resources = data;
    }
    
    res.json({ resources });
  } catch (error) {
    console.error('Resources error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

