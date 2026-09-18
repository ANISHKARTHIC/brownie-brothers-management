require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// We need the service role key to run migrations. Or we can just use RPC.
// Wait, we can't run ALTER TABLE from the client without postgres role.
// We can't use DDL from supabase-js unless we use a raw Postgres driver or postgres role.
