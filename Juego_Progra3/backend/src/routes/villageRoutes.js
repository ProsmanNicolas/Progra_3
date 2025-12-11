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
  getUserTroops,
  // Nuevos endpoints de validación
  getBuildingLimits,
  getUpgradeCost,
  canUpgradeBuildingEndpoint,
  getProductionRate
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

// Nuevas rutas de validación y cálculo
router.get('/building-limits', getBuildingLimits);
router.get('/buildings/:buildingId/upgrade-cost', getUpgradeCost);
router.get('/buildings/:buildingId/can-upgrade', canUpgradeBuildingEndpoint);
router.get('/buildings/:buildingId/production-rate', getProductionRate);

module.exports = router;
