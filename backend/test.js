require('dotenv').config({ path: __dirname + '/.env' });
const supabase = require('./lib/supabaseClient');

async function test() {
    console.log('URL:', process.env.SUPABASE_URL ? 'set' : 'not set');
    const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          rides!inner (
            rider_id
          )
        `);
    console.log('Error:', error);
    if (data) console.log('Data count:', data.length);
}
test();
