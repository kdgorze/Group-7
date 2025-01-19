const express = require("express");
const app = express();
const routes = require("./routes"); // Import the routes file

// Middleware to parse JSON
app.use(express.json());

// Use the routes defined in routes.js
app.use("/", routes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
