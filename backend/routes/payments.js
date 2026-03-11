const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../lib/supabaseClient');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { getIO } = require('../lib/socket');

// ─── POST /api/payments/create-intent ────────────────────────────────────────
// Create a Stripe PaymentIntent for a ride
router.post(
  '/create-intent',
  requireAuth,
  [
    body('ride_id').isUUID().withMessage('ride_id must be a valid UUID'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await getDbUser(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const { ride_id } = req.body;

      // Get ride details
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select('id, fare, rider_id, status')
        .eq('id', ride_id)
        .single();

      if (rideError || !ride) return res.status(404).json({ error: 'Ride not found.' });
      if (ride.rider_id !== user.id) return res.status(403).json({ error: 'Not authorized.' });
      if (ride.status !== 'completed') return res.status(400).json({ error: 'Ride not completed.' });

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe is not configured on the server.' });
      }

      // Create PaymentIntent
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(ride.fare * 100), // Stripe expects cents
        currency: 'inr',
        metadata: { ride_id: ride.id, rider_id: user.id },
        automatic_payment_methods: { enabled: true },
      });

      res.status(200).json({ clientSecret: intent.client_secret });
    } catch (err) {
      console.error('Stripe error:', err);
      res.status(500).json({ error: 'Failed to create payment intent.' });
    }
  }
);

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

// ─── POST /api/payments ───────────────────────────────────────────────────────
// Record a payment for a completed ride
router.post(
  '/',
  requireAuth,
  [
    body('ride_id')
      .isUUID()
      .withMessage('ride_id must be a valid UUID'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('amount must be a positive number'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await getDbUser(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const { ride_id, amount } = req.body;

      // Verify the ride exists and belongs to the authenticated user (rider)
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select('id, status, rider_id')
        .eq('id', ride_id)
        .single();

      if (rideError || !ride) return res.status(404).json({ error: 'Ride not found.' });

      if (ride.rider_id !== user.id) {
        return res.status(403).json({ error: 'Not authorised to pay for this ride.' });
      }

      if (ride.status !== 'completed') {
        return res.status(409).json({
          error: `Payment can only be made for completed rides. Current status: ${ride.status}.`,
        });
      }

      // Prevent duplicate payments
      const { data: existing } = await supabase
        .from('payments')
        .select('id, status')
        .eq('ride_id', ride_id)
        .single();

      if (existing && existing.status === 'paid') {
        return res.status(409).json({ error: 'This ride has already been paid.' });
      }

      // Upsert: insert or update an existing pending payment
      let paymentData, paymentError;
      if (existing) {
        ({ data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .update({ amount, status: 'paid' })
          .eq('ride_id', ride_id)
          .select()
          .single());
      } else {
        ({ data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .insert({ ride_id, amount, status: 'paid' })
          .select()
          .single());
      }

      if (paymentError) {
        console.error('Payment error:', paymentError);
        return res.status(500).json({ error: 'Failed to record payment.' });
      }

      return res.status(201).json({ payment: paymentData });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── GET /api/payments/me ───────────────────────────────────────────────────
// Get all payments for the authenticated user
router.get(
  '/me',
  requireAuth,
  async (req, res) => {
    try {
      const user = await getDbUser(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          rides!inner (
            rider_id
          )
        `)
        .eq('rides.rider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        const fs = require('fs');
        const logMsg = `[${new Date().toISOString()}] Fetch payments error: ${JSON.stringify(error)}\n`;
        fs.appendFileSync('/tmp/backend_errors.log', logMsg);
        console.error('Fetch payments error:', error);
        return res.status(500).json({ error: 'Failed to fetch payments.' });
      }

      return res.status(200).json({ payments: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── GET /api/payments/:rideId ────────────────────────────────────────────────
// Get payment details for a specific ride
router.get(
  '/:rideId',
  requireAuth,
  [param('rideId').isUUID().withMessage('rideId must be a valid UUID')],
  validate,
  async (req, res) => {
    try {
      const user = await getDbUser(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const { rideId } = req.params;

      // Verify ride ownership before exposing payment data
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select('id, rider_id, driver_id')
        .eq('id', rideId)
        .single();

      if (rideError || !ride) return res.status(404).json({ error: 'Ride not found.' });

      if (ride.rider_id !== user.id && ride.driver_id !== user.id) {
        return res.status(403).json({ error: 'Not authorised to view this payment.' });
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('ride_id', rideId)
        .single();

      if (error || !payment) {
        return res.status(404).json({ error: 'No payment found for this ride.' });
      }
      return res.status(200).json({ payment });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// ─── POST /api/payments/pay-with-wallet ──────────────────────────────────────
// Pay for a ride using wallet credits
router.post(
  '/pay-with-wallet',
  requireAuth,
  [
    body('rideId').isUUID().withMessage('Valid Ride ID is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const clerkId = req.userId;
      const { rideId } = req.body;

      // 1. Get user and ride
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, credits')
        .eq('clerk_id', clerkId)
        .single();
      
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single();

      if (userError || !user) return res.status(404).json({ error: 'User not found' });
      if (rideError || !ride) return res.status(404).json({ error: 'Ride not found' });
      
      // Check if already paid
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, status')
        .eq('ride_id', rideId)
        .eq('status', 'paid')
        .single();
      
      if (existingPayment) return res.status(400).json({ error: 'Ride already paid' });

      // 2. Check balance
      const fare = parseFloat(ride.fare || 0);
      const credits = parseFloat(user.credits || 0);

      if (credits < fare) {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }

      // 3. Perform Transaction (Update credits and ride status)
      // Note: In real production, use a PG transaction. For here, we do it sequentially.
      const newBalance = (credits - fare).toFixed(2);
      
      const { error: updateCreditsError } = await supabase
        .from('users')
        .update({ credits: newBalance })
        .eq('id', user.id);

      if (updateCreditsError) return res.status(500).json({ error: 'Failed to deduct credits' });

      const { data: updatedRide, error: updateRideError } = await supabase
        .from('rides')
        .update({ status: 'completed' })
        .eq('id', rideId)
        .select()
        .single();

      if (updateRideError) return res.status(500).json({ error: 'Failed to update ride status' });

      // 4. Create payment record
      await supabase.from('payments').insert({
        ride_id: rideId,
        amount: fare,
        status: 'paid'
      });

      // 5. Notify parties
      const io = getIO();
      if (io) {
        io.to(ride.rider_id).emit('status-update', { ride: updatedRide });
        if (ride.driver_id) {
          io.to(ride.driver_id).emit('status-update', { ride: updatedRide });
        }
      }

      return res.status(200).json({ success: true, ride: updatedRide, newBalance });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
