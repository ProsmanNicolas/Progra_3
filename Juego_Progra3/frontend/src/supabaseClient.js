// Configuración de Supabase para React
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

// Configuración mejorada del cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Configurar para manejar mejor los refresh tokens
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Configuración de almacenamiento mejorada
    storageKey: 'juego-progra3-auth-token',
    // Configurar timeout para evitar conexiones colgadas
    flowType: 'pkce',
    // Configurar refresh margin más amplio
    refreshTokenMargin: 300 // 5 minutos antes de expirar
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'juego-progra3@1.0.0'
    }
  },
  realtime: {
    // Deshabilitar realtime por ahora para reducir errores de conexión
    params: {
      eventsPerSecond: 2
    }
  }
});

// Habilitar listener para manejar cambios de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔐 Auth state changed:', event, session?.user?.email || 'No user');
  
  if (event === 'TOKEN_REFRESHED' && session) {
    console.log('✅ Token refreshed successfully');
    // Actualizar el token en localStorage para que lo usen las APIs
    localStorage.setItem('auth-token', session.access_token);
    if (session.refresh_token) {
      localStorage.setItem('refresh-token', session.refresh_token);
    }
  } else if (event === 'SIGNED_OUT') {
    console.log('👋 User signed out');
    // Limpiar tokens del localStorage
    localStorage.removeItem('auth-token');
    localStorage.removeItem('refresh-token');
  } else if (event === 'SIGNED_IN' && session) {
    console.log('👋 User signed in');
    // Guardar tokens en localStorage
    localStorage.setItem('auth-token', session.access_token);
    if (session.refresh_token) {
      localStorage.setItem('refresh-token', session.refresh_token);
    }
  }
});

// ✅ Autenticación manejada completamente por el backend API
// ❌ NO usar supabase.auth en el frontend - toda autenticación via /api/auth/*
