// Load environment variables from .env into process.env (must run before using env vars; .env is gitignored)
require('dotenv').config();

// Import Express: web framework used to build the API (routes, middleware, server)
const express = require("express");
// Import database helper: connects to MongoDB and exports connectDB()
const connectDB = require("./config/database");
// Import route modules: each router handles a group of related endpoints
const authRouter = require("./routes/auth");           // signup, login, logout
const profileRouter = require("./routes/profile");     // get/update user profile
const requestRouter = require("./routes/request");    // connection requests (e.g. likes, matches)
const userRouter = require("./routes/user");          // user listing, search, etc.
const rozarPayRouter = require("./routes/razorPay");  // payment create, webhook
const messagesRouter = require("./routes/messages"); // chat message history, mark read
const conversationsRouter = require("./routes/conversations"); // get/create direct conversation
// Import cookie-parser: parses Cookie header and puts result in req.cookies
const cookieParser = require("cookie-parser");
// Import CORS: configures which origins can call this API (Cross-Origin Resource Sharing)
const cors = require("cors");

const http = require('http');
const { initializeSocket } = require('./utils/socket');

// Create the Express app instance (the main application object)
const app = express();

// --- API base path: optional prefix for all routes (e.g. /api so routes become /api/login, /api/profile) ---
// Read base URL from env (e.g. https://example.com/api)
const apiBaseUrl = process.env.API_BASE_URL || '';
// Read base path from env, or leave empty to use no prefix
let apiBasePath = process.env.API_BASE_PATH || '';
try {
    // If only API_BASE_URL is set, derive base path from it (e.g. https://example.com/api/ -> api)
    if (!apiBasePath && apiBaseUrl) {
        const parsed = new URL(apiBaseUrl);
        apiBasePath = parsed.pathname.replace(/\/$/, '');  // remove trailing slash
    }
} catch (e) {
    // If URL parsing fails, keep existing apiBasePath or empty
    apiBasePath = apiBasePath || '';
}
// Ensure we have a string (empty string means no prefix)
if (!apiBasePath) apiBasePath = '';
// Helper: given a route path, returns path with base prefix (e.g. mountAt('/login') -> '/api/login' if apiBasePath is '/api')
const mountAt = (routePath) => (apiBasePath ? `${apiBasePath}${routePath}` : routePath);

// --- Global middleware (runs for every request in order) ---
// Parse JSON request body and put result in req.body (Content-Type: application/json)
app.use(express.json());
// Parse Cookie header and put key-value pairs in req.cookies
app.use(cookieParser());

// --- CORS: which origins are allowed to call this API (and Socket.IO) ---
// Set CORS_ORIGIN to your frontend origin (e.g. http://localhost:5173 for Vite). Default: 5173 for dev.
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : (apiBaseUrl ? new URL(apiBaseUrl).origin : 'http://localhost:5173');
// Enable CORS with that origin; send cookies with cross-origin requests unless CORS_CREDENTIALS is 'false'
app.use(cors({ origin: corsOrigin, credentials: (process.env.CORS_CREDENTIALS === 'false') ? false : true }));

// --- Health / chat status (no auth): so frontend can check backend + Socket.IO are up ---
app.get(mountAt('/health'), (req, res) => {
    res.json({ ok: true, socket: true });
});

// --- Mount route handlers: all under the same base path (e.g. /api) ---
// Each router handles its own paths (e.g. authRouter handles POST /login, /signup, /logout)
app.use(mountAt('/'), authRouter);
app.use(mountAt('/'), profileRouter);
app.use(mountAt('/'), requestRouter);
app.use(mountAt('/'), userRouter);
app.use(mountAt('/'), conversationsRouter);
app.use(mountAt('/'), messagesRouter);
app.use(mountAt('/'), rozarPayRouter);

const server = http.createServer(app);

// Socket.IO path: /socket.io or /api/socket.io when API_BASE_PATH is set (see docs/BACKEND_SOCKET_CHAT.md)
initializeSocket(server, { corsOrigin, basePath: apiBasePath });
// ===========================
// SERVER & DATABASE STARTUP
// ===========================
// Connect to MongoDB first; only start the HTTP server after DB is connected
connectDB().then(() => {
    console.log("MongoDB connected");
    // Port from env or default 8080
    const PORT = Number(process.env.PORT) || 8080;
    // Start listening for HTTP requests
    server.listen(PORT, () => {
        const normalizedBase = (apiBasePath && apiBasePath !== '/') ? apiBasePath.replace(/\/$/, '') : '';
        const socketPath = normalizedBase ? `${normalizedBase}/socket.io` : '/socket.io';
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    // If DB connection fails, log and exit (no server started)
    console.log("MongoDB connection error:", error);
});
