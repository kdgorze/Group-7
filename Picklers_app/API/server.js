const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");
const app = express();

app.use(cors());
app.use(express.json());

// =================================================
// Root Endpoint: API Home with documentation
// =================================================
app.get("/", (req, res) => {
  res.send(`
   <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Picklers API</title>
    <link rel="stylesheet" href="http://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css" />
  </head>
  <body>
    <section class="hero is-primary is-bold">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title">Welcome to the Picklers API</h1>
          <h2 class="subtitle">Your pickleball ladder and ranking application.</h2>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <h3 class="title is-4">API Endpoints:</h3>
        <div class="content">
          <ul>
            <li><strong>POST /register</strong> - Register a new user</li>
            <li><strong>POST /login</strong> - User login</li>
            <li><strong>GET /posts</strong> - Get all posts</li>
            <li><strong>POST /posts</strong> - Create a new post</li>
            <li><strong>POST /follows</strong> - Follow a user</li>
            <li><strong>GET /users/:id/following</strong> - Get users a user is following</li>
            <li><strong>GET /users/:id/followers</strong> - Get a user's followers</li>
            <li><strong>GET /courts</strong> - Get all courts</li>
            <hr />
            <li><strong>POST /leagues</strong> - Create a new league</li>
            <li><strong>GET /leagues</strong> - Get all leagues</li>
            <li><strong>GET /leagues/:id</strong> - Get a single league</li>
            <li><strong>POST /leagues/:id/participants</strong> - Add a participant (by username)</li>
            <li><strong>GET /leagues/:id/participants</strong> - Get league participants</li>
            <li><strong>POST /leagues/:id/matches</strong> - Record a match (singles or doubles)</li>
            <li><strong>GET /leagues/:id/matches</strong> - Get matches in a league</li>
            <li><strong>GET /leagues/:id/ladder</strong> - Get league ladder (ranking)</li>
          </ul>
        </div>
      </div>
    </section>
  </body>
</html>
  `);
});

// =================================================
// User Endpoints: Register & Login
// =================================================

// Register a new user
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, summary, home_court, profile_picture } = req.body;
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      `INSERT INTO users 
         (username, email, password_hash, summary, home_court, profile_picture) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [username, email, password_hash, summary, home_court, profile_picture]
    );
    const newUser = result.rows[0];
    delete newUser.password_hash;
    res.status(201).json(newUser);
  } catch (err) {
    console.error("Error in /register:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// User login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    delete user.password_hash;
    res.json(user);
  } catch (err) {
    console.error("Error in /login:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// =================================================
// Post Endpoints (Social Posts)
// =================================================

// Get all posts
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

// Create a new post
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

// =================================================
// Follow Endpoints (Social Feature)
// =================================================

// Follow a user
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

// Get list of users that a user is following
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

// Get list of followers for a user
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

// =================================================
// Courts Endpoints (Example: local courts info)
// =================================================

app.get("/courts", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM courts ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /courts:", err);
    res.status(500).json({ error: "Failed to fetch courts" });
  }
});

// =================================================
// League & Ladder Endpoints
// =================================================

// Create a new league
app.post("/leagues", async (req, res) => {
  try {
    const { name, description, created_by } = req.body;
    const result = await db.query(
      `INSERT INTO leagues (name, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description, created_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /leagues:", err);
    res.status(500).json({ error: "Failed to create league" });
  }
});

// Get all leagues
app.get("/leagues", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM leagues ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /leagues:", err);
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
});

