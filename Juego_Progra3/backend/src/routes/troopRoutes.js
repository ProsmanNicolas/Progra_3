const express = require('express');
const { 
  createTroop,
  deleteTroop,
  getUserTroops,
  getTroopTypes,
  getUserDefensePower,
  assignTroopsToDefense,
  getTowerDefenseAssignments,
  getAllDefenseAssignments,
  getTargetDefensePower,
  executeBattle
} = require('../controllers/troopController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de gestión de tropas
router.get('/types', getTroopTypes);
router.get('/user-troops', getUserTroops);
router.post('/create', createTroop);
router.delete('/delete', deleteTroop);

// Rutas de defensa
router.get('/defense-power', getUserDefensePower);
router.post('/assign-defense', assignTroopsToDefense);
router.get('/tower-defense/:buildingId', getTowerDefenseAssignments);
router.get('/all-defense-assignments', getAllDefenseAssignments);
router.get('/target-defense/:targetUserId', getTargetDefensePower);

// Rutas de combate
router.post('/battle', executeBattle);

module.exports = router;
