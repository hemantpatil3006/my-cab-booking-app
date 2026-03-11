const supabase = require('./backend/lib/supabaseClient');

async function debugDriversTable() {
  console.log('Checking drivers table columns...');
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching from drivers table:', error);
  } else {
    console.log('Sample driver record or table exists:', data);
    
    // Get column names via a different method if possible, or just list keys from sample
    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('Drivers table is empty, cannot easily list columns from a select * result without data');
    }
  }

  // Alternative: query information_schema if permissions allow
  const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'drivers' });
  if (colError) {
    console.log('RPC get_table_columns failed (expected if not defined). Trying simple query...');
  } else {
    console.log('Columns from RPC:', cols);
  }
}

debugDriversTable();
