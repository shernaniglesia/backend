const express = require('express');
const { listRooms, createRoom, getRoomDetail, updateRoom, deleteRooms } = 
require('../controllers/roomController');

const router = express.Router();

router.get('/', listRooms);
router.post('/', createRoom);
router.get('/:roomId/detail', getRoomDetail);
router.put('/:id', updateRoom);
router.delete("/", deleteRooms);

module.exports = router;
