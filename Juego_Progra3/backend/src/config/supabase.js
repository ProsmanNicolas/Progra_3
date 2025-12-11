const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service key para operaciones del servidor

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridas');
}

// Cliente de Supabase para el backend con service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;
