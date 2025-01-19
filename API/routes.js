const express = require("express");
const controller = require("./controller");

const router = express.Router();

// Route to get all players
router.get("/players", controller.getPlayers);

// Route to add a new player
router.post("/players", controller.addPlayer);

module.exports = router;
