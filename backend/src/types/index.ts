export type BusinessType = 'restaurant' | 'spa';
export type BookingStatus = 'confirmed' | 'cancelled' | 'no_show';
export type SlotInterval = 15 | 30;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  timezone: string;
  slot_interval: SlotInterval;
  max_booking_horizon_days: number;
  allow_same_day: boolean;
  same_day_cutoff_minutes: number;
  notes_enabled: boolean;
  sms_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: DayOfWeek;
  open_time: string; // HH:mm
  close_time: string; // HH:mm
  is_closed: boolean;
}

export interface Table {
  id: string;
  business_id: string;
  name: string;
  capacity: number;
  zone: string | null;
  tags: string[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  buffer_minutes: number;
  requires_room: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Staff {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StaffService {
  id: string;
  staff_id: string;
  service_id: string;
}

export interface StaffSchedule {
  id: string;
  staff_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  is_available: boolean;
}

export interface StaffScheduleException {
  id: string;
  staff_id: string;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:mm, null means full day off
  end_time: string | null;
  is_available: boolean;
  reason: string | null;
}

export interface Room {
  id: string;
  business_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  business_id: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  party_size: number | null; // Restaurant only
  service_id: string | null; // Spa only
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface BookingAssignment {
  id: string;
  booking_id: string;
  resource_type: 'table' | 'staff' | 'room';
  resource_id: string;
}

export interface SlotHold {
  id: string;
  business_id: string;
  date: string;
  start_time: string;
  end_time: string;
  resource_type: 'table' | 'staff' | 'room';
  resource_id: string;
  expires_at: string;
  created_at: string;
}

export interface SlotBlock {
  id: string;
  business_id: string;
  date: string;
  start_time: string;
  end_time: string;
  resource_type: 'table' | 'staff' | 'room' | null; // null = global
  resource_id: string | null;
  reason: string | null;
  created_at: string;
}

// API Request/Response types
export interface AvailabilityRequest {
  date: string;
  party_size?: number; // Restaurant
  service_id?: string; // Spa
  staff_id?: string; // Optional staff preference for Spa
  time_range?: {
    start: string;
    end: string;
  };
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  resources: {
    type: 'table' | 'staff' | 'room';
    id: string;
    name: string;
  }[];
}

export interface CreateBookingRequest {
  date: string;
  start_time: string;
  customer_name: string;
  customer_phone: string;
  party_size?: number;
  service_id?: string;
  staff_id?: string;
  notes?: string;
}

export interface ModifyBookingRequest {
  date?: string;
  start_time?: string;
  party_size?: number;
  service_id?: string;
  notes?: string;
}

