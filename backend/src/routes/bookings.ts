import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createBooking,
  getBookingById,
  getBookingsByPhone,
  modifyBooking,
  cancelBooking,
  markNoShow,
  reassignBooking
} from '../services/bookingService.js';

const router = Router();

// Relaxed UUID regex to match PostgreSQL UUID format (allows test UUIDs)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  party_size: z.number().int().positive().optional(),
  service_id: z.string().regex(uuidRegex).optional(),
  staff_id: z.string().regex(uuidRegex).optional(),
  notes: z.string().optional()
});

const modifyBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  party_size: z.number().int().positive().optional(),
  service_id: z.string().regex(uuidRegex).optional(),
  notes: z.string().optional()
});

// POST /api/v1/:businessId/bookings - Create booking
router.post('/:businessId/bookings', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const data = createBookingSchema.parse(req.body);
    
    const booking = await createBooking(businessId, data);
    
    res.status(201).json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/:businessId/bookings - List bookings by phone
router.get('/:businessId/bookings', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { phone } = req.query;
    
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'phone query parameter is required' });
    }
    
    const bookings = await getBookingsByPhone(businessId, phone);
    
    res.json({ bookings });
  } catch (error) {
    console.error('List bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/:businessId/bookings/:bookingId - Get booking details
router.get('/:businessId/bookings/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await getBookingById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/:businessId/bookings/:bookingId - Modify booking
router.patch('/:businessId/bookings/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const data = modifyBookingSchema.parse(req.body);
    
    const booking = await modifyBooking(bookingId, data);
    
    res.json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Modify booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/:businessId/bookings/:bookingId/cancel - Cancel booking
router.post('/:businessId/bookings/:bookingId/cancel', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await cancelBooking(bookingId);
    
    res.json({ booking });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/:businessId/bookings/:bookingId/no-show - Mark as no-show (manager only)
router.post('/:businessId/bookings/:bookingId/no-show', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await markNoShow(bookingId);
    
    res.json({ booking });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    console.error('No-show error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/:businessId/bookings/:bookingId/reassign - Reassign resources (manager only)
router.post('/:businessId/bookings/:bookingId/reassign', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { resource_id, resource_type } = req.body;
    
    if (!resource_id || !resource_type) {
      return res.status(400).json({ error: 'resource_id and resource_type are required' });
    }
    
    await reassignBooking(bookingId, resource_id, resource_type);
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Reassign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

