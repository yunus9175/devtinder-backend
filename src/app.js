// Import the express library
const express = require("express");
const connectDB = require("./config/database");
const User = require("./models/user");

// Create an instance of the express application
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Create a new user
app.post("/signup", async (req, res) => {
    try {
        // Create a new user
        const user = new User(req.body);
        await user.save();
        res.status(201).json({ message: "User created successfully", user: user });
    } catch (error) {
        res.status(500).json({ message: "User creation failed", error: error.message });
    }
});

// Get user by email
app.get("/userbyemail", async (req, res) => {
    try {
        // body email
        const email = req.body.email;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "User not found with this email" });
        }
        res.status(200).json({ user: user });
    } catch (error) {
        res.status(500).json({ message: "User retrieval failed with this email", error: error.message });
    }
});
// Get all users
app.get("/feed", async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json({ users: users, total: users.length });
    } catch (error) {
        res.status(500).json({ message: "Users retrieval failed", error: error.message });
    }
});

// Delete a user by id
app.delete("/user/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await User.findByIdAndDelete(id);

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "User deletion failed", error: error.message });
    }
});

// Update a user by id
app.patch("/user/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = req.body;

        const result = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, returnDocument: "after" });

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User updated successfully", updatedFields: updateData });
    } catch (error) {
        res.status(500).json({ message: "User update failed", error: error.message });
    }
});


connectDB().then(() => {
    console.log("MongoDB connected");
    // Start the server on port 3000
    app.listen(8080, () => {
        console.log("Server is running on port 8080");
    });
}).catch((error) => {
    console.log("MongoDB connection error:", error);
});
