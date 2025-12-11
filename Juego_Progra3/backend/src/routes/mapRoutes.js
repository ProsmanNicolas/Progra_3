const express = require('express');
const { 
  getAllVillages,
  getVillageDetails,
  updateUserVillage,
  donateResources,
  getUserResources,
  getSpecificUserResources,
  getUserDonations,
  getUserDefensePower,
  recordBattle,
  getBattleHistory
} = require('../controllers/mapController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas del mapa global
router.get('/villages', getAllVillages);
router.get('/villages/:villageId', getVillageDetails);
router.put('/my-village', updateUserVillage);

// Rutas de recursos y donaciones
router.post('/donate', donateResources);
router.get('/user-resources', getUserResources);
router.get('/user-resources/:userId', getSpecificUserResources);
router.get('/donations', getUserDonations);

// Ruta para poder defensivo (para batallas)
router.get('/defense-power/:userId', getUserDefensePower);

// Rutas del historial de batallas
router.post('/battles', recordBattle);
router.get('/battles', getBattleHistory);

module.exports = router;
