const express = require('express');
const {
  getGlobalMessages,
  sendGlobalMessage,
  getPrivateConversations,
  getPrivateMessages,
  sendPrivateMessage,
  getOnlineUsers,
  updatePresence,
  deleteMessage,
  getUsersForChat
} = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de mensajes globales
router.get('/global', getGlobalMessages);
router.post('/global', sendGlobalMessage);

// Rutas de mensajes privados
router.get('/conversations', getPrivateConversations);
router.get('/private/:otherUserId', getPrivateMessages);
router.post('/private', sendPrivateMessage);

// Rutas de presencia
router.get('/online-users', getOnlineUsers);
router.post('/presence', updatePresence);

// Lista de usuarios para chat
router.get('/users', getUsersForChat);

// Eliminar mensaje
router.delete('/message/:messageId', deleteMessage);

module.exports = router;
