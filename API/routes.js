const express = require("express");
const router = express.Router();
const queries = require("./queries"); // Import queries for players

// Homepage route
router.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Picklers API</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
          }
          h1 {
            color: #3c91e6;
          }
          p {
            font-size: 18px;
          }
          a {
            color: #3c91e6;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>Welcome to the Picklers API</h1>
        <p>Your pickleball tournament and ranking application.</p>
        <p>API Endpoints:</p>
        <ul>
          <li><a href="/api/players">Get All Players</a></li>
          <li><a href="/api/players/add?name=John&rank=1">Add Player (Example)</a></li>
        </ul>
      </body>
    </html>
  `);
});

// Get all players
router.get("/api/players", async (req, res) => {
  try {
    const players = await queries.getAllPlayers(); // Fetch players from the database
    res.json(players); // Return players as JSON response
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching players", error: error.message });
  }
});

// Add a player (via query params for simplicity)
router.get("/api/players/add", async (req, res) => {
  const { name, rank } = req.query; // Retrieve name and rank from query params
  if (!name || !rank) {
    return res.status(400).json({ message: "Name and rank are required" });
  }
  try {
    const newPlayer = await queries.addPlayer(name, rank); // Add new player to the database
    res.status(201).json(newPlayer); // Return the newly added player
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding player", error: error.message });
  }
});

module.exports = router;
