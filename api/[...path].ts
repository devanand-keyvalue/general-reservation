import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse the path - /api/v1/businessId/... -> ['v1', 'businessId', ...]
  const pathParam = req.query.path;
  const fullPath = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];
  const method = req.method || 'GET';

  // Remove 'v1' prefix if present
  const pathParts = fullPath[0] === 'v1' ? fullPath.slice(1) : fullPath;

  try {
    // Route: GET /api/v1/:businessId/catalog
    if (pathParts.length === 2 && pathParts[1] === 'catalog' && method === 'GET') {
      return handleCatalog(req, res, pathParts[0]);
    }

    // Route: GET /api/v1/:businessId/availability
    if (pathParts.length === 2 && pathParts[1] === 'availability' && method === 'GET') {
      return handleAvailability(req, res, pathParts[0]);
    }

    // Route: GET/POST /api/v1/:businessId/bookings
    if (pathParts.length === 2 && pathParts[1] === 'bookings') {
      if (method === 'GET') return handleGetBookings(req, res, pathParts[0]);
      if (method === 'POST') return handleCreateBooking(req, res, pathParts[0]);
    }

    // Route: GET/PATCH /api/v1/:businessId/bookings/:bookingId
    if (pathParts.length === 3 && pathParts[1] === 'bookings') {
      if (method === 'GET') return handleGetBooking(res, pathParts[0], pathParts[2]);
      if (method === 'PATCH') return handleUpdateBooking(req, res, pathParts[0], pathParts[2]);
    }

    // Route: POST /api/v1/:businessId/bookings/:bookingId/cancel
    if (pathParts.length === 4 && pathParts[1] === 'bookings' && pathParts[3] === 'cancel' && method === 'POST') {
      return handleCancelBooking(res, pathParts[0], pathParts[2]);
    }

    // Route: POST /api/v1/:businessId/bookings/:bookingId/no-show
    if (pathParts.length === 4 && pathParts[1] === 'bookings' && pathParts[3] === 'no-show' && method === 'POST') {
      return handleNoShow(res, pathParts[0], pathParts[2]);
    }

    // Route: POST /api/v1/:businessId/bookings/:bookingId/reassign
    if (pathParts.length === 4 && pathParts[1] === 'bookings' && pathParts[3] === 'reassign' && method === 'POST') {
      return handleReassign(req, res, pathParts[0], pathParts[2]);
    }

    // Manager routes: /api/v1/manager/:businessId/...
    if (pathParts[0] === 'manager' && pathParts.length >= 2) {
      const businessId = pathParts[1];
      const subPath = pathParts[2] || '';

      // GET/PATCH /api/v1/manager/:businessId
      if (pathParts.length === 2) {
        if (method === 'GET') return handleManagerGetBusiness(res, businessId);
        if (method === 'PATCH') return handleManagerUpdateBusiness(req, res, businessId);
      }

      // GET /api/v1/manager/:businessId/bookings
      if (subPath === 'bookings' && method === 'GET') {
        return handleManagerGetBookings(req, res, businessId);
      }

      // GET/POST /api/v1/manager/:businessId/tables
      if (subPath === 'tables') {
        if (method === 'GET') return handleGetTables(res, businessId);
        if (method === 'POST') return handleCreateTable(req, res, businessId);
      }

      // GET/POST /api/v1/manager/:businessId/staff
      if (subPath === 'staff') {
        if (method === 'GET') return handleGetStaff(res, businessId);
        if (method === 'POST') return handleCreateStaff(req, res, businessId);
      }

      // GET/PUT /api/v1/manager/:businessId/hours
      if (subPath === 'hours') {
        if (method === 'GET') return handleGetHours(res, businessId);
        if (method === 'PUT') return handleUpdateHours(req, res, businessId);
      }

      // GET/POST /api/v1/manager/:businessId/services
      if (subPath === 'services') {
        if (method === 'GET') return handleGetServices(res, businessId);
        if (method === 'POST') return handleCreateService(req, res, businessId);
      }

      // GET/POST/DELETE /api/v1/manager/:businessId/blocks
      if (subPath === 'blocks') {
        if (method === 'GET') return handleGetBlocks(req, res, businessId);
        if (method === 'POST') return handleCreateBlock(req, res, businessId);
        if (method === 'DELETE') return handleDeleteBlock(req, res, businessId);
      }

      // GET/PATCH /api/v1/manager/:businessId/restaurant-config
      if (subPath === 'restaurant-config') {
        if (method === 'GET') return handleGetRestaurantConfig(res, businessId);
        if (method === 'PATCH') return handleUpdateRestaurantConfig(req, res, businessId);
      }
    }

    return res.status(404).json({ error: 'Not found', path: fullPath, pathParts });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ============ CATALOG ============
async function handleCatalog(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (businessError || !business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .order('day_of_week');

  let restaurant_config = null;
  if (business.type === 'restaurant') {
    const { data } = await supabase
      .from('restaurant_configs')
      .select('*')
      .eq('business_id', businessId)
      .single();
    restaurant_config = data;
  }

  let services = null;
  let staff = null;
  if (business.type === 'spa') {
    const { data: svcData } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name');
    services = svcData;

    const { data: staffData } = await supabase
      .from('staff')
      .select('*, staff_services(service_id)')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name');
    staff = staffData;
  }

  return res.status(200).json({
    business,
    hours: hours || [],
    restaurant_config,
    services,
    staff,
  });
}

// ============ AVAILABILITY ============
async function handleAvailability(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { date, party_size, service_id, staff_id } = req.query;

  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Date is required' });
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  const dayOfWeek = new Date(date).getDay();
  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!hours || hours.is_closed) {
    return res.status(200).json({ slots: [] });
  }

  const slots = generateTimeSlots(hours.open_time, hours.close_time, business.slot_interval || 30);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, booking_assignments(*)')
    .eq('business_id', businessId)
    .eq('booking_date', date)
    .eq('status', 'confirmed');

  const { data: blocks } = await supabase
    .from('slot_blocks')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', date);

  let availableSlots;
  if (business.type === 'restaurant') {
    availableSlots = await getRestaurantAvailability(
      businessId, date, slots, bookings || [], blocks || [],
      parseInt(party_size as string) || 2
    );
  } else {
    availableSlots = await getSpaAvailability(
      businessId, date, slots, bookings || [], blocks || [],
      service_id as string, staff_id as string
    );
  }

  return res.status(200).json({ slots: availableSlots });
}

function generateTimeSlots(openTime: string, closeTime: string, interval: number): string[] {
  const slots: string[] = [];
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  let currentMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  while (currentMinutes < closeMinutes - interval) {
    const hour = Math.floor(currentMinutes / 60);
    const min = currentMinutes % 60;
    slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    currentMinutes += interval;
  }
  
  return slots;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

async function getRestaurantAvailability(
  businessId: string, date: string, slots: string[],
  bookings: any[], blocks: any[], partySize: number
): Promise<Array<{ start_time: string; available: boolean }>> {
  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true);

  const { data: config } = await supabase
    .from('restaurant_configs')
    .select('*')
    .eq('business_id', businessId)
    .single();

  const seatingDuration = config?.default_seating_duration_minutes || 90;
  const suitableTables = (tables || []).filter(t => t.capacity >= partySize);

  return slots.map(slot => {
    const slotMinutes = timeToMinutes(slot);
    const slotEndMinutes = slotMinutes + seatingDuration;

    const available = suitableTables.some(table => {
      const isBlocked = blocks.some(block => {
        if (block.table_id && block.table_id !== table.id) return false;
        const blockStart = timeToMinutes(block.start_time);
        const blockEnd = timeToMinutes(block.end_time);
        return slotMinutes < blockEnd && slotEndMinutes > blockStart;
      });
      if (isBlocked) return false;

      const hasBooking = bookings.some(booking => {
        const assignment = booking.booking_assignments?.find(
          (a: any) => a.resource_type === 'table' && a.resource_id === table.id
        );
        if (!assignment) return false;
        const bookingStart = timeToMinutes(booking.start_time);
        const bookingEnd = bookingStart + (booking.duration_minutes || seatingDuration);
        return slotMinutes < bookingEnd && slotEndMinutes > bookingStart;
      });

      return !hasBooking;
    });

    return { start_time: slot, available };
  });
}

async function getSpaAvailability(
  businessId: string, date: string, slots: string[],
  bookings: any[], blocks: any[], serviceId?: string, staffId?: string
): Promise<Array<{ start_time: string; available: boolean; staff_id?: string }>> {
  let serviceDuration = 60;
  if (serviceId) {
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single();
    serviceDuration = service?.duration_minutes || 60;
  }

  let staffQuery = supabase
    .from('staff')
    .select('*, staff_schedules(*)')
    .eq('business_id', businessId)
    .eq('is_active', true);

  if (staffId) {
    staffQuery = staffQuery.eq('id', staffId);
  }

  const { data: staffMembers } = await staffQuery;
  const dayOfWeek = new Date(date).getDay();

  return slots.map(slot => {
    const slotMinutes = timeToMinutes(slot);
    const slotEndMinutes = slotMinutes + serviceDuration;

    const availableStaff = (staffMembers || []).find(staff => {
      const schedule = staff.staff_schedules?.find((s: any) => s.day_of_week === dayOfWeek);
      if (!schedule || !schedule.is_available) return false;

      const scheduleStart = timeToMinutes(schedule.start_time);
      const scheduleEnd = timeToMinutes(schedule.end_time);
      if (slotMinutes < scheduleStart || slotEndMinutes > scheduleEnd) return false;

      const isBlocked = blocks.some(block => {
        if (block.staff_id && block.staff_id !== staff.id) return false;
        const blockStart = timeToMinutes(block.start_time);
        const blockEnd = timeToMinutes(block.end_time);
        return slotMinutes < blockEnd && slotEndMinutes > blockStart;
      });
      if (isBlocked) return false;

      const hasBooking = bookings.some(booking => {
        const assignment = booking.booking_assignments?.find(
          (a: any) => a.resource_type === 'staff' && a.resource_id === staff.id
        );
        if (!assignment) return false;
        const bookingStart = timeToMinutes(booking.start_time);
        const bookingEnd = bookingStart + (booking.duration_minutes || serviceDuration);
        return slotMinutes < bookingEnd && slotEndMinutes > bookingStart;
      });

      return !hasBooking;
    });

    return { start_time: slot, available: !!availableStaff, staff_id: availableStaff?.id };
  });
}

// ============ BOOKINGS ============
async function handleGetBookings(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { phone, reference } = req.query;

  let query = supabase
    .from('bookings')
    .select('*, booking_assignments(*)')
    .eq('business_id', businessId);

  if (phone) query = query.eq('customer_phone', phone);
  if (reference) query = query.eq('reference', reference);

  const { data, error } = await query.order('booking_date', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ bookings: data || [] });
}

