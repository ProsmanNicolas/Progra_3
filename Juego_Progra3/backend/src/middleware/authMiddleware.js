const supabase = require('../config/supabase');

/**
 * Middleware para verificar autenticación
 * Extrae el token del header Authorization y verifica su validez
 */
const authMiddleware = async (req, res, next) => {
  console.log('🔐 AuthMiddleware - INICIO');
  console.log('🔐 URL:', req.url);
  console.log('🔐 Method:', req.method);
  console.log('🔐 Headers:', req.headers.authorization ? 'Authorization present' : 'No authorization header');
  
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('❌ AuthMiddleware - No authorization header');
      return res.status(401).json({
        success: false,
        message: 'Token de autorización requerido'
      });
    }

    // Extraer token del header "Bearer TOKEN"
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de autorización inválido'
      });
    }

    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('❌ AuthMiddleware - Token inválido:', error?.message);
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    console.log('✅ AuthMiddleware - Usuario autenticado:', user.id);

    // Añadir usuario a la request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = authMiddleware;
