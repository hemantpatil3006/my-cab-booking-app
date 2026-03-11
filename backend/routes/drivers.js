const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const supabase = require('../lib/supabaseClient');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { getIO } = require('../lib/socket');

// ─── Helper ──────────────────────────────────────────────────────────────────
async function getDbUser(clerkId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();
  if (error || !data) return null;
  return data;
}

// ─── POST /api/drivers/profile ────────────────────────────────────────────────
// Create or update a driver profile (upsert)
router.post(
  '/profile',
  requireAuth,
  [
    body('vehicle_type')
      .isIn(['bike', 'auto', 'sedan', 'suv'])
      .withMessage('vehicle_type must be one of: bike, auto, sedan, suv'),
    body('license_number')
      .trim()
      .notEmpty()
      .withMessage('license_number is required')
      .isLength({ max: 50 })
      .withMessage('license_number must be at most 50 characters'),
    body('current_lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('current_lat must be a valid latitude'),
    body('current_lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('current_lng must be a valid longitude'),
  ],
  validate,
  async (req, res) => {
    try {
      const dbUser = await getDbUser(req.userId);
      if (!dbUser) return res.status(404).json({ error: 'User not found. Please sync first.' });

      // If user is not already a driver, upgrade them
      if (dbUser.role !== 'driver') {
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'driver' })
          .eq('id', dbUser.id);

        if (updateError) {
          console.error('Failed to upgrade user to driver:', updateError);
          return res.status(500).json({ error: 'Failed to update user role.' });
        }
      }

      const { vehicle_type, license_number, current_lat, current_lng } = req.body;

      const payload = {
        user_id: dbUser.id,
        vehicle_type,
        license_number: license_number.trim().toUpperCase(),
        updated_at: new Date().toISOString(),
      };
      if (current_lat !== undefined) payload.current_lat = current_lat;
      if (current_lng !== undefined) payload.current_lng = current_lng;

      // Check if driver profile already exists
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', dbUser.id)
        .maybeSingle();

      let query;
      if (existingDriver) {
        query = supabase
          .from('drivers')
          .update(payload)
          .eq('user_id', dbUser.id);
      } else {
        query = supabase
          .from('drivers')
          .insert(payload);
      }

      const { data, error } = await query.select().single();

      if (error) {
        console.error('Driver profile save error:', error);
        // Unique constraint on license_number (23505)
        if (error.code === '23505') {
          return res.status(409).json({ error: 'License number already registered.' });
        }
        return res.status(500).json({ error: 'Failed to save driver profile.' });
      }

      return res.status(200).json({ driver: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── PATCH /api/drivers/availability ─────────────────────────────────────────
// Toggle or explicitly set a driver's availability status
router.patch(
  '/availability',
  requireAuth,
  [
    body('available')
      .isBoolean()
      .withMessage('available must be true or false'),
    body('current_lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('current_lat must be a valid latitude'),
    body('current_lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('current_lng must be a valid longitude'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await getDbUser(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if (user.role !== 'driver')
        return res.status(403).json({ error: 'Only drivers can update availability.' });

      const { available, current_lat, current_lng } = req.body;

      const updatePayload = {
        availability: available,
        updated_at: new Date().toISOString(),
      };
      if (current_lat !== undefined) updatePayload.current_lat = current_lat;
      if (current_lng !== undefined) updatePayload.current_lng = current_lng;

      const { data, error } = await supabase
        .from('drivers')
        .update(updatePayload)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: 'Driver profile not found. Create a profile first via POST /api/drivers/profile.',
        });
      }

      // Notify all riders (or specific ones if needed) about driver's change
      const io = getIO();
      io.emit('driver-update', { driver: data });

      return res.status(200).json({ driver: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── GET /api/drivers/me ──────────────────────────────────────────────────────
// Get the authenticated driver's own profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getDbUser(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }

    return res.status(200).json({ driver: data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
