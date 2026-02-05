// Load .env early (safe: .env is gitignored)
require('dotenv').config();

// Import the express library (framework to build APIs)
const express = require("express");
// Import MongoDB connection helper
const connectDB = require("./config/database");
// Import route modules (auth: signup, login, logout; profile: get/update profile; request: connection requests)
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
// Import cookie-parser to read cookies from incoming requests (req.cookies)
const cookieParser = require("cookie-parser");
// Import cors for handling Cross-Origin Resource Sharing
const cors = require("cors");

// Create an instance of the express application (our server)
const app = express();

// Global middleware to parse incoming JSON request bodies into req.body
app.use(express.json());
// Middleware to parse Cookie header and populate req.cookies
app.use(cookieParser());
// Configure CORS and API base path from environment (API_BASE_URL or API_BASE_PATH)
const apiBaseUrl = process.env.API_BASE_URL || '';
let apiBasePath = process.env.API_BASE_PATH || '';
try {
  if (!apiBasePath && apiBaseUrl) {
    // derive path from absolute URL (e.g. http://host:port/api/ -> /api)
    const parsed = new URL(apiBaseUrl);
    apiBasePath = parsed.pathname.replace(/\/$/, '');
  }
} catch (e) {
  // ignore parse errors and fall back to provided API_BASE_PATH or '/'
  apiBasePath = apiBasePath || '';
}
if (!apiBasePath) apiBasePath = ''; // empty => mount at root

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : (apiBaseUrl ? new URL(apiBaseUrl).origin : 'http://localhost:3000');

app.use(cors({ origin: corsOrigin, credentials: (process.env.CORS_CREDENTIALS === 'false') ? false : true }));

// Helper to mount routers correctly when apiBasePath is empty or '/'
const mountAt = (routePath) => (apiBasePath ? `${apiBasePath}${routePath}` : routePath);

// Mount route handlers under the configured base path
app.use(mountAt('/'), authRouter);
app.use(mountAt('/'), profileRouter);
app.use(mountAt('/'), requestRouter);
app.use(mountAt('/'), userRouter);

// ===========================
// SERVER & DATABASE STARTUP
// ===========================
// Connect to MongoDB and then start the Express server
connectDB().then(() => {
    console.log("MongoDB connected");
    const PORT = Number(process.env.PORT) || 8080;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`API base path: '${apiBasePath || '/'}'`);
        if (process.env.API_BASE_URL) console.log(`Configured API_BASE_URL: ${process.env.API_BASE_URL}`);
    });
}).catch((error) => {
    console.log("MongoDB connection error:", error);
});