async function handleCreateBooking(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { date, start_time, customer_name, customer_phone, party_size, service_id, staff_id, notes } = req.body;

  if (!date || !start_time || !customer_name || !customer_phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (!business) return res.status(404).json({ error: 'Business not found' });

  const reference = generateReference();

  let durationMinutes = 60;
  if (business.type === 'restaurant') {
    const { data: config } = await supabase
      .from('restaurant_configs')
      .select('default_seating_duration_minutes')
      .eq('business_id', businessId)
      .single();
    durationMinutes = config?.default_seating_duration_minutes || 90;
  } else if (service_id) {
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', service_id)
      .single();
    durationMinutes = service?.duration_minutes || 60;
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      business_id: businessId,
      reference,
      customer_name,
      customer_phone,
      booking_date: date,
      start_time,
      duration_minutes: durationMinutes,
      party_size: party_size || null,
      service_id: service_id || null,
      notes: notes || null,
      status: 'confirmed',
    })
    .select()
    .single();

  if (bookingError) return res.status(400).json({ error: bookingError.message });

  if (business.type === 'restaurant') {
    const { data: tables } = await supabase
      .from('tables')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .gte('capacity', party_size || 1)
      .order('capacity');

    if (tables && tables.length > 0) {
      await supabase.from('booking_assignments').insert({
        booking_id: booking.id,
        resource_type: 'table',
        resource_id: tables[0].id,
      });
    }
  } else if (staff_id) {
    await supabase.from('booking_assignments').insert({
      booking_id: booking.id,
      resource_type: 'staff',
      resource_id: staff_id,
    });
  }

  return res.status(201).json({ booking });
}

function generateReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function handleGetBooking(res: VercelResponse, businessId: string, bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, booking_assignments(*), services(*)')
    .eq('business_id', businessId)
    .eq('id', bookingId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Booking not found' });
  return res.status(200).json({ booking: data });
}

async function handleUpdateBooking(req: VercelRequest, res: VercelResponse, businessId: string, bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .update(req.body)
    .eq('business_id', businessId)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ booking: data });
}

async function handleCancelBooking(res: VercelResponse, businessId: string, bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('business_id', businessId)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ booking: data });
}

async function handleNoShow(res: VercelResponse, businessId: string, bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'no_show' })
    .eq('business_id', businessId)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ booking: data });
}

async function handleReassign(req: VercelRequest, res: VercelResponse, businessId: string, bookingId: string) {
  const { resource_type, resource_id } = req.body;

  const { data: business } = await supabase
    .from('businesses')
    .select('type')
    .eq('id', businessId)
    .single();

  const resourceType = resource_type || (business?.type === 'restaurant' ? 'table' : 'staff');

  await supabase
    .from('booking_assignments')
    .delete()
    .eq('booking_id', bookingId)
    .eq('resource_type', resourceType);

  const { data, error } = await supabase
    .from('booking_assignments')
    .insert({ booking_id: bookingId, resource_type: resourceType, resource_id })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ assignment: data });
}

