const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const supabase = require('../lib/supabaseClient');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');

// ─── POST /api/users/sync ─────────────────────────────────────────────────────
// Upsert a Clerk user into the local users table (called after sign-in/sign-up)
router.post(
  '/sync',
  requireAuth,
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('role')
      .isIn(['rider', 'driver'])
      .withMessage('role must be "rider" or "driver"'),
    body('name').optional().trim().isLength({ max: 100 }),
    body('phone').optional().trim().isMobilePhone().withMessage('phone must be a valid phone number'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, name, role, phone } = req.body;
      const clerkId = req.userId;

      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id, role')
        .eq('clerk_id', clerkId)
        .single();

      let data, error;

      if (existing) {
        // User exists — only update name/email/phone, preserve their role
        ({ data, error } = await supabase
          .from('users')
          .update({ email, name: name || '', phone: phone || '' })
          .eq('clerk_id', clerkId)
          .select()
          .single());
      } else {
        // New user — insert with chosen role
        ({ data, error } = await supabase
          .from('users')
          .insert({ clerk_id: clerkId, email, name: name || '', role, phone: phone || '', credits: 0 })
          .select()
          .single());
      }

      if (error) {
        console.error('User sync error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      return res.status(200).json({ user: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/users/me ────────────────────────────────────────────────────────
// Get the authenticated user's profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const clerkId = req.userId;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/users/add-credits ───────────────────────────────────────────
// Add credits to the authenticated user's wallet
router.patch(
  '/add-credits',
  requireAuth,
  [
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  ],
  validate,
  async (req, res) => {
    try {
      const clerkId = req.userId;
      const { amount } = req.body;

      // First get current credits
      const { data: user, error: getError } = await supabase
        .from('users')
        .select('credits')
        .eq('clerk_id', clerkId)
        .single();

      if (getError) return res.status(404).json({ error: 'User not found' });

      const newBalance = (parseFloat(user.credits || 0) + parseFloat(amount)).toFixed(2);

      const { data, error } = await supabase
        .from('users')
        .update({ credits: newBalance })
        .eq('clerk_id', clerkId)
        .select()
        .single();

      if (error) return res.status(500).json({ error: 'Failed to update credits' });

      return res.status(200).json({ user: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