// Get a single league by ID
app.get("/leagues/:id", async (req, res) => {
  const leagueId = req.params.id;
  try {
    const result = await db.query("SELECT * FROM leagues WHERE id = $1", [leagueId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "League not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in GET /leagues/:id:", err);
    res.status(500).json({ error: "Failed to fetch league" });
  }
});

// Add a participant to a league (by username)
app.post("/leagues/:id/participants", async (req, res) => {
  const leagueId = req.params.id;
  const { username } = req.body;
  try {
    const userResult = await db.query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user_id = userResult.rows[0].id;
    const result = await db.query(
      `INSERT INTO league_participants (league_id, user_id)
       VALUES ($1, $2) RETURNING *`,
      [leagueId, user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /leagues/:id/participants:", err);
    res.status(500).json({ error: "Failed to add participant" });
  }
});

// Get league participants (sorted by rating DESC)
app.get("/leagues/:id/participants", async (req, res) => {
  const leagueId = req.params.id;
  try {
    const result = await db.query(
      `SELECT lp.*, u.username 
         FROM league_participants lp
         JOIN users u ON lp.user_id = u.id
        WHERE lp.league_id = $1
        ORDER BY lp.rating DESC`,
      [leagueId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /leagues/:id/participants:", err);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

// Record a match (supports singles or doubles)
app.post("/leagues/:id/matches", async (req, res) => {
  const leagueId = req.params.id;
  const { match_type } = req.body; // "singles" or "doubles"
  try {
    if (match_type === "doubles") {
      // The front-end organizes Team 1 => (player1_username, player2_username)
      // and Team 2 => (player3_username, player4_username)
      const { 
        player1_username, 
        player2_username, 
        player3_username, 
        player4_username, 
        team1_score, 
        team2_score 
      } = req.body;
      
      // Look up IDs
      const user1Res = await db.query("SELECT id FROM users WHERE username = $1", [player1_username]);
      const user2Res = await db.query("SELECT id FROM users WHERE username = $1", [player2_username]);
      const user3Res = await db.query("SELECT id FROM users WHERE username = $1", [player3_username]);
      const user4Res = await db.query("SELECT id FROM users WHERE username = $1", [player4_username]);
      
      if (
        user1Res.rows.length === 0 ||
        user2Res.rows.length === 0 ||
        user3Res.rows.length === 0 ||
        user4Res.rows.length === 0
      ) {
        return res.status(404).json({ error: "One or more users not found" });
      }
      
      const player1_id = user1Res.rows[0].id; // Team1
      const player2_id = user2Res.rows[0].id; // Team1
      const player3_id = user3Res.rows[0].id; // Team2
      const player4_id = user4Res.rows[0].id; // Team2
      
      // Determine winner_team
      let winner_team = null;
      if (team1_score > team2_score) {
        winner_team = "team1";
      } else if (team2_score > team1_score) {
        winner_team = "team2";
      }
      
      // Insert match row
      const matchResult = await db.query(
        `INSERT INTO league_matches
           (league_id, match_type, 
            player1_id, player2_id, player3_id, player4_id, 
            team1_score, team2_score, winner_team)
         VALUES ($1, 'doubles', $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [leagueId, player1_id, player2_id, player3_id, player4_id, team1_score, team2_score, winner_team]
      );
      
      // Update ratings
      if (winner_team) {
        let winningIds = [];
        let losingIds = [];
        if (winner_team === "team1") {
          winningIds = [player1_id, player2_id];
          losingIds  = [player3_id, player4_id];
        } else {
          winningIds = [player3_id, player4_id];
          losingIds  = [player1_id, player2_id];
        }
        for (const id of winningIds) {
          await db.query(
            `UPDATE league_participants
               SET rating = rating + 10,
                   wins = wins + 1,
                   matches_played = matches_played + 1,
                   last_match = NOW()
             WHERE league_id = $1 AND user_id = $2`,
            [leagueId, id]
          );
        }
        for (const id of losingIds) {
          await db.query(
            `UPDATE league_participants
               SET rating = rating - 5,
                   losses = losses + 1,
                   matches_played = matches_played + 1,
                   last_match = NOW()
             WHERE league_id = $1 AND user_id = $2`,
            [leagueId, id]
          );
        }
      } else {
        // tie => increment matches_played for all
        await db.query(
          `UPDATE league_participants
             SET matches_played = matches_played + 1,
                 last_match = NOW()
           WHERE league_id = $1
             AND user_id IN ($2, $3, $4, $5)`,
          [leagueId, player1_id, player2_id, player3_id, player4_id]
        );
      }
      
      return res.status(201).json(matchResult.rows[0]);
      
    } else {
      // singles
      const { player1_username, player2_username, player1_score, player2_score } = req.body;
      const user1Res = await db.query("SELECT id FROM users WHERE username = $1", [player1_username]);
      const user2Res = await db.query("SELECT id FROM users WHERE username = $1", [player2_username]);
      if (user1Res.rows.length === 0 || user2Res.rows.length === 0) {
        return res.status(404).json({ error: "One or both users not found" });
      }
      const player1_id = user1Res.rows[0].id;
      const player2_id = user2Res.rows[0].id;
      
      let winner_id = null;
      if (player1_score > player2_score) {
        winner_id = player1_id;
      } else if (player2_score > player1_score) {
        winner_id = player2_id;
      }
      
      const matchResult = await db.query(
        `INSERT INTO league_matches
           (league_id, match_type, 
            player1_id, player2_id, 
            player1_score, player2_score, winner_id)
         VALUES ($1, 'singles', $2, $3, $4, $5, $6)
         RETURNING *`,
        [leagueId, player1_id, player2_id, player1_score, player2_score, winner_id]
      );
      
      if (winner_id) {
        const loser_id = (winner_id === player1_id) ? player2_id : player1_id;
        await db.query(
          `UPDATE league_participants
             SET rating = rating + 10,
                 wins = wins + 1,
                 matches_played = matches_played + 1,
                 last_match = NOW()
           WHERE league_id = $1 AND user_id = $2`,
          [leagueId, winner_id]
        );
        await db.query(
          `UPDATE league_participants
             SET rating = rating - 5,
                 losses = losses + 1,
                 matches_played = matches_played + 1,
                 last_match = NOW()
           WHERE league_id = $1 AND user_id = $2`,
          [leagueId, loser_id]
        );
      } else {
        // tie => increment matches_played for both
        await db.query(
          `UPDATE league_participants
             SET matches_played = matches_played + 1,
                 last_match = NOW()
           WHERE league_id = $1
             AND user_id IN ($2, $3)`,
          [leagueId, player1_id, player2_id]
        );
      }
      return res.status(201).json(matchResult.rows[0]);
    }
  } catch (err) {
    console.error("Error in POST /leagues/:id/matches:", err);
    return res.status(500).json({ error: "Failed to record match" });
  }
});

// Get matches in a league
app.get("/leagues/:id/matches", async (req, res) => {
  const leagueId = req.params.id;
  try {
    const result = await db.query(
      `SELECT lm.*,
              u1.username AS player1_name,
              u2.username AS player2_name,
              u3.username AS player3_name,
              u4.username AS player4_name
         FROM league_matches lm
         JOIN users u1 ON lm.player1_id = u1.id
         JOIN users u2 ON lm.player2_id = u2.id
         LEFT JOIN users u3 ON lm.player3_id = u3.id
         LEFT JOIN users u4 ON lm.player4_id = u4.id
        WHERE lm.league_id = $1
        ORDER BY lm.played_at DESC`,
      [leagueId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /leagues/:id/matches:", err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// Get league ladder (ranking)
app.get("/leagues/:id/ladder", async (req, res) => {
  const leagueId = req.params.id;
  try {
    const result = await db.query(
      `SELECT lp.*, u.username
         FROM league_participants lp
         JOIN users u ON lp.user_id = u.id
        WHERE lp.league_id = $1
        ORDER BY lp.rating DESC`,
      [leagueId]
    );
    const ladder = result.rows.map((p, index) => ({
      rank: index + 1,
      username: p.username,
      rating: p.rating,
      wins: p.wins,
      losses: p.losses,
      matches_played: p.matches_played,
      last_match: p.last_match
    }));
    res.json(ladder);
  } catch (err) {
    console.error("Error in GET /leagues/:id/ladder:", err);
    res.status(500).json({ error: "Failed to fetch ladder" });
  }
});


// =================================================
// Start the Server
// =================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
