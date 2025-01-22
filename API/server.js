const express = require("express");
const cors = require("cors");
const db = require("./db");
const app = express();

app.use(cors()); // Enable CORS for all origins
app.use(express.json());

const getAllPlayers = async () => {
  try {
    const result = await db.query("SELECT * FROM players");
    return result.rows;
  } catch (error) {
    console.error("Error fetching players:", error.message);
    throw error;
  }
};

const addPlayer = async (name, rank) => {
  try {
    const result = await db.query(
      "INSERT INTO players (name, rank) VALUES ($1, $2) RETURNING *",
      [name, rank]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error adding player:", error.message);
    throw error;
  }
};

app.get("/", (req, res) => {
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

app.get("/api/players", async (req, res) => {
  try {
    const players = await getAllPlayers();
    res.json(players);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching players", error: error.message });
  }
});

app.get("/api/players/add", async (req, res) => {
  const { name, rank } = req.query;
  if (!name || !rank) {
    return res.status(400).json({ message: "Name and rank are required" });
  }
  try {
    const newPlayer = await addPlayer(name, rank);
    res.status(201).json(newPlayer);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding player", error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
