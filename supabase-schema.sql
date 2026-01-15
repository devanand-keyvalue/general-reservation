-- ===========================================
-- Generic Booking System - Database Schema
-- Run this in Supabase SQL Editor
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- BUSINESSES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('restaurant', 'spa')),
    timezone VARCHAR(100) DEFAULT 'America/New_York',
    slot_interval INTEGER DEFAULT 30,
    max_booking_horizon_days INTEGER DEFAULT 30,
    allow_same_day BOOLEAN DEFAULT true,
    same_day_cutoff_minutes INTEGER DEFAULT 60,
    notes_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'slot_interval') THEN
        ALTER TABLE businesses ADD COLUMN slot_interval INTEGER DEFAULT 30;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'max_booking_horizon_days') THEN
        ALTER TABLE businesses ADD COLUMN max_booking_horizon_days INTEGER DEFAULT 30;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'allow_same_day') THEN
        ALTER TABLE businesses ADD COLUMN allow_same_day BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'same_day_cutoff_minutes') THEN
        ALTER TABLE businesses ADD COLUMN same_day_cutoff_minutes INTEGER DEFAULT 60;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'notes_enabled') THEN
        ALTER TABLE businesses ADD COLUMN notes_enabled BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'sms_enabled') THEN
        ALTER TABLE businesses ADD COLUMN sms_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ===========================================
-- BUSINESS HOURS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    UNIQUE(business_id, day_of_week)
);

-- ===========================================
-- RESTAURANT CONFIG TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS restaurant_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
    seating_duration_minutes INTEGER DEFAULT 90,
    default_seating_duration_minutes INTEGER DEFAULT 90,
    buffer_minutes INTEGER DEFAULT 15,
    max_party_size INTEGER DEFAULT 12
);

-- Add missing columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_configs' AND column_name = 'default_seating_duration_minutes') THEN
        ALTER TABLE restaurant_configs ADD COLUMN default_seating_duration_minutes INTEGER DEFAULT 90;
    END IF;
END $$;

-- ===========================================
-- TABLES TABLE (for restaurants)
-- ===========================================
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL,
    zone VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- SERVICES TABLE (for spas)
-- ===========================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- STAFF TABLE (for spas)
-- ===========================================
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- STAFF SERVICES (many-to-many)
-- ===========================================
CREATE TABLE IF NOT EXISTS staff_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(staff_id, service_id)
);

-- ===========================================
-- STAFF SCHEDULES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS staff_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    UNIQUE(staff_id, day_of_week)
);

-- ===========================================
-- BOOKINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    reference VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    party_size INTEGER,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to bookings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'duration_minutes') THEN
        ALTER TABLE bookings ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 60;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'party_size') THEN
        ALTER TABLE bookings ADD COLUMN party_size INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'service_id') THEN
        ALTER TABLE bookings ADD COLUMN service_id UUID REFERENCES services(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'notes') THEN
        ALTER TABLE bookings ADD COLUMN notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reference') THEN
        ALTER TABLE bookings ADD COLUMN reference VARCHAR(20);
    END IF;
END $$;

-- ===========================================
-- BOOKING ASSIGNMENTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS booking_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('table', 'staff')),
    resource_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- SLOT BLOCKS TABLE (for blocking time)
