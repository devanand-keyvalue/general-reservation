# Generic Booking System

A modern, embeddable booking system for restaurants and spas with a React frontend, Express backend, and Supabase database.

## Features

- **Embeddable Booking Widget**: Beautiful, step-by-step booking flow for customers
- **Restaurant Mode**: Party size selection, table management, timeline view
- **Spa Mode**: Service selection, staff scheduling, appointment management
- **Manager Dashboard**: Timeline and list views for managing bookings
- **Self-Service**: Customers can view, modify, and cancel their bookings
- **API Ready**: Full REST API for voice agents (Vapi) integration
- **SMS Notifications**: Confirmation, modification, and cancellation notifications

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand, TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account and project

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Supabase credentials:
   ```
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_key
   FRONTEND_URL=http://localhost:5173
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## Database Schema

The system uses the following main tables:

- `businesses` - Business configuration (restaurant or spa)
- `business_hours` - Operating hours per day of week
- `tables` - Restaurant tables with capacity and zones
- `services` - Spa services with duration
- `staff` - Spa staff members
- `staff_schedules` - Weekly staff availability
- `bookings` - Customer bookings
- `booking_assignments` - Resource assignments for bookings
- `slot_holds` - Temporary holds during booking flow
- `slot_blocks` - Manager-blocked time slots

## API Endpoints

### Public API (for booking widget and Vapi)

- `GET /api/v1/:businessId/availability` - Get available time slots
- `GET /api/v1/:businessId/catalog` - Get business info, services, hours
- `POST /api/v1/:businessId/bookings` - Create a booking
- `GET /api/v1/:businessId/bookings?phone=...` - List bookings by phone
- `GET /api/v1/:businessId/bookings/:bookingId` - Get booking details
- `PATCH /api/v1/:businessId/bookings/:bookingId` - Modify booking
- `POST /api/v1/:businessId/bookings/:bookingId/cancel` - Cancel booking

### Manager API

- `GET /api/v1/manager/:businessId` - Get business config
- `GET /api/v1/manager/:businessId/bookings` - List all bookings
- `GET /api/v1/manager/:businessId/tables` - List tables
- `GET /api/v1/manager/:businessId/staff` - List staff
- `POST /api/v1/manager/:businessId/blocks` - Create slot block
- `DELETE /api/v1/manager/:businessId/blocks/:blockId` - Delete block

## Demo

The system comes with two pre-configured demo businesses:

1. **La Bella Tavola** (Restaurant)
   - ID: `11111111-1111-1111-1111-111111111111`
   - 8 tables in 3 zones (Main, Patio, Private)

2. **Serenity Spa**
   - ID: `22222222-2222-2222-2222-222222222222`
   - 6 services, 3 staff members, 3 rooms

## License

MIT

