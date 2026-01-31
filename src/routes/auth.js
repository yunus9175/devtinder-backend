// Import custom validation helper functions
const { validateSignupData } = require("../utils/validation");
// Import validator library for additional checks (email, etc.)
const validator = require("validator");
// Import bcrypt to hash and compare passwords securely
const bcrypt = require("bcrypt");
const express = require('express');
const User = require("../models/user");
const router = express.Router()
// Create a new user (Signup API)
router.post("/signup", async (req, res) => {
    try {
        // Validate incoming signup data (name, email, password strength, etc.)
        validateSignupData(req);
        // Destructure required fields from request body
        const { firstName, lastName, email, password } = req.body;
        // Hash the plain-text password before saving to DB (never store plain passwords)
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create a new User document with hashed password (password: hashedPassword so we never store plain text)
        const user = new User({ firstName, lastName, email, password: hashedPassword });
        // Save user in MongoDB
        await user.save();

        // Convert Mongoose document to plain object and remove password before sending to client
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        res.status(201).json({ message: "User created successfully", user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});

// Login existing user (Login API)
router.post("/login", async (req, res) => {
    try {
        // Extract email and password from request body
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Validate email format before hitting DB (fail fast; no need to query if format is invalid)
        if (!validator.isEmail(email)) {
            return res.status(401).json({ message: "Invalid email" });
        }

        // Normalize email (lowercase and trim) to match schema
        const normalizedEmail = email.toLowerCase().trim();

        // Find user by normalized email in DB
        const user = await User.findOne({ email: normalizedEmail });

        // If user not found, return generic invalid credentials message
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Compare plain password with stored hash using User instance method
        const isPasswordValid = await user.getValidPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Remove password before sending user data back
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        // JWT: Generate token via User instance method (payload: _id, expires in 10d)
        const token = user.getJWT();
        // JWT: Set token in cookie so client sends it on protected routes; cookie expires in 8 hours
        res.cookie("token", token, {
            expires: new Date(Date.now() + 8 * 3600000),
        });
        // Send success response with user data (no password)
        res.status(200).json({ message: "Login successful", user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

router.post("/logout", async (req, res) => {
    res.cookie('token', null, {
        expires: new Date(Date.now())
    });
    res.status(200).json({ message: "Logout successful", });
})
module.exports = router 