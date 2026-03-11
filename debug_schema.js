require('dotenv').config({ path: './backend/.env' });
const supabase = require('./backend/lib/supabaseClient');

async function checkSchema() {
    try {
        const { data, error } = await supabase
            .from('ratings')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('Error fetching from ratings:', error);
        } else {
            console.log('Ratings table exists');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkSchema();
