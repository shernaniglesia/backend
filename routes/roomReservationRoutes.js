const express = require("express");
const { getAllReservations, createReservation, approveReservation, rejectReservation, cancelReservation, deleteReservation,deleteMultipleReservations } = require("../controllers/roomReservationController");

const router = express.Router();

router.get("/", getAllReservations);
router.post("/", createReservation);

router.put("/:id/approve", approveReservation);
router.put("/:id/reject", rejectReservation);
router.put("/:id/cancel", cancelReservation);

router.delete("/:id", deleteReservation);
router.delete("/", deleteMultipleReservations);

module.exports = router;
