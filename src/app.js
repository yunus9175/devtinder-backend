// Import the express library
const express = require("express");
const connectDB = require("./config/database");
const User = require("./models/user");

// Create an instance of the express application
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

app.post("/signup", async (req, res) => {
    try {
        const { firstName, lastName, email, password, age, gender } = req.body;
        const user = new User({ firstName, lastName, email, password, age, gender });
        // Create a new user
        // const user = new User({ firstName: "Virat", lastName: "Kohli", email: "virat.kohli@example.com", password: "password", age: 30, gender: "male" });
        await user.save();
        res.status(201).json({ message: "User created successfully", user: user });
    } catch (error) {
        res.status(500).json({ message: "User creation failed", error: error.message });
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
