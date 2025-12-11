const express = require('express');
const { 
  getUserResources,
  initializeUserResources,
  updateUserResources,
  calculateOfflineResources,
  collectOfflineResources
} = require('../controllers/resourceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de recursos
router.get('/', getUserResources);
router.post('/initialize', initializeUserResources);
router.put('/', updateUserResources);
router.post('/calculate-offline', calculateOfflineResources);
router.post('/collect-offline', collectOfflineResources);

module.exports = router;
