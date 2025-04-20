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
            <li><strong>DELETE /follows</strong> - Unfollow a user</li>
            <li><strong>GET /users/:id/following</strong> - Get users a user is following</li>
            <li><strong>GET /users/:id/followers</strong> - Get a user's followers</li>
            <li><strong>GET /courts</strong> - Get all courts</li>
            <hr />
            <li><strong>GET /users</strong> - Get users (by username query or all)</li>
            <li><strong>GET /users/:id</strong> - Get single user (for profile data)</li>
            <li><strong>GET /users/:id/matches</strong> - Get user's recent matches</li>
            <li><strong>GET /users/:id/friends</strong> - Get user's friends</li>
            <hr />
            <li><strong>POST /leagues</strong> - Create a new league</li>
            <li><strong>GET /leagues</strong> - Get all leagues</li>
            <li><strong>GET /leagues/:id</strong> - Get a single league</li>
            <li><strong>POST /leagues/:id/participants</strong> - Add a participant (by username)</li>
            <li><strong>GET /leagues/:id/participants</strong> - Get league participants</li>
            <li><strong>POST /leagues/:id/matches</strong> - Record a match (singles/doubles)</li>
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
    const newUser = result.rows[0];
    delete newUser.password_hash;
    res.status(201).json(newUser);
  } catch (err) {
    console.error("Error in /register:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

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
    res.json(user);
  } catch (err) {
    console.error("Error in /login:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// =================================================
// Post Endpoints (Social Posts)
// =================================================

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

app.post("/posts", async (req, res) => {
  try {
    const { user_id, content, parent_post_id } = req.body;
    const result = await db.query(
      `INSERT INTO posts (user_id, content, parent_post_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, content, parent_post_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /posts:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

//==================================================
// Delete Post (Social Feature)
//==================================================

app.delete("/posts/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    const result = await db.query("DELETE FROM posts WHERE id = $1 RETURNING *", [postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ message: "Post deleted", post: result.rows[0] });
  } catch (err) {
    console.error("Error in DELETE /posts/:id:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// =================================================
// Follow Endpoints (Social Feature)
// =================================================

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

// DELETE endpoint for unfollowing
app.delete("/follows", async (req, res) => {
  try {
    const { follower_id, followee_id } = req.body;
    const result = await db.query(
      "DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2 RETURNING *",
      [follower_id, followee_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Follow relationship not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in DELETE /follows:", err);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});

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
// Additional User Endpoints for Profile
// =================================================

app.get("/users", async (req, res) => {
  try {
    const { username } = req.query;
    if (username) {
      const result = await db.query(
        "SELECT id, username, email, summary, home_court, profile_picture FROM users WHERE username = $1",
        [username]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json(result.rows[0]);
    } else {
      const allUsers = await db.query(
        "SELECT id, username, email, summary, home_court, profile_picture FROM users"
      );
      return res.json(allUsers.rows);
    }
  } catch (err) {
    console.error("Error in GET /users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/users/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await db.query(
      `SELECT id, username, summary, home_court
         FROM users
        WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in GET /users/:id:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.get("/users/:id/matches", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  try {
    const result = await db.query(
      `SELECT 
          created_at AS played_at,
          CASE 
            WHEN match_type = 'singles' 
                 AND ((player1_id = $1 AND player1_score > player2_score)
                      OR (player2_id = $1 AND player2_score > player1_score)) 
              THEN 'Win'
            WHEN match_type = 'singles' 
                 AND ((player1_id = $1 AND player1_score < player2_score)
                      OR (player2_id = $1 AND player2_score < player1_score))
              THEN 'Loss'
            WHEN match_type = 'singles'
              THEN 'Tie'
            WHEN match_type = 'doubles'
                 AND (($1 IN (player1_id, player2_id) AND winner_team = 'team1')
                      OR ($1 IN (player3_id, player4_id) AND winner_team = 'team2'))
              THEN 'Win'
            WHEN match_type = 'doubles'
                 AND (($1 IN (player1_id, player2_id) AND winner_team = 'team2')
                      OR ($1 IN (player3_id, player4_id) AND winner_team = 'team1'))
              THEN 'Loss'
            ELSE 'Tie/Unknown'
          END AS result
       FROM league_matches
      WHERE $1 IN (player1_id, player2_id, player3_id, player4_id)
      ORDER BY created_at DESC
      LIMIT 10`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /users/:id/matches:", err);
    res.status(500).json({ error: "Failed to fetch recent matches" });
  }
});




app.get("/users/:id/friends", async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await db.query(
      `SELECT u.username
         FROM follows f
         JOIN users u ON f.followee_id = u.id
        WHERE f.follower_id = $1
        ORDER BY u.username`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /users/:id/friends:", err);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// =================================================
// Courts Endpoints (Local courts info)
// =================================================

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

// =================================================
// League & Ladder Endpoints
// =================================================

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

app.get("/leagues", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM leagues ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /leagues:", err);
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
});

app.get("/leagues/:id", async (req, res) => {
  const leagueId = req.params.id;
  try {
    const result = await db.query("SELECT * FROM leagues WHERE id = $1", [
      leagueId,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "League not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in GET /leagues/:id:", err);
    res.status(500).json({ error: "Failed to fetch league" });
  }
});

app.post("/leagues/:id/participants", async (req, res) => {
  const leagueId = req.params.id;
  const { username } = req.body;
  try {
    const userResult = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
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

/**
 * POST /leagues/:id/matches
 * Record a match for a league.
 * For singles matches, expects: player1_username, player2_username, player1_score, player2_score.
 * For doubles matches, expects: player1_username, player2_username, player3_username, player4_username, team1_score, team2_score.
 * After inserting the match record, updates league_participants stats so the ladder reflects the new match,
 * including updating wins, losses, matches played, last_match, and ratings.
 */
app.post("/leagues/:id/matches", async (req, res) => {
  const leagueId = req.params.id;
  const { match_type } = req.body;
  // Helper function to get user id from username
  const getUserId = async (username) => {
    const result = await db.query("SELECT id FROM users WHERE username = $1", [
      username,
    ]);
    return result.rows[0] ? result.rows[0].id : null;
  };

  try {
    if (match_type === "doubles") {
      const {
        player1_username,
        player2_username,
        player3_username,
        player4_username,
        team1_score,
        team2_score,
      } = req.body;
      const player1_id = await getUserId(player1_username);
      const player2_id = await getUserId(player2_username);
      const player3_id = await getUserId(player3_username);
      const player4_id = await getUserId(player4_username);
      if (!player1_id || !player2_id || !player3_id || !player4_id) {
        return res.status(404).json({ error: "One or more players not found" });
      }
      let winner_team = null;
      if (team1_score > team2_score) winner_team = "team1";
      else if (team2_score > team1_score) winner_team = "team2";

      // Insert the doubles match record
      const matchResult = await db.query(
        `INSERT INTO league_matches 
         (league_id, match_type, player1_id, player2_id, player3_id, player4_id, team1_score, team2_score, winner_team)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          leagueId,
          match_type,
          player1_id,
          player2_id,
          player3_id,
          player4_id,
          team1_score,
          team2_score,
          winner_team,
        ]
      );

      // Update league_participants: increment matches_played and update last_match for all four players
      await db.query(
        `UPDATE league_participants
         SET matches_played = matches_played + 1, last_match = NOW()
         WHERE league_id = $1 AND user_id IN ($2, $3, $4, $5)`,
        [leagueId, player1_id, player2_id, player3_id, player4_id]
      );

      // Update wins/losses and ratings based on winner_team
      if (winner_team === "team1") {
        await db.query(
          `UPDATE league_participants
           SET wins = wins + 1, rating = rating + 10
           WHERE league_id = $1 AND user_id IN ($2, $3)`,
          [leagueId, player1_id, player2_id]
        );
        await db.query(
          `UPDATE league_participants
           SET losses = losses + 1, rating = rating - 10
           WHERE league_id = $1 AND user_id IN ($2, $3)`,
          [leagueId, player3_id, player4_id]
        );
      } else if (winner_team === "team2") {
        await db.query(
          `UPDATE league_participants
           SET wins = wins + 1, rating = rating + 10
           WHERE league_id = $1 AND user_id IN ($2, $3)`,
          [leagueId, player3_id, player4_id]
        );
        await db.query(
          `UPDATE league_participants
           SET losses = losses + 1, rating = rating - 10
           WHERE league_id = $1 AND user_id IN ($2, $3)`,
          [leagueId, player1_id, player2_id]
        );
      }
      // Optionally: more refined rating algorithm here
      return res.status(201).json(matchResult.rows[0]);
    } else {
      // Singles match
      const {
        player1_username,
        player2_username,
        player1_score,
        player2_score,
      } = req.body;
      const player1_id = await getUserId(player1_username);
      const player2_id = await getUserId(player2_username);
      if (!player1_id || !player2_id) {
        return res.status(404).json({ error: "One or both players not found" });
      }
      let winner_id = null;
      if (player1_score > player2_score) winner_id = player1_id;
      else if (player2_score > player1_score) winner_id = player2_id;

      // Insert the singles match record
      const matchResult = await db.query(
        `INSERT INTO league_matches 
         (league_id, match_type, player1_id, player2_id, player1_score, player2_score, winner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          leagueId,
          match_type,
          player1_id,
          player2_id,
          player1_score,
          player2_score,
          winner_id,
        ]
      );

      // Update league_participants for both players
      await db.query(
        `UPDATE league_participants
         SET matches_played = matches_played + 1, last_match = NOW()
         WHERE league_id = $1 AND user_id IN ($2, $3)`,
        [leagueId, player1_id, player2_id]
      );

      if (winner_id) {
        await db.query(
          `UPDATE league_participants
           SET wins = wins + 1, rating = rating + 10
           WHERE league_id = $1 AND user_id = $2`,
          [leagueId, winner_id]
        );
        const loser_id = winner_id === player1_id ? player2_id : player1_id;
        await db.query(
          `UPDATE league_participants
           SET losses = losses + 1, rating = rating - 10
           WHERE league_id = $1 AND user_id = $2`,
          [leagueId, loser_id]
        );
      }
      // Optionally: refined rating calculation
      return res.status(201).json(matchResult.rows[0]);
    }
  } catch (err) {
    console.error("Error in POST /leagues/:id/matches:", err);
    return res.status(500).json({ error: "Failed to record match" });
  }
});

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
        ORDER BY lm.created_at DESC`,
      [leagueId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /leagues/:id/matches:", err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

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
      last_match: p.last_match,
    }));
    res.json(ladder);
  } catch (err) {
    console.error("Error in GET /leagues/:id/ladder:", err);
    res.status(500).json({ error: "Failed to fetch ladder" });
  }
});

app.patch("/users/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const { username, summary, home_court } = req.body;
    const result = await db.query(
      `UPDATE users 
         SET username = COALESCE($1, username),
             summary = COALESCE($2, summary),
             home_court = COALESCE($3, home_court)
       WHERE id = $4 
       RETURNING id, username, summary, home_court`,
      [username, summary, home_court, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in PATCH /users/:id:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// =================================================
// Start the Server
// =================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
