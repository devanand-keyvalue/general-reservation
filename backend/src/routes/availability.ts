import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getRestaurantAvailability, getSpaAvailability } from '../services/availabilityService.js';
import supabase from '../utils/supabase.js';

const router = Router();

// Relaxed UUID regex to match PostgreSQL UUID format (allows test UUIDs)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  party_size: z.string().optional(),
  service_id: z.string().regex(uuidRegex).optional(),
  staff_id: z.string().regex(uuidRegex).optional(),
  time_start: z.string().optional(),
  time_end: z.string().optional()
});

// GET /api/v1/:businessId/availability
router.get('/:businessId/availability', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const query = availabilityQuerySchema.parse(req.query);
    
    // Get business type
    const { data: business, error } = await supabase
      .from('businesses')
      .select('type')
      .eq('id', businessId)
      .single();
    
    if (error || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const timeRange = query.time_start && query.time_end 
      ? { start: query.time_start, end: query.time_end }
      : undefined;
    
    let slots;
    
    if (business.type === 'restaurant') {
      if (!query.party_size) {
        return res.status(400).json({ error: 'party_size is required for restaurant mode' });
      }
      
      slots = await getRestaurantAvailability(
        businessId,
        query.date,
        parseInt(query.party_size, 10),
        timeRange
      );
    } else {
      if (!query.service_id) {
        return res.status(400).json({ error: 'service_id is required for spa mode' });
      }
      
      slots = await getSpaAvailability(
        businessId,
        query.date,
        query.service_id,
        query.staff_id,
        timeRange
      );
    }
    
    res.json({ slots });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    console.error('Availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

