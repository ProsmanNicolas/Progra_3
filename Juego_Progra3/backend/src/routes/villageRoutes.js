const express = require('express');
const { 
  getUserProfile,
  getUserVillage,
  getUserBuildings,
  createBuilding,
  deleteBuilding,
  getBuildingTypes,
  ensureUserVillage,
  cleanupDuplicateTownHalls,
  checkBuildingLimit,
  updateUserResources,
  upgradeBuilding,
  getUserResources,
  moveBuilding,
  getUserPopulation,
  // Nuevas funciones de entrenamiento
  startTroopTraining,
  completeTroopTraining,
  getTrainingQueue,
  getTroopTypes,
  getUserTroops
} = require('../controllers/villageController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de perfil y aldea
router.get('/profile', getUserProfile);
router.get('/info', getUserVillage);
router.get('/buildings', getUserBuildings);
router.get('/building-types', getBuildingTypes);
router.get('/population', getUserPopulation);
router.post('/ensure-village', ensureUserVillage);
router.post('/cleanup-duplicate-townhalls', cleanupDuplicateTownHalls);

// Rutas de edificios
router.post('/buildings', createBuilding);
router.delete('/buildings/:buildingId', deleteBuilding);
router.put('/buildings/:buildingId/upgrade', upgradeBuilding);
router.put('/buildings/:buildingId/move', moveBuilding);
router.get('/building-limit', checkBuildingLimit);

// Rutas de recursos
router.get('/resources', getUserResources);
router.put('/resources', updateUserResources);

// Rutas de entrenamiento de tropas
router.get('/troop-types', getTroopTypes);
router.get('/user-troops', getUserTroops);
router.get('/training-queue', getTrainingQueue);
router.post('/training/start', startTroopTraining);
router.post('/training/complete', completeTroopTraining);

module.exports = router;
