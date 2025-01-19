const db = require("./db"); // Import the db connection pool

// Get all players
const getAllPlayers = async () => {
  try {
    const result = await db.query("SELECT * FROM players");
    return result.rows; // Return the players data
  } catch (error) {
    console.error("Error fetching players:", error);
    throw error;
  }
};

// Add a new player
const addPlayer = async (name, rank) => {
  try {
    const result = await db.query(
      "INSERT INTO players (name, rank) VALUES ($1, $2) RETURNING *",
      [name, rank]
    );
    return result.rows[0]; // Return the newly created player
  } catch (error) {
    console.error("Error adding player:", error);
    throw error;
  }
};

module.exports = {
  getAllPlayers,
  addPlayer,
};
