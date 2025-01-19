const db = require("./db");

// Get all players
const getAllPlayers = async () => {
  return db.execute("SELECT * FROM players");
};

// Add a new player
const addPlayer = async (name, rank) => {
  return db.execute("INSERT INTO players (name, rank) VALUES (?, ?)", [
    name,
    rank,
  ]);
};

module.exports = {
  getAllPlayers,
  addPlayer,
};

