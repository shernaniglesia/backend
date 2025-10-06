const express = require('express');
const { getEquipmentReservations,
  approveEquipmentReservation,
  rejectEquipmentReservation,
  createEquipmentReservation,
  cancelEquipmentReservation,
  borrowEquipmentReservation,
  returnEquipmentReservation,
deleteEquipmentReservations } = require('../controllers/equipmentReservationController');

const router = express.Router();

router.get("/", getEquipmentReservations);
router.post("/", createEquipmentReservation);
router.put("/:id/approve", approveEquipmentReservation);
router.put("/:id/reject", rejectEquipmentReservation);
router.put("/:id/cancel", cancelEquipmentReservation);
router.put("/:id/borrow", borrowEquipmentReservation);
router.put("/:id/return", returnEquipmentReservation);
router.delete("/", deleteEquipmentReservations);

module.exports = router;
