const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
const db = require("./db");
const app = express();

// ---------------------
// Middleware
// ---------------------
app.use(
  cors({
    origin: "http://localhost:3000", // Adjust if needed
    credentials: true, // Allow cookies to be sent
  })
);
app.use(express.json());

// Setup session middleware
app.use(
  session({
    secret: "your_secret_key_here", // Replace with your secret or use an environment variable
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true if using HTTPS
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

// ---------------------
// API Documentation (Root Endpoint)
// ---------------------
app.get("/", (req, res) => {
  res.send(`
   <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Picklers API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css" />
  </head>
  <body>
    <!-- Hero Section -->
    <section class="hero is-primary is-bold">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title">Welcome to the Picklers API</h1>
          <h2 class="subtitle">Your pickleball tournament and ranking application.</h2>
        </div>
      </div>
    </section>
    <!-- API Endpoints Section -->
    <section class="section">
      <div class="container">
        <h3 class="title is-4">API Endpoints:</h3>
        <div class="content">
          <ul>
            <li><strong>POST /register</strong> - Register a new user</li>
            <li><strong>POST /login</strong> - User login</li>
            <li><strong>GET /me</strong> - Get current user</li>
            <li><strong>PUT /me</strong> - Update current user profile</li>
            <li><strong>POST /logout</strong> - Log out current user</li>
            <li><strong>GET /posts</strong> - Get all posts</li>
            <li><strong>POST /posts</strong> - Create a new post</li>
            <li><strong>GET /tournaments</strong> - Get all tournaments</li>
            <li><strong>POST /tournaments</strong> - Create a new tournament</li>
            <li><strong>POST /tournaments/:id/register</strong> - Register for a tournament</li>
            <li><strong>POST /follows</strong> - Follow a user</li>
            <li><strong>GET /users/:id/following</strong> - Get users a user is following</li>
            <li><strong>GET /users/:id/followers</strong> - Get a user's followers</li>
            <li><strong>GET /courts</strong> - Get all courts</li>
            <li><strong>GET /matches</strong> - Get all matches</li>
            <li><strong>POST /matches</strong> - Create a new match record</li>
            <li><strong>GET /leaderboard</strong> - Get aggregated leaderboard data</li>
          </ul>
        </div>
      </div>
    </section>
  </body>
</html>
  `);
});

// ---------------------
// User Endpoints: Register & Login
// ---------------------

// POST /register – Register a new user
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, summary, home_court, profile_picture } =
      req.body;
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      `INSERT INTO users 
         (username, email, password_hash, summary, home_court, profile_picture) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [username, email, password_hash, summary, home_court, profile_picture]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in /register:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /login – User login; on success, store user info in session
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    delete user.password_hash;
    // Store user data in session
    req.session.user = user;
    res.json(user);
  } catch (err) {
    console.error("Error in /login:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /me – Return the current user's profile based on session
app.get("/me", (req, res) => {
  if (req.session && req.session.user) {
    return res.json(req.session.user);
  }
  res.status(401).json({ error: "Not authenticated" });
});

// PUT /me – Update the current user's profile data
app.put("/me", async (req, res) => {
  if (!(req.session && req.session.user)) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const { username, summary, home_court, profile_picture } = req.body;
    const userId = req.session.user.id;
    const result = await db.query(
      `UPDATE users
       SET username = COALESCE($1, username),
           summary = COALESCE($2, summary),
           home_court = COALESCE($3, home_court),
           profile_picture = COALESCE($4, profile_picture)
       WHERE id = $5
       RETURNING *`,
      [username, summary, home_court, profile_picture, userId]
    );
    // Update session with new data
    req.session.user = result.rows[0];
    delete req.session.user.password_hash;
    res.json(req.session.user);
  } catch (err) {
    console.error("Error in PUT /me:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /logout – Log out the current user
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid"); // default cookie name for express-session
    res.json({ message: "Logged out successfully" });
  });
});

// ---------------------
// Post Endpoints
// ---------------------

// GET /posts – Get all posts (with associated username)
app.get("/posts", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.username 
         FROM posts p 
         JOIN users u ON p.user_id = u.id 
         ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// POST /posts – Create a new post
app.post("/posts", async (req, res) => {
  try {
    const { user_id, content } = req.body;
    const result = await db.query(
      "INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *",
      [user_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /posts:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ---------------------
// Tournament Endpoints
// ---------------------

// GET /tournaments – Get all tournaments
app.get("/tournaments", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM tournaments ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /tournaments:", err);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});

// POST /tournaments – Create a new tournament
app.post("/tournaments", async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      details,
      registration_info,
      created_by,
    } = req.body;
    const result = await db.query(
      `INSERT INTO tournaments 
         (title, subtitle, description, details, registration_info, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, subtitle, description, details, registration_info, created_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /tournaments:", err);
    res.status(500).json({ error: "Failed to create tournament" });
  }
});

