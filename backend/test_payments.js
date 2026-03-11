const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPayments() {
  console.log('--- TEST 1: Simple join ---');
  const { data: d1, error: e1 } = await supabase
    .from('payments')
    .select('*, rides(*)');
  if (e1) console.error('E1:', e1.message);
  else console.log('S1: Found', d1.length, 'records');

  console.log('--- TEST 2: Filter by rides.rider_id ---');
  // We need to find a valid rider_id first
  const { data: rides } = await supabase.from('rides').select('rider_id').limit(1);
  if (rides && rides.length > 0) {
    const riderId = rides[0].rider_id;
    console.log('Testing with rider_id:', riderId);
    
    const { data: d2, error: e2 } = await supabase
      .from('payments')
      .select('*, ride:rides!ride_id(*)')
      .eq('ride.rider_id', riderId);
      
    if (e2) console.error('E2:', e2.message);
    else console.log('S2: Found', d2.length, 'records');
  } else {
    console.log('No rides found to test with.');
  }
}

testPayments();
