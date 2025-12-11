const supabase = require('../config/supabase');

/**
 * Registrar nuevo usuario
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validación básica
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: 'Email, contraseña y nombre de usuario son requeridos'
      });
    }

    // Verificar si el email ya existe en la base de datos
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email);

    if (checkError) {
      console.error('Error al verificar email existente:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Este correo ya está registrado'
      });
    }

    // Registrar usuario en Supabase Auth
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/login`,
        data: {
          username
        }
      }
    });

    if (signUpError) {
      console.error('Error en registro:', signUpError);
      
      if (signUpError.message && signUpError.message.toLowerCase().includes('already registered')) {
        return res.status(409).json({
          success: false,
          message: 'Este correo ya está registrado'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: signUpError.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente. Verifica tu correo electrónico.',
      data: {
        user: data.user,
        needsEmailConfirmation: true
      }
    });

  } catch (error) {
    console.error('Error inesperado en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Iniciar sesión
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Intentar iniciar sesión
    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('Error en login:', signInError);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el email está confirmado
    if (!data.user || !data.user.email_confirmed_at) {
      return res.status(403).json({
        success: false,
        message: 'Debes confirmar tu correo antes de ingresar'
      });
    }

    // Verificar o crear usuario en la tabla users
    const { data: userExists } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', data.user.id);

    let userData;

    if (!userExists || userExists.length === 0) {
      // Crear usuario en la tabla users si no existe
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          username: data.user.user_metadata?.username || ''
        })
        .select();

      if (insertError) {
        console.error('Error al crear usuario en base de datos:', insertError);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }

      userData = newUser[0];
    } else {
      userData = userExists[0];
    }

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userData,
        session: data.session
      }
    });

  } catch (error) {
    console.error('Error inesperado en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Cerrar sesión
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error al cerrar sesión:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    console.error('Error inesperado en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener información del usuario autenticado
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de autorización requerido'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Obtener usuario de Supabase usando el token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    // Obtener información adicional del usuario desde la base de datos
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', user.id)
      .single();

    if (dbError && dbError.code === 'PGRST116') {
      // Usuario no existe en tabla users, crearlo
      console.log('Usuario no existe en tabla users, creándolo...');
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || user.email.split('@')[0]
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error al crear usuario en base de datos:', insertError);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user: newUser
        }
      });
    } else if (dbError) {
      console.error('Error al obtener datos del usuario:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    } else {
      res.status(200).json({
        success: true,
        data: {
          user: userData
        }
      });
    }

  } catch (error) {
    console.error('Error inesperado en getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Verificar si un email existe
 * POST /api/auth/check-email
 */
const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    // Verificar en tabla users
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email);

    if (userError) {
      console.error('Error al verificar email:', userError);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }

    const exists = userExists && userExists.length > 0;

    res.status(200).json({
      success: true,
      data: {
        exists
      }
    });

  } catch (error) {
    console.error('Error inesperado en checkEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  // 📝 Registro - Crear nueva cuenta de usuario con email, password y username
  register,
  
  // 🔐 Login - Iniciar sesión y obtener token de autenticación
  login,
  
  // 🚪 Logout - Cerrar sesión del usuario actual
  logout,
  
  // 👤 Obtener Usuario - Obtener información del usuario autenticado actual
  getMe,
  
  // ✉️ Verificar Email - Comprobar si un email ya está registrado en el sistema
  checkEmail
};
