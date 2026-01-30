// Auth middleware: protect routes by verifying JWT from cookie and attaching user to req.

const jwt = require("jsonwebtoken");
const User = require("../models/user");

// userAuth: run before protected routes. Reads token from cookie, verifies JWT, loads user, sets req.user.
// If no token or invalid/expired token, responds with 401 and does not call next().
const userAuth = async (req, res, next) => {
    try {
        // Read JWT from cookie (set by client after login)
        const { token } = req.cookies;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: please login first" });
        }
        // Verify token and decode payload (throws if expired or invalid; use same secret as sign)
        const decodedToken = jwt.verify(token, "DEVTINDE@ADVANCECOURS123");
        const { _id } = decodedToken;
        // Load user from DB so route handlers can use req.user
        const findLoggedInUser = await User.findOne({ _id });
        if (!findLoggedInUser) {
            return res.status(401).json({ message: "Unauthorized: user not found" });
        }
        // Attach user to request for use in route handlers
        req.user = findLoggedInUser;
        next();
    } catch (error) {
        // Invalid or expired token
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
        }
        res.status(400).json({ message: "Error", error: error.message });
    }
};

module.exports = { userAuth };