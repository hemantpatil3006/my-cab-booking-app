/**
 * Supabase Keep-Alive Script
 * 
 * This script performs a lightweight query to Supabase to prevent the database
 * from being paused due to inactivity (7-day limit on free tier).
 * 
 * Usage:
 * node backend/scripts/keep-alive.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function keepAlive() {
  console.log('--- Supabase Keep-Alive Pulse ---');
  console.log(`Time: ${new Date().toISOString()}`);
  
  try {
    // Perform a simple query that doesn't consume many resources
    // We'll try to select 1 from any table, or just use a raw RPC/query if possible
    // A simple way is to query a known table or just run a system command
    // Attempt 1: Try to query a common table (rides)
    const { data: ridesData, error: ridesError } = await supabase
      .from('rides')
      .select('id')
      .limit(1);

    if (ridesError) {
      console.warn('Note: "rides" query returned an error (expected if table is missing or empty):', ridesError.message);
      
      // Attempt 2: Try a generic RPC call (this often fails if not defined)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_service_status');
      
      if (rpcError) {
        console.warn('Note: RPC ping also failed:', rpcError.message);
        
        // Attempt 3: Just check if we can reach the health endpoint via postgrest headers
        // Even a failed query to a non-existent table counts as "activity" for Supabase's pause logic
        const { error: finalError } = await supabase.from('non_existent_table').select('*').limit(1);
        console.log('Final fallback ping (to non_existent_table) completed.');
      }
    } else {
      console.log('Successfully pinged "rides" table. Activity recorded.');
    }

    console.log('Keep-alive pulse completed successfully.');
  } catch (err) {
    console.error('Fatal error during keep-alive pulse:', err.message);
    process.exit(1);
  }
}

keepAlive();
