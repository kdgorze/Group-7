const queries = require("./queries");

// Get all players
const getPlayers = async (req, res) => {
  try {
    const [rows] = await queries.getAllPlayers();
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error fetching players" });
  }
};

// Add a new player
const addPlayer = async (req, res) => {
  const { name, rank } = req.body;
  if (!name || !rank) {
    return res.status(400).json({ error: "Name and rank are required" });
  }

  try {
    const result = await queries.addPlayer(name, rank);
    res.status(201).json({ message: `Player ${name} added successfully` });
  } catch (err) {
    res.status(500).json({ error: "Error adding player" });
  }
};

module.exports = {
  getPlayers,
  addPlayer,
};