// ============ MANAGER ============
async function handleManagerGetBusiness(res: VercelResponse, businessId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Business not found' });
  return res.status(200).json({ business: data });
}

async function handleManagerUpdateBusiness(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .update(req.body)
    .eq('id', businessId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ business: data });
}

async function handleManagerGetBookings(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { date } = req.query;

  let query = supabase
    .from('bookings')
    .select('*, booking_assignments(*), services(*)')
    .eq('business_id', businessId);

  if (date) query = query.eq('booking_date', date);

  const { data, error } = await query.order('start_time');

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ bookings: data || [] });
}

async function handleGetTables(res: VercelResponse, businessId: string) {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('business_id', businessId)
    .order('name');

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ tables: data || [] });
}

async function handleCreateTable(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { name, capacity, zone } = req.body;

  const { data, error } = await supabase
    .from('tables')
    .insert({ business_id: businessId, name, capacity, zone: zone || null })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ table: data });
}

async function handleGetStaff(res: VercelResponse, businessId: string) {
  const { data, error } = await supabase
    .from('staff')
    .select('*, staff_services(service_id), staff_schedules(*)')
    .eq('business_id', businessId)
    .order('name');

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ staff: data || [] });
}

async function handleCreateStaff(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { name, email, phone, service_ids } = req.body;

  const { data: staffMember, error } = await supabase
    .from('staff')
    .insert({ business_id: businessId, name, email: email || null, phone: phone || null })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (service_ids && service_ids.length > 0) {
    const staffServices = service_ids.map((sid: string) => ({
      staff_id: staffMember.id,
      service_id: sid,
    }));
    await supabase.from('staff_services').insert(staffServices);
  }

  return res.status(201).json({ staff: staffMember });
}

async function handleGetHours(res: VercelResponse, businessId: string) {
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .order('day_of_week');

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ hours: data || [] });
}

async function handleUpdateHours(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { hours } = req.body;

  await supabase.from('business_hours').delete().eq('business_id', businessId);

  const hoursWithBusinessId = hours.map((h: any) => ({ ...h, business_id: businessId }));
  const { data, error } = await supabase
    .from('business_hours')
    .insert(hoursWithBusinessId)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ hours: data });
}

async function handleGetServices(res: VercelResponse, businessId: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('name');

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ services: data || [] });
}

async function handleCreateService(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { name, duration_minutes, description } = req.body;

  const { data, error } = await supabase
    .from('services')
    .insert({ business_id: businessId, name, duration_minutes, description: description || null })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ service: data });
}

async function handleGetBlocks(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { date } = req.query;
  let query = supabase.from('slot_blocks').select('*').eq('business_id', businessId);
  if (date) query = query.eq('date', date);

  const { data, error } = await query.order('date');
  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ blocks: data || [] });
}

async function handleCreateBlock(req: VercelRequest, res: VercelResponse, businessId: string) {
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

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ block: data });
}

async function handleDeleteBlock(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { blockId } = req.query;

  const { error } = await supabase
    .from('slot_blocks')
    .delete()
    .eq('id', blockId)
    .eq('business_id', businessId);

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ success: true });
}

async function handleGetRestaurantConfig(res: VercelResponse, businessId: string) {
  const { data, error } = await supabase
    .from('restaurant_configs')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Restaurant config not found' });
  return res.status(200).json({ config: data });
}

async function handleUpdateRestaurantConfig(req: VercelRequest, res: VercelResponse, businessId: string) {
  const { data, error } = await supabase
    .from('restaurant_configs')
    .update(req.body)
    .eq('business_id', businessId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ config: data });
}