-- ===========================================
CREATE TABLE IF NOT EXISTS slot_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_bookings_business_date ON bookings(business_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking ON booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_slot_blocks_business_date ON slot_blocks(business_id, date);
CREATE INDEX IF NOT EXISTS idx_business_hours_business ON business_hours(business_id);
CREATE INDEX IF NOT EXISTS idx_tables_business ON tables(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_business ON staff(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);

-- ===========================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ===========================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_blocks ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- CREATE POLICIES FOR PUBLIC ACCESS
-- (For demo purposes - in production you'd want auth)
-- ===========================================
CREATE POLICY IF NOT EXISTS "Allow all for businesses" ON businesses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for business_hours" ON business_hours FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for restaurant_configs" ON restaurant_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for tables" ON tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for services" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for staff_services" ON staff_services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for staff_schedules" ON staff_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for booking_assignments" ON booking_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for slot_blocks" ON slot_blocks FOR ALL USING (true) WITH CHECK (true);

-- ===========================================
-- SAMPLE DATA - Restaurant
-- ===========================================
INSERT INTO businesses (id, name, type, timezone, slot_interval, max_booking_horizon_days, allow_same_day, notes_enabled, sms_enabled)
VALUES ('11111111-1111-1111-1111-111111111111', 'La Bella Tavola', 'restaurant', 'America/New_York', 30, 30, true, true, true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    slot_interval = EXCLUDED.slot_interval;

INSERT INTO restaurant_configs (business_id, seating_duration_minutes, default_seating_duration_minutes, buffer_minutes, max_party_size)
VALUES ('11111111-1111-1111-1111-111111111111', 90, 90, 15, 12)
ON CONFLICT (business_id) DO UPDATE SET
    default_seating_duration_minutes = EXCLUDED.default_seating_duration_minutes;

-- Restaurant hours (Mon-Sun)
INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed) VALUES
('11111111-1111-1111-1111-111111111111', 0, '11:00', '22:00', false),
('11111111-1111-1111-1111-111111111111', 1, '11:00', '22:00', false),
('11111111-1111-1111-1111-111111111111', 2, '11:00', '22:00', false),
('11111111-1111-1111-1111-111111111111', 3, '11:00', '22:00', false),
('11111111-1111-1111-1111-111111111111', 4, '11:00', '23:00', false),
('11111111-1111-1111-1111-111111111111', 5, '11:00', '23:00', false),
('11111111-1111-1111-1111-111111111111', 6, '10:00', '22:00', false)
ON CONFLICT (business_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time;

-- Restaurant tables
INSERT INTO tables (business_id, name, capacity, zone, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Table 1', 2, 'Main', true),
('11111111-1111-1111-1111-111111111111', 'Table 2', 2, 'Main', true),
('11111111-1111-1111-1111-111111111111', 'Table 3', 4, 'Main', true),
('11111111-1111-1111-1111-111111111111', 'Table 4', 4, 'Main', true),
('11111111-1111-1111-1111-111111111111', 'Table 5', 6, 'Patio', true),
('11111111-1111-1111-1111-111111111111', 'Table 6', 6, 'Patio', true),
('11111111-1111-1111-1111-111111111111', 'Table 7', 8, 'Private', true),
('11111111-1111-1111-1111-111111111111', 'Table 8', 10, 'Private', true)
ON CONFLICT DO NOTHING;

-- ===========================================
-- SAMPLE DATA - Spa
-- ===========================================
INSERT INTO businesses (id, name, type, timezone, slot_interval, max_booking_horizon_days, allow_same_day, notes_enabled, sms_enabled)
VALUES ('22222222-2222-2222-2222-222222222222', 'Serenity Spa', 'spa', 'America/New_York', 30, 30, true, true, true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    slot_interval = EXCLUDED.slot_interval;

-- Spa hours
INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed) VALUES
('22222222-2222-2222-2222-222222222222', 0, '09:00', '18:00', false),
('22222222-2222-2222-2222-222222222222', 1, '09:00', '20:00', false),
('22222222-2222-2222-2222-222222222222', 2, '09:00', '20:00', false),
('22222222-2222-2222-2222-222222222222', 3, '09:00', '20:00', false),
('22222222-2222-2222-2222-222222222222', 4, '09:00', '20:00', false),
('22222222-2222-2222-2222-222222222222', 5, '09:00', '21:00', false),
('22222222-2222-2222-2222-222222222222', 6, '10:00', '18:00', false)
ON CONFLICT (business_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time;

-- Spa services
INSERT INTO services (id, business_id, name, description, duration_minutes, price, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Swedish Massage', 'Classic relaxation massage', 60, 120.00, true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Deep Tissue Massage', 'Therapeutic deep muscle work', 90, 150.00, true),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Hot Stone Therapy', 'Heated stones for deep relaxation', 75, 140.00, true),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Facial Treatment', 'Rejuvenating facial', 60, 100.00, true),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'Aromatherapy', 'Essential oil massage', 60, 130.00, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    duration_minutes = EXCLUDED.duration_minutes;

-- Spa staff
INSERT INTO staff (id, business_id, name, email, phone, is_active) VALUES
('11111111-aaaa-aaaa-aaaa-111111111111', '22222222-2222-2222-2222-222222222222', 'Emma Wilson', 'emma@serenityspa.com', '555-0101', true),
('22222222-bbbb-bbbb-bbbb-222222222222', '22222222-2222-2222-2222-222222222222', 'Michael Chen', 'michael@serenityspa.com', '555-0102', true),
('33333333-cccc-cccc-cccc-333333333333', '22222222-2222-2222-2222-222222222222', 'Sofia Rodriguez', 'sofia@serenityspa.com', '555-0103', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;

-- Staff schedules (all staff work Mon-Sat)
INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time, is_available) VALUES
-- Emma
('11111111-aaaa-aaaa-aaaa-111111111111', 1, '09:00', '17:00', true),
('11111111-aaaa-aaaa-aaaa-111111111111', 2, '09:00', '17:00', true),
('11111111-aaaa-aaaa-aaaa-111111111111', 3, '09:00', '17:00', true),
('11111111-aaaa-aaaa-aaaa-111111111111', 4, '09:00', '17:00', true),
('11111111-aaaa-aaaa-aaaa-111111111111', 5, '09:00', '17:00', true),
-- Michael
('22222222-bbbb-bbbb-bbbb-222222222222', 1, '12:00', '20:00', true),
('22222222-bbbb-bbbb-bbbb-222222222222', 2, '12:00', '20:00', true),
('22222222-bbbb-bbbb-bbbb-222222222222', 3, '12:00', '20:00', true),
('22222222-bbbb-bbbb-bbbb-222222222222', 4, '12:00', '20:00', true),
('22222222-bbbb-bbbb-bbbb-222222222222', 5, '12:00', '21:00', true),
('22222222-bbbb-bbbb-bbbb-222222222222', 6, '10:00', '18:00', true),
-- Sofia
('33333333-cccc-cccc-cccc-333333333333', 0, '09:00', '18:00', true),
('33333333-cccc-cccc-cccc-333333333333', 2, '09:00', '17:00', true),
('33333333-cccc-cccc-cccc-333333333333', 3, '09:00', '17:00', true),
('33333333-cccc-cccc-cccc-333333333333', 4, '09:00', '17:00', true),
('33333333-cccc-cccc-cccc-333333333333', 5, '09:00', '21:00', true),
('33333333-cccc-cccc-cccc-333333333333', 6, '10:00', '18:00', true)
ON CONFLICT (staff_id, day_of_week) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time;

-- Staff services (which services each staff can perform)
INSERT INTO staff_services (staff_id, service_id) VALUES
('11111111-aaaa-aaaa-aaaa-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('11111111-aaaa-aaaa-aaaa-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
('11111111-aaaa-aaaa-aaaa-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
('22222222-bbbb-bbbb-bbbb-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('22222222-bbbb-bbbb-bbbb-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('22222222-bbbb-bbbb-bbbb-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
('33333333-cccc-cccc-cccc-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('33333333-cccc-cccc-cccc-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('33333333-cccc-cccc-cccc-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
('33333333-cccc-cccc-cccc-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
('33333333-cccc-cccc-cccc-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
ON CONFLICT (staff_id, service_id) DO NOTHING;

-- ===========================================
-- DONE! 
-- ===========================================
SELECT 'Schema and sample data created successfully!' as result;

