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
    // Attempt 1: Try to query a common table (rides)
    const { data: ridesData, error: ridesError } = await supabase
      .from('rides')
      .select('id')
      .limit(1);

    if (ridesError) {
      console.warn('Note: "rides" query returned an error:', ridesError.message);
      
      // If the error is 'fetch failed', it means the database is unreachable (e.g. paused) or URL is wrong.
      if (ridesError.message.includes('fetch')) {
        throw new Error(`Connection failed. The project might be paused or the URL is incorrect. Details: ${ridesError.message}`);
      }

      // Attempt 2: Just check if we can reach the health endpoint via postgrest headers
      const { error: finalError } = await supabase.from('non_existent_table').select('*').limit(1);
      if (finalError && finalError.message.includes('fetch')) {
         throw new Error(`Fallback connection failed. Details: ${finalError.message}`);
      }
      console.log('Final fallback ping (to non_existent_table) completed.');
      
    } else {
      console.log('Successfully pinged "rides" table. Activity recorded.');
    }

    console.log('Keep-alive pulse completed successfully.');
  } catch (err) {
    console.error('❌ Fatal error during keep-alive pulse:', err.message);
    process.exit(1);
  }
}

keepAlive();
