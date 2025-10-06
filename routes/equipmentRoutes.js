const express = require("express");
const router = express.Router();

const {
  getAllEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} = require("../controllers/equipmentController");

router.get("/", getAllEquipment);
router.post("/", createEquipment);
router.put("/:id", updateEquipment);
router.delete("/", deleteEquipment);

module.exports = router;
