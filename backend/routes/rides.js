const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();
const supabase = require('../lib/supabaseClient');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { getIO } = require('../lib/socket');

// ─── Helper: resolve userId from clerk_id ────────────────────────────────────
async function getDbUserId(clerkId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();
  if (error || !data) return null;
  return data;
}

// ─── GET /api/rides/pending ──────────────────────────────────────────────────
// Get all active pending rides (drivers only)
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const user = await getDbUserId(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role !== 'driver') return res.status(403).json({ error: 'Only drivers can view pending rides.' });

    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        rider:users!rider_id (id, name, phone)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Pending rides error:', error);
      return res.status(500).json({ error: 'Failed to fetch pending rides.' });
    }

    return res.status(200).json({ rides: data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST /api/rides/request ─────────────────────────────────────────────────
// Create a new ride request (riders only)
router.post(
  '/request',
  requireAuth,
  [
    body('pickup_lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('pickup_lat must be a valid latitude'),
    body('pickup_lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('pickup_lng must be a valid longitude'),
    body('drop_lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('drop_lat must be a valid latitude'),
    body('drop_lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('drop_lng must be a valid longitude'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await getDbUserId(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found. Please sync first.' });
      // Removed role check to allow drivers to also request rides as passengers

      const { pickup_lat, pickup_lng, drop_lat, drop_lng, pickup_address, drop_address, fare } = req.body;

      const { data, error } = await supabase
        .from('rides')
        .insert({
          rider_id: user.id,
          pickup_lat,
          pickup_lng,
          drop_lat,
          drop_lng,
          pickup_address: pickup_address || '',
          drop_address: drop_address || '',
          fare: fare || 0,
          status: 'pending',
        })
        .select(`
          *,
          rider:users!rider_id (id, name, phone)
        `)
        .single();

      if (error) {
        console.error('Create ride database error:', error);
        return res.status(500).json({ error: 'Failed to create ride request.', details: error.message });
      }

      // Notify all available drivers about the new ride request
      const io = getIO();
      io.to('driver').emit('ride-request', { 
        ride: data,
        rider: { id: user.id }
      });

      return res.status(201).json({ ride: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── GET /api/rides/nearby-drivers ───────────────────────────────────────────
// Get available drivers near a given lat/lng (Euclidean distance approximation)
router.get(
  '/nearby-drivers',
  requireAuth,
  [
    query('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('lat must be a valid latitude'),
    query('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('lng must be a valid longitude'),
    query('radius')
      .optional()
      .isFloat({ min: 0.001, max: 5 })
      .withMessage('radius must be between 0.001 and 5 degrees'),
  ],
  validate,
  async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const radius = parseFloat(req.query.radius || '0.1'); // ~11 km at equator

      // Fetch available drivers that have a current location set
      const { data: drivers, error } = await supabase
        .from('drivers')
        .select(`
          id,
          vehicle_type,
          current_lat,
          current_lng,
          users (id, name, phone)
        `)
        .eq('availability', true)
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null);

      if (error) {
        console.error('Nearby drivers error:', error);
        return res.status(500).json({ error: 'Failed to fetch drivers.' });
      }

      // Filter by approximate radius and attach distance
      const nearby = drivers
        .map((d) => {
          const dlat = d.current_lat - lat;
          const dlng = d.current_lng - lng;
          const distance = Math.sqrt(dlat * dlat + dlng * dlng); // in degrees
          return { ...d, distance_deg: parseFloat(distance.toFixed(5)) };
        })
        .filter((d) => d.distance_deg <= radius)
        .sort((a, b) => a.distance_deg - b.distance_deg);

      return res.status(200).json({ drivers: nearby, count: nearby.length });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── PATCH /api/rides/:id/respond ────────────────────────────────────────────
// Driver accepts or rejects a pending ride
router.patch(
  '/:id/respond',
  requireAuth,
  [
    param('id').isUUID().withMessage('Ride id must be a valid UUID'),
    body('action')
      .isIn(['accept', 'reject'])
      .withMessage('action must be "accept" or "reject"'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await getDbUserId(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if (user.role !== 'driver')
        return res.status(403).json({ error: 'Only drivers can respond to rides.' });

      const { id: rideId } = req.params;
      const { action } = req.body;

      // Verify ride exists and is still pending
      const { data: ride, error: fetchError } = await supabase
        .from('rides')
        .select('id, status, driver_id')
        .eq('id', rideId)
        .single();

      if (fetchError || !ride)
        return res.status(404).json({ error: 'Ride not found.' });
      if (ride.status !== 'pending')
        return res.status(409).json({ error: `Ride is already ${ride.status}.` });
      if (ride.driver_id && ride.driver_id !== user.id)
        return res.status(409).json({ error: 'Ride already assigned to another driver.' });
      
      if (action === 'accept' && ride.rider_id === user.id)
        return res.status(400).json({ error: 'You cannot accept your own ride request.' });

      const newStatus = action === 'accept' ? 'accepted' : 'cancelled';
      const updatePayload =
        action === 'accept'
          ? { status: newStatus, driver_id: user.id, updated_at: new Date().toISOString() }
          : { status: newStatus, updated_at: new Date().toISOString() };

      const { data, error } = await supabase
        .from('rides')
        .update(updatePayload)
        .eq('id', rideId)
        .select()
        .single();

      if (error) {
        console.error('Respond ride error:', error);
        return res.status(500).json({ error: 'Failed to update ride.' });
      }

      const io = getIO();
      // Notify the rider that their ride has been accepted or rejected
      io.to(data.rider_id).emit('ride-response', { 
        ride: data, 
        action 
      });

      return res.status(200).json({ ride: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── PATCH /api/rides/:id/status ─────────────────────────────────────────────
// Update ride status (e.g. accepted → ongoing → completed)
const STATUS_TRANSITIONS = {
  accepted: ['ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'],
};

router.patch(
  '/:id/status',
  requireAuth,
  [
    param('id').isUUID().withMessage('Ride id must be a valid UUID'),
    body('status')
      .isIn(['ongoing', 'completed', 'cancelled'])
      .withMessage('status must be ongoing, completed, or cancelled'),
    body('fare')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('fare must be a positive number'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await getDbUserId(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const { id: rideId } = req.params;
      const { status: newStatus, fare } = req.body;

      const { data: ride, error: fetchError } = await supabase
        .from('rides')
        .select('id, status, driver_id, rider_id')
        .eq('id', rideId)
        .single();

      if (fetchError || !ride) return res.status(404).json({ error: 'Ride not found.' });

      // Only the assigned driver or the rider can update status
      const isDriver = user.role === 'driver' && ride.driver_id === user.id;
      const isRider = user.role === 'rider' && ride.rider_id === user.id;
      if (!isDriver && !isRider)
        return res.status(403).json({ error: 'Not authorised to update this ride.' });

      const allowedNext = STATUS_TRANSITIONS[ride.status] || [];
      if (!allowedNext.includes(newStatus)) {
        return res.status(409).json({
          error: `Cannot transition from "${ride.status}" to "${newStatus}".`,
          allowed: allowedNext,
        });
      }

      const updatePayload = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'completed' && fare !== undefined) {
        updatePayload.fare = fare;
      }

      const { data, error } = await supabase
        .from('rides')
        .update(updatePayload)
        .eq('id', rideId)
        .select()
        .single();

      if (error) {
        console.error('Update status error:', error);
        return res.status(500).json({ error: 'Failed to update ride status.' });
      }

      const io = getIO();
      // Notify both parties about the status update
      io.to(data.rider_id).emit('status-update', { ride: data });
      if (data.driver_id) {
        io.to(data.driver_id).emit('status-update', { ride: data });
      }

      return res.status(200).json({ ride: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── GET /api/rides/history/rider ────────────────────────────────────────────
// Get ride history for the current rider
router.get(
  '/history/rider',
  requireAuth,
  async (req, res) => {
    try {
      const user = await getDbUserId(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          driver:users!driver_id (id, name, phone),
          ratings (*)
        `)
        .eq('rider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Rider history error:', error);
        return res.status(500).json({ error: 'Failed to fetch ride history.' });
      }

      return res.status(200).json({ rides: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── GET /api/rides/history/driver ────────────────────────────────────────────
// Get ride history and total earnings for the current driver
router.get(
  '/history/driver',
  requireAuth,
  async (req, res) => {
    try {
      const user = await getDbUserId(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if (user.role !== 'driver') return res.status(403).json({ error: 'Only drivers can view earnings.' });

      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          rider:users!rider_id (id, name, phone),
          ratings (*)
        `)
        .eq('driver_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Driver history error:', error);
        return res.status(500).json({ error: 'Failed to fetch ride history.' });
      }

      const totalEarnings = data.reduce((sum, ride) => sum + (parseFloat(ride.fare) || 0), 0);

      return res.status(200).json({ rides: data, totalEarnings });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── POST /api/rides/:id/rate ────────────────────────────────────────────────
// Rate a completed ride
router.post(
  '/:id/rate',
  requireAuth,
  [
    param('id').isUUID().withMessage('Ride id must be a valid UUID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5'),
    body('comment').optional().isString().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await getDbUserId(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const { id: rideId } = req.params;
      const { rating, comment } = req.body;

      // Verify ride existence and status
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select('id, status, rider_id, driver_id')
        .eq('id', rideId)
        .single();

      if (rideError || !ride) return res.status(404).json({ error: 'Ride not found.' });
      if (ride.rider_id !== user.id) return res.status(403).json({ error: 'Only riders can rate rides.' });
      if (ride.status !== 'completed') return res.status(400).json({ error: 'Ride not completed.' });

      // Insert rating
      const { data, error } = await supabase
        .from('ratings')
        .insert({
          ride_id: rideId,
          rider_id: user.id,
          driver_id: ride.driver_id,
          rating,
          comment
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Already rated.' });
        console.error('Rating error:', error);
        return res.status(500).json({ error: 'Failed to submit rating.' });
      }

      return res.status(201).json({ rating: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── GET /api/rides/:id ───────────────────────────────────────────────────────
// Get a specific ride's details
router.get(
  '/:id',
  requireAuth,
  [param('id').isUUID().withMessage('Ride id must be a valid UUID')],
  validate,
  async (req, res) => {
    try {
      const user = await getDbUserId(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const { data: ride, error } = await supabase
        .from('rides')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (error || !ride) return res.status(404).json({ error: 'Ride not found.' });

      // Only the rider or the assigned driver can view the ride
      if (ride.rider_id !== user.id && ride.driver_id !== user.id) {
        return res.status(403).json({ error: 'Not authorised to view this ride.' });
      }

      return res.status(200).json({ ride });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

module.exports = router;
