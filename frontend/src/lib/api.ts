// Use relative path in production (same domain), localhost for development
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1');

interface ApiOptions {
  method?: string;
  body?: any;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

// Types
export interface Business {
  id: string;
  name: string;
  type: 'restaurant' | 'spa';
  timezone: string;
  slot_interval: 15 | 30;
  max_booking_horizon_days: number;
  allow_same_day: boolean;
  notes_enabled: boolean;
}

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
}

export interface Staff {
  id: string;
  name: string;
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  zone: string | null;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  resources: Array<{
    type: 'table' | 'staff' | 'room';
    id: string;
    name: string;
  }>;
}

export interface Booking {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  party_size: number | null;
  service_id: string | null;
  notes: string | null;
  status: 'confirmed' | 'cancelled' | 'no_show';
  services?: Service;
  booking_assignments?: Array<{
    resource_type: string;
    resource_id: string;
  }>;
}

export interface CatalogResponse {
  business: Business;
  hours: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }>;
  services?: Service[];
  tables?: Table[];
  staff?: Staff[];
  restaurant_config?: {
    seating_duration_minutes: number;
    max_party_size: number;
  };
}

// API functions
export async function getCatalog(businessId: string): Promise<CatalogResponse> {
  return apiRequest(`/${businessId}/catalog`);
}

export async function getAvailability(
  businessId: string,
  date: string,
  params: { party_size?: number; service_id?: string; staff_id?: string }
): Promise<{ slots: AvailableSlot[] }> {
  const searchParams = new URLSearchParams({ date });
  if (params.party_size) searchParams.set('party_size', params.party_size.toString());
  if (params.service_id) searchParams.set('service_id', params.service_id);
  if (params.staff_id) searchParams.set('staff_id', params.staff_id);
  
  return apiRequest(`/${businessId}/availability?${searchParams}`);
}

export async function createBooking(
  businessId: string,
  data: {
    date: string;
    start_time: string;
    customer_name: string;
    customer_phone: string;
    party_size?: number;
    service_id?: string;
    staff_id?: string;
    notes?: string;
  }
): Promise<{ booking: Booking }> {
  return apiRequest(`/${businessId}/bookings`, {
    method: 'POST',
    body: data,
  });
}

export async function getBookingsByPhone(
  businessId: string,
  phone: string
): Promise<{ bookings: Booking[] }> {
  return apiRequest(`/${businessId}/bookings?phone=${encodeURIComponent(phone)}`);
}

export async function getBooking(
  businessId: string,
  bookingId: string
): Promise<{ booking: Booking }> {
  return apiRequest(`/${businessId}/bookings/${bookingId}`);
}

export async function modifyBooking(
  businessId: string,
  bookingId: string,
  data: {
    date?: string;
    start_time?: string;
    party_size?: number;
    service_id?: string;
    notes?: string;
  }
): Promise<{ booking: Booking }> {
  return apiRequest(`/${businessId}/bookings/${bookingId}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function cancelBooking(
  businessId: string,
  bookingId: string
): Promise<{ booking: Booking }> {
  return apiRequest(`/${businessId}/bookings/${bookingId}/cancel`, {
    method: 'POST',
  });
}

// Manager API
export async function getManagerBookings(
  businessId: string,
  date?: string,
  status?: string
): Promise<{ bookings: Booking[] }> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (status) params.set('status', status);
  
  return apiRequest(`/manager/${businessId}/bookings?${params}`);
}

export async function getManagerTables(
  businessId: string
): Promise<{ tables: Table[] }> {
  return apiRequest(`/manager/${businessId}/tables`);
}

export async function getManagerStaff(
  businessId: string
): Promise<{ staff: Staff[] }> {
  return apiRequest(`/manager/${businessId}/staff`);
}

export async function markNoShow(
  businessId: string,
  bookingId: string
): Promise<{ booking: Booking }> {
  return apiRequest(`/${businessId}/bookings/${bookingId}/no-show`, {
    method: 'POST',
  });
}

export async function createSlotBlock(
  businessId: string,
  data: {
    date: string;
    start_time: string;
    end_time: string;
    resource_type?: string;
    resource_id?: string;
    reason?: string;
  }
): Promise<any> {
  return apiRequest(`/manager/${businessId}/blocks`, {
    method: 'POST',
    body: data,
  });
}

export async function getSlotBlocks(
  businessId: string,
  date?: string
): Promise<{ blocks: any[] }> {
  const params = date ? `?date=${date}` : '';
  return apiRequest(`/manager/${businessId}/blocks${params}`);
}

export async function deleteSlotBlock(
  businessId: string,
  blockId: string
): Promise<void> {
  return apiRequest(`/manager/${businessId}/blocks/${blockId}`, {
    method: 'DELETE',
  });
}

