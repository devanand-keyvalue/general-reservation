import { format, parse, addMinutes, isAfter, isBefore, isEqual } from 'date-fns';
import supabase from '../utils/supabase.js';
import type { 
  Business, 
  Table, 
  Staff, 
  Service, 
  Room,
  AvailableSlot,
  Booking,
  SlotHold,
  SlotBlock,
  StaffSchedule,
  StaffScheduleException,
  BusinessHours
} from '../types/index.js';

interface TimeSlot {
  start: string;
  end: string;
}

function parseTime(timeStr: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

function doTimesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  
  return isBefore(s1, e2) && isAfter(e1, s2);
}

async function getBusinessHoursForDay(
  businessId: string,
  date: string
): Promise<{ open: string; close: string } | null> {
  const dayOfWeek = new Date(date).getDay();
  
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .eq('day_of_week', dayOfWeek)
    .single();
  
  if (error || !data || data.is_closed) {
    return null;
  }
  
  return { open: data.open_time, close: data.close_time };
}

async function getExistingBookings(
  businessId: string,
  date: string,
  resourceType: 'table' | 'staff' | 'room',
  resourceIds: string[]
): Promise<Array<{ resourceId: string; start: string; end: string }>> {
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time,
      end_time,
      booking_assignments!inner(resource_type, resource_id)
    `)
    .eq('business_id', businessId)
    .eq('booking_date', date)
    .eq('status', 'confirmed')
    .eq('booking_assignments.resource_type', resourceType)
    .in('booking_assignments.resource_id', resourceIds);
  
  return (bookings || []).flatMap((b: any) => 
    b.booking_assignments
      .filter((a: any) => resourceIds.includes(a.resource_id))
      .map((a: any) => ({
        resourceId: a.resource_id,
        start: b.start_time,
        end: b.end_time
      }))
  );
}

async function getActiveHolds(
  businessId: string,
  date: string,
  resourceType: 'table' | 'staff' | 'room',
  resourceIds: string[]
): Promise<Array<{ resourceId: string; start: string; end: string }>> {
  const now = new Date().toISOString();
  
  const { data: holds } = await supabase
    .from('slot_holds')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', date)
    .eq('resource_type', resourceType)
    .in('resource_id', resourceIds)
    .gt('expires_at', now);
  
  return (holds || []).map(h => ({
    resourceId: h.resource_id,
    start: h.start_time,
    end: h.end_time
  }));
}

async function getSlotBlocks(
  businessId: string,
  date: string,
  resourceType: 'table' | 'staff' | 'room' | null,
  resourceIds: string[]
): Promise<Array<{ resourceId: string | null; start: string; end: string }>> {
  let query = supabase
    .from('slot_blocks')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', date);
  
  const { data: blocks } = await query;
  
  return (blocks || [])
    .filter(b => 
      b.resource_id === null || 
      (b.resource_type === resourceType && resourceIds.includes(b.resource_id))
    )
    .map(b => ({
      resourceId: b.resource_id,
      start: b.start_time,
      end: b.end_time
    }));
}

function isResourceAvailable(
  resourceId: string,
  slotStart: string,
  slotEnd: string,
  bookings: Array<{ resourceId: string; start: string; end: string }>,
  holds: Array<{ resourceId: string; start: string; end: string }>,
  blocks: Array<{ resourceId: string | null; start: string; end: string }>
): boolean {
  // Check global blocks
  for (const block of blocks) {
    if (block.resourceId === null) {
      if (doTimesOverlap(slotStart, slotEnd, block.start, block.end)) {
        return false;
      }
    }
  }
  
  // Check resource-specific blocks
  for (const block of blocks) {
    if (block.resourceId === resourceId) {
      if (doTimesOverlap(slotStart, slotEnd, block.start, block.end)) {
        return false;
      }
    }
  }
  
  // Check existing bookings
  for (const booking of bookings) {
    if (booking.resourceId === resourceId) {
      if (doTimesOverlap(slotStart, slotEnd, booking.start, booking.end)) {
        return false;
      }
    }
  }
  
  // Check holds
  for (const hold of holds) {
    if (hold.resourceId === resourceId) {
      if (doTimesOverlap(slotStart, slotEnd, hold.start, hold.end)) {
        return false;
      }
    }
  }
  
  return true;
}

export async function getRestaurantAvailability(
  businessId: string,
  date: string,
  partySize: number,
  timeRange?: { start: string; end: string }
): Promise<AvailableSlot[]> {
  // Get business config
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();
  
  if (!business) return [];
  
  // Get business hours
  const hours = await getBusinessHoursForDay(businessId, date);
  if (!hours) return [];
  
  // Get seating duration from restaurant config
  const { data: config } = await supabase
    .from('restaurant_configs')
    .select('*')
    .eq('business_id', businessId)
    .single();
  
  const seatingDuration = config?.seating_duration_minutes || 90;
  const bufferMinutes = config?.buffer_minutes || 0;
  
  // Get all active tables
  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('capacity', { ascending: true });
  
  if (!tables || tables.length === 0) return [];
  
  const tableIds = tables.map(t => t.id);
  
  // Get existing bookings, holds, and blocks
  const [bookings, holds, blocks] = await Promise.all([
    getExistingBookings(businessId, date, 'table', tableIds),
    getActiveHolds(businessId, date, 'table', tableIds),
    getSlotBlocks(businessId, date, 'table', tableIds)
  ]);
  
  // Generate time slots
  const slots: AvailableSlot[] = [];
  const slotInterval = business.slot_interval || 30;
  
  const startTime = timeRange?.start || hours.open;
  const endTime = timeRange?.end || hours.close;
  
  let currentTime = parseTime(startTime);
  const closeTime = parseTime(endTime);
  
  while (isBefore(currentTime, closeTime)) {
    const slotStart = formatTime(currentTime);
    const slotEnd = formatTime(addMinutes(currentTime, seatingDuration + bufferMinutes));
    
    // Check if slot ends before close
    if (isAfter(parseTime(slotEnd), closeTime)) {
      currentTime = addMinutes(currentTime, slotInterval);
      continue;
    }
    
    // Find tables that can accommodate the party
    const availableTables = tables.filter(table => {
      if (table.capacity < partySize) return false;
      return isResourceAvailable(table.id, slotStart, slotEnd, bookings, holds, blocks);
    });
    
    if (availableTables.length > 0) {
      // Prefer smallest table that fits
      const bestTable = availableTables[0];
      slots.push({
        start_time: slotStart,
        end_time: slotEnd,
        resources: [{
          type: 'table',
          id: bestTable.id,
          name: bestTable.name
        }]
      });
    } else {
      // Try combining tables (same zone preferred)
      const allAvailableTables = tables.filter(table =>
        isResourceAvailable(table.id, slotStart, slotEnd, bookings, holds, blocks)
      );
      
      // Simple combination: try to find tables that sum to capacity
      // Group by zone and try combinations
      const zones = [...new Set(allAvailableTables.map(t => t.zone))];
      let combinationFound = false;
      
      for (const zone of zones) {
        if (combinationFound) break;
        const zoneTables = allAvailableTables.filter(t => t.zone === zone);
        
        // Try combinations of 2-3 tables
        for (let i = 0; i < zoneTables.length && !combinationFound; i++) {
          for (let j = i + 1; j < zoneTables.length && !combinationFound; j++) {
            const combined = zoneTables[i].capacity + zoneTables[j].capacity;
            if (combined >= partySize) {
              slots.push({
                start_time: slotStart,
                end_time: slotEnd,
                resources: [
                  { type: 'table', id: zoneTables[i].id, name: zoneTables[i].name },
                  { type: 'table', id: zoneTables[j].id, name: zoneTables[j].name }
                ]
              });
              combinationFound = true;
            }
          }
        }
      }
    }
    
    currentTime = addMinutes(currentTime, slotInterval);
  }
  
  return slots;
}

async function getStaffAvailabilityForDate(
  staffId: string,
  date: string
): Promise<Array<{ start: string; end: string }>> {
  const dayOfWeek = new Date(date).getDay();
  
  // Check for exceptions first
  const { data: exceptions } = await supabase
    .from('staff_schedule_exceptions')
    .select('*')
    .eq('staff_id', staffId)
    .eq('date', date);
  
  if (exceptions && exceptions.length > 0) {
    const unavailable = exceptions.find(e => !e.is_available && !e.start_time);
    if (unavailable) return []; // Full day off
    
    const available = exceptions.filter(e => e.is_available && e.start_time && e.end_time);
    if (available.length > 0) {
      return available.map(e => ({ start: e.start_time!, end: e.end_time! }));
    }
  }
  
  // Fall back to regular schedule
  const { data: schedules } = await supabase
    .from('staff_schedules')
    .select('*')
    .eq('staff_id', staffId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_available', true);
  
  return (schedules || []).map(s => ({ start: s.start_time, end: s.end_time }));
}

export async function getSpaAvailability(
  businessId: string,
  date: string,
  serviceId: string,
  preferredStaffId?: string,
  timeRange?: { start: string; end: string }
): Promise<AvailableSlot[]> {
  // Get business config
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();
  
  if (!business) return [];
  
  // Get business hours
  const hours = await getBusinessHoursForDay(businessId, date);
  if (!hours) return [];
  
  // Get service details
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .single();
  
  if (!service) return [];
  
  // Get qualified staff
  let staffQuery = supabase
    .from('staff')
    .select(`
      *,
      staff_services!inner(service_id)
    `)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .eq('staff_services.service_id', serviceId);
  
  if (preferredStaffId) {
    staffQuery = staffQuery.eq('id', preferredStaffId);
  }
  
  const { data: staffList } = await staffQuery;
  
  if (!staffList || staffList.length === 0) return [];
  
  const staffIds = staffList.map(s => s.id);
  
  // Get rooms if required
  let rooms: any[] = [];
  if (service.requires_room) {
    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);
    rooms = roomData || [];
  }
  
  // Get existing bookings, holds, and blocks for staff
  const [staffBookings, staffHolds, staffBlocks] = await Promise.all([
    getExistingBookings(businessId, date, 'staff', staffIds),
    getActiveHolds(businessId, date, 'staff', staffIds),
    getSlotBlocks(businessId, date, 'staff', staffIds)
  ]);
  
  // Get room bookings if needed
  let roomBookings: Array<{ resourceId: string; start: string; end: string }> = [];
  let roomHolds: Array<{ resourceId: string; start: string; end: string }> = [];
  let roomBlocks: Array<{ resourceId: string | null; start: string; end: string }> = [];
  
  if (service.requires_room && rooms.length > 0) {
    const roomIds = rooms.map(r => r.id);
    [roomBookings, roomHolds, roomBlocks] = await Promise.all([
      getExistingBookings(businessId, date, 'room', roomIds),
      getActiveHolds(businessId, date, 'room', roomIds),
      getSlotBlocks(businessId, date, 'room', roomIds)
    ]);
  }
  
  // Generate time slots
  const slots: AvailableSlot[] = [];
  const slotInterval = business.slot_interval || 30;
  const serviceDuration = service.duration_minutes + (service.buffer_minutes || 0);
  
  const startTime = timeRange?.start || hours.open;
  const endTime = timeRange?.end || hours.close;
  
  let currentTime = parseTime(startTime);
  const closeTime = parseTime(endTime);
  
  while (isBefore(currentTime, closeTime)) {
    const slotStart = formatTime(currentTime);
    const slotEnd = formatTime(addMinutes(currentTime, serviceDuration));
    
    // Check if slot ends before close
    if (isAfter(parseTime(slotEnd), closeTime)) {
      currentTime = addMinutes(currentTime, slotInterval);
      continue;
    }
    
    // Find available staff
    for (const staff of staffList) {
      // Check staff schedule
      const staffSchedule = await getStaffAvailabilityForDate(staff.id, date);
      const isScheduled = staffSchedule.some(s => 
        !isAfter(parseTime(s.start), parseTime(slotStart)) && 
        !isBefore(parseTime(s.end), parseTime(slotEnd))
      );
      
      if (!isScheduled) continue;
      
      // Check staff availability
      if (!isResourceAvailable(staff.id, slotStart, slotEnd, staffBookings, staffHolds, staffBlocks)) {
        continue;
      }
      
      // Check room availability if required
      if (service.requires_room) {
        const availableRoom = rooms.find(room =>
          isResourceAvailable(room.id, slotStart, slotEnd, roomBookings, roomHolds, roomBlocks)
        );
        
        if (!availableRoom) continue;
        
        slots.push({
          start_time: slotStart,
          end_time: slotEnd,
          resources: [
            { type: 'staff', id: staff.id, name: staff.name },
            { type: 'room', id: availableRoom.id, name: availableRoom.name }
          ]
        });
      } else {
        slots.push({
          start_time: slotStart,
          end_time: slotEnd,
          resources: [
            { type: 'staff', id: staff.id, name: staff.name }
          ]
        });
      }
      
      break; // Found one available staff for this slot
    }
    
    currentTime = addMinutes(currentTime, slotInterval);
  }
  
  return slots;
}

export async function createHold(
  businessId: string,
  date: string,
  startTime: string,
  endTime: string,
  resources: Array<{ type: 'table' | 'staff' | 'room'; id: string }>
): Promise<string[]> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minute hold
  
  const holds = resources.map(r => ({
    business_id: businessId,
    date,
    start_time: startTime,
    end_time: endTime,
    resource_type: r.type,
    resource_id: r.id,
    expires_at: expiresAt
  }));
  
  const { data, error } = await supabase
    .from('slot_holds')
    .insert(holds)
    .select('id');
  
  if (error) throw error;
  
  return (data || []).map(h => h.id);
}

export async function releaseHolds(holdIds: string[]): Promise<void> {
  await supabase
    .from('slot_holds')
    .delete()
    .in('id', holdIds);
}

