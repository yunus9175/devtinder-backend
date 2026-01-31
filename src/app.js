// Import the express library (framework to build APIs)
const express = require("express");
// Import MongoDB connection helper
const connectDB = require("./config/database");
// Import route modules (auth: signup, login, logout; profile: get/update profile; request: connection requests)
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
// Import cookie-parser to read cookies from incoming requests (req.cookies)
const cookieParser = require("cookie-parser");

// Create an instance of the express application (our server)
const app = express();

// Global middleware to parse incoming JSON request bodies into req.body
app.use(express.json());
// Middleware to parse Cookie header and populate req.cookies
app.use(cookieParser());

// Mount route handlers: each router defines its own paths (e.g. /login, /profile) under the given base path
app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);

// ===========================
// SERVER & DATABASE STARTUP
// ===========================
// Connect to MongoDB and then start the Express server
connectDB().then(() => {
    console.log("MongoDB connected");
    // Start the server on port 3000
    app.listen(8080, () => {
        console.log("Server is running on port 8080");
    });
}).catch((error) => {
    console.log("MongoDB connection error:", error);
});