// POST /tournaments/:id/register – Register for a tournament
app.post("/tournaments/:id/register", async (req, res) => {
  try {
    const tournament_id = req.params.id;
    const { user_id } = req.body;
    const result = await db.query(
      "INSERT INTO tournament_registrations (tournament_id, user_id) VALUES ($1, $2) RETURNING *",
      [tournament_id, user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /tournaments/:id/register:", err);
    res.status(500).json({ error: "Failed to register for tournament" });
  }
});

// ---------------------
// Follow Endpoints
// ---------------------

// POST /follows – Follow a user
app.post("/follows", async (req, res) => {
  try {
    const { follower_id, followee_id } = req.body;
    const result = await db.query(
      "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) RETURNING *",
      [follower_id, followee_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /follows:", err);
    res.status(500).json({ error: "Failed to follow user" });
  }
});

// GET /users/:id/following – Get list of users a user is following
app.get("/users/:id/following", async (req, res) => {
  try {
    const user_id = req.params.id;
    const result = await db.query(
      `SELECT u.* 
         FROM follows f 
         JOIN users u ON f.followee_id = u.id 
         WHERE f.follower_id = $1`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /users/:id/following:", err);
    res.status(500).json({ error: "Failed to fetch following list" });
  }
});

// GET /users/:id/followers – Get list of followers for a user
app.get("/users/:id/followers", async (req, res) => {
  try {
    const user_id = req.params.id;
    const result = await db.query(
      `SELECT u.* 
         FROM follows f 
         JOIN users u ON f.follower_id = u.id 
         WHERE f.followee_id = $1`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /users/:id/followers:", err);
    res.status(500).json({ error: "Failed to fetch followers list" });
  }
});

// ---------------------
// Courts Endpoints
// ---------------------

// GET /courts – Get all courts
app.get("/courts", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM courts ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /courts:", err);
    res.status(500).json({ error: "Failed to fetch courts" });
  }
});

// ---------------------
// Matches & Leaderboard Endpoints
// ---------------------

// GET /matches – Get all matches (with player usernames)
app.get("/matches", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*, 
              u1.username AS player1, 
              u2.username AS player2 
         FROM matches m 
         JOIN users u1 ON m.player1_id = u1.id 
         JOIN users u2 ON m.player2_id = u2.id 
         ORDER BY m.played_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /matches:", err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// POST /matches – Create a new match record
app.post("/matches", async (req, res) => {
  try {
    const { player1_id, player2_id, score, tournament_id } = req.body;
    const result = await db.query(
      `INSERT INTO matches (player1_id, player2_id, score, tournament_id) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [player1_id, player2_id, score, tournament_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /matches:", err);
    res.status(500).json({ error: "Failed to create match" });
  }
});

// GET /leaderboard – Get aggregated leaderboard data
app.get("/leaderboard", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.username,
        COUNT(m.id) AS matches_played
      FROM users u
      LEFT JOIN matches m ON u.id = m.player1_id OR u.id = m.player2_id
      GROUP BY u.username
      ORDER BY matches_played DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ---------------------
// Start the Server
// ---------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
