const responseDebugMiddleware = (req, res, next) => {
  // Interceptar el método json para verificar que las respuestas sean válidas
  const originalJson = res.json;
  
  res.json = function(data) {
    try {
      // Intentar serializar el objeto para verificar que sea válido JSON
      const jsonString = JSON.stringify(data);
      console.log('📤 Response Debug - Enviando JSON válido:', {
        url: req.originalUrl,
        method: req.method,
        dataLength: jsonString.length,
        dataPreview: jsonString.substring(0, 200) + (jsonString.length > 200 ? '...' : ''),
        statusCode: res.statusCode
      });
      
      // Llamar al método original
      return originalJson.call(this, data);
    } catch (error) {
      console.error('❌ Response Debug - JSON INVÁLIDO:', {
        url: req.originalUrl,
        method: req.method,
        error: error.message,
        data: data
      });
      
      // Enviar un error JSON válido en caso de problemas
      return originalJson.call(this, {
        success: false,
        message: 'Error interno del servidor - Respuesta inválida',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Interceptar el método send para respuestas no-JSON también
  const originalSend = res.send;
  res.send = function(data) {
    if (typeof data === 'string') {
      try {
        // Si es un string, intentar parsearlo para verificar si es JSON válido
        JSON.parse(data);
        console.log('📤 Response Debug - Enviando string JSON válido:', {
          url: req.originalUrl,
          method: req.method,
          dataLength: data.length,
          statusCode: res.statusCode
        });
      } catch (error) {
        console.log('📤 Response Debug - Enviando string no-JSON:', {
          url: req.originalUrl,
          method: req.method,
          dataLength: data.length,
          statusCode: res.statusCode,
          preview: data.substring(0, 100)
        });
      }
    }
    
    return originalSend.call(this, data);
  };

  next();
};

module.exports = responseDebugMiddleware;
