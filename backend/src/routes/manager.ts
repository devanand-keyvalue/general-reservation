import { Router, Request, Response } from 'express';
import { z } from 'zod';
import supabase from '../utils/supabase.js';

const router = Router();

// === BUSINESS CONFIG ===

// GET /api/v1/manager/:businessId - Get business config
router.get('/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (error || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    res.json({ business });
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/manager/:businessId - Update business config
router.patch('/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', businessId)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ business: data });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === BUSINESS HOURS ===

// GET /api/v1/manager/:businessId/hours
router.get('/:businessId/hours', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    
    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', businessId)
      .order('day_of_week');
    
    res.json({ hours: data || [] });
  } catch (error) {
    console.error('Get hours error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/manager/:businessId/hours
router.put('/:businessId/hours', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { hours } = req.body;
    
    // Delete existing hours
    await supabase
      .from('business_hours')
      .delete()
      .eq('business_id', businessId);
    
    // Insert new hours
    const hoursWithBusiness = hours.map((h: any) => ({
      ...h,
      business_id: businessId
    }));
    
    const { data, error } = await supabase
      .from('business_hours')
      .insert(hoursWithBusiness)
      .select();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ hours: data });
  } catch (error) {
    console.error('Update hours error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === RESTAURANT CONFIG ===

// GET /api/v1/manager/:businessId/restaurant-config
router.get('/:businessId/restaurant-config', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    
    const { data, error } = await supabase
      .from('restaurant_configs')
      .select('*')
      .eq('business_id', businessId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ config: data || { seating_duration_minutes: 90, buffer_minutes: 0, max_party_size: 12 } });
  } catch (error) {
    console.error('Get restaurant config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/manager/:businessId/restaurant-config
router.patch('/:businessId/restaurant-config', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const updates = req.body;
    
    // Check if config exists
    const { data: existing } = await supabase
      .from('restaurant_configs')
      .select('id')
      .eq('business_id', businessId)
      .single();
    
    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('restaurant_configs')
        .update(updates)
        .eq('business_id', businessId)
        .select()
        .single();
      
      if (error) return res.status(400).json({ error: error.message });
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('restaurant_configs')
        .insert({ business_id: businessId, ...updates })
        .select()
        .single();
      
      if (error) return res.status(400).json({ error: error.message });
      result = data;
    }
    
    res.json({ config: result });
  } catch (error) {
    console.error('Update restaurant config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === TABLES (Restaurant) ===

// GET /api/v1/manager/:businessId/tables
router.get('/:businessId/tables', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    
    res.json({ tables: data || [] });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/manager/:businessId/tables
router.post('/:businessId/tables', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { name, capacity, zone, tags, notes } = req.body;
    
    const { data, error } = await supabase
      .from('tables')
      .insert({
        business_id: businessId,
        name,
        capacity,
        zone: zone || null,
        tags: tags || [],
        notes: notes || null
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json({ table: data });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/manager/:businessId/tables/:tableId
router.patch('/:businessId/tables/:tableId', async (req: Request, res: Response) => {
  try {
    const { tableId } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('tables')
      .update(updates)
      .eq('id', tableId)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ table: data });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/manager/:businessId/tables/:tableId
router.delete('/:businessId/tables/:tableId', async (req: Request, res: Response) => {
  try {
    const { tableId } = req.params;
    
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('tables')
      .update({ is_active: false })
      .eq('id', tableId);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === SERVICES (Spa) ===

// GET /api/v1/manager/:businessId/services
router.get('/:businessId/services', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    
    res.json({ services: data || [] });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/manager/:businessId/services
router.post('/:businessId/services', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { name, duration_minutes, buffer_minutes, requires_room } = req.body;
    
    const { data, error } = await supabase
      .from('services')
      .insert({
        business_id: businessId,
        name,
        duration_minutes,
        buffer_minutes: buffer_minutes || 0,
        requires_room: requires_room || false
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json({ service: data });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/manager/:businessId/services/:serviceId
router.patch('/:businessId/services/:serviceId', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ service: data });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === STAFF (Spa) ===

// GET /api/v1/manager/:businessId/staff
router.get('/:businessId/staff', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    
    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        staff_services(service_id),
        staff_schedules(*)
      `)
      .eq('business_id', businessId)
      .order('name');
    
    res.json({ staff: data || [] });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/manager/:businessId/staff
router.post('/:businessId/staff', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { name, email, phone, service_ids } = req.body;
    
    const { data: staffMember, error } = await supabase
      .from('staff')
      .insert({
        business_id: businessId,
        name,
        email: email || null,
        phone: phone || null
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Add staff services
    if (service_ids && service_ids.length > 0) {
      const staffServices = service_ids.map((sid: string) => ({
        staff_id: staffMember.id,
        service_id: sid
      }));
      
      await supabase
        .from('staff_services')
        .insert(staffServices);
    }
    
    res.status(201).json({ staff: staffMember });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/manager/:businessId/staff/:staffId
router.patch('/:businessId/staff/:staffId', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const { name, email, phone } = req.body;
    
    const { data, error } = await supabase
      .from('staff')
      .update({ name, email: email || null, phone: phone || null })
      .eq('id', staffId)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ staff: data });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/manager/:businessId/staff/:staffId
router.delete('/:businessId/staff/:staffId', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('staff')
      .update({ is_active: false })
      .eq('id', staffId);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/manager/:businessId/staff/:staffId/schedules
router.get('/:businessId/staff/:staffId/schedules', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    
    const { data, error } = await supabase
      .from('staff_schedules')
      .select('*')
      .eq('staff_id', staffId)
      .order('day_of_week');
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ schedules: data || [] });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/manager/:businessId/staff/:staffId/schedules
router.post('/:businessId/staff/:staffId/schedules', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const { day_of_week, start_time, end_time } = req.body;
    
    const { data, error } = await supabase
      .from('staff_schedules')
      .insert({
        staff_id: staffId,
        day_of_week,
        start_time,
        end_time,
        is_available: true
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json({ schedule: data });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/manager/:businessId/schedules/:scheduleId
router.delete('/:businessId/schedules/:scheduleId', async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    
    const { error } = await supabase
      .from('staff_schedules')
      .delete()
      .eq('id', scheduleId);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/manager/:businessId/staff/:staffId/schedule
router.put('/:businessId/staff/:staffId/schedule', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const { schedules } = req.body;
    
    // Delete existing schedules
    await supabase
      .from('staff_schedules')
      .delete()
      .eq('staff_id', staffId);
    
    // Insert new schedules
    const schedulesWithStaff = schedules.map((s: any) => ({
      ...s,
      staff_id: staffId
    }));
    
    const { data, error } = await supabase
      .from('staff_schedules')
      .insert(schedulesWithStaff)
      .select();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ schedules: data });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/manager/:businessId/staff/:staffId/exceptions
router.post('/:businessId/staff/:staffId/exceptions', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const { date, start_time, end_time, is_available, reason } = req.body;
    
    const { data, error } = await supabase
      .from('staff_schedule_exceptions')
      .insert({
        staff_id: staffId,
        date,
        start_time: start_time || null,
        end_time: end_time || null,
        is_available,
        reason: reason || null
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json({ exception: data });
  } catch (error) {
    console.error('Create exception error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === SLOT BLOCKS ===

// GET /api/v1/manager/:businessId/blocks
router.get('/:businessId/blocks', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { date } = req.query;
    
    let query = supabase
      .from('slot_blocks')
      .select('*')
      .eq('business_id', businessId);
    
    if (date) {
      query = query.eq('date', date);
    }
    
    const { data, error } = await query;
    
    res.json({ blocks: data || [] });
  } catch (error) {
    console.error('Get blocks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/manager/:businessId/blocks
router.post('/:businessId/blocks', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { date, start_time, end_time, resource_type, resource_id, reason } = req.body;
    
    const { data, error } = await supabase
      .from('slot_blocks')
      .insert({
        business_id: businessId,
        date,
        start_time,
        end_time,
        resource_type: resource_type || null,
        resource_id: resource_id || null,
        reason: reason || null
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json({ block: data });
  } catch (error) {
    console.error('Create block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/manager/:businessId/blocks/:blockId
router.delete('/:businessId/blocks/:blockId', async (req: Request, res: Response) => {
  try {
    const { blockId } = req.params;
    
    const { error } = await supabase
      .from('slot_blocks')
      .delete()
      .eq('id', blockId);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === BOOKINGS FOR MANAGER ===

// GET /api/v1/manager/:businessId/bookings - Get all bookings with filters
router.get('/:businessId/bookings', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { date, status, view } = req.query;
    
    let query = supabase
      .from('bookings')
      .select(`
        *,
        booking_assignments(*),
        services(*)
      `)
      .eq('business_id', businessId)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (date) {
      query = query.eq('booking_date', date);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ bookings: data || [] });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

