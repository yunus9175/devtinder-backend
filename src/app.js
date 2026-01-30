// Import the express library (framework to build APIs)
const express = require("express");
// Import MongoDB connection helper
const connectDB = require("./config/database");
// Import Mongoose models
const User = require("./models/user");
const Todo = require("./models/todo");
// Import custom validation helper functions
const { validateSignupData, validateTodoData } = require("./utils/validation");
// Import validator library for additional checks (email, etc.)
const validator = require("validator");
// Import bcrypt to hash and compare passwords securely
const bcrypt = require("bcrypt");
// Import cookie-parser to read cookies from incoming requests (req.cookies)
const cookieParser = require("cookie-parser");
// Import auth middleware to protect routes (verifies JWT from cookie, sets req.user)
const { userAuth } = require("./middlewares/auth");

// Create an instance of the express application (our server)
const app = express();

// Global middleware to parse incoming JSON request bodies into req.body
app.use(express.json());
// Middleware to parse Cookie header and populate req.cookies
app.use(cookieParser());

// ===========================
// AUTH / USER ROUTES
// ===========================

// Create a new user (Signup API)
app.post("/signup", async (req, res) => {
    try {
        // Validate incoming signup data (name, email, password strength, etc.)
        validateSignupData(req);
        // Destructure required fields from request body
        const { firstName, lastName, email, password } = req.body;
        // Hash the plain-text password before saving to DB (never store plain passwords)
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create a new User document with hashed password
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
app.post("/login", async (req, res) => {
    try {
        // Extract email and password from request body
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Normalize email (lowercase and trim) to match schema
        const normalizedEmail = email.toLowerCase().trim();

        // Find user by normalized email in DB
        const user = await User.findOne({ email: normalizedEmail });

        // Extra safety: validate email format (though signup already enforces this)
        if (!validator.isEmail(email)) {
            return res.status(401).json({ message: "Invalid email" });
        }

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

// Get current user profile (protected: userAuth runs first, then req.user is set)
app.get("/profile", userAuth, async (req, res) => {
    try {
        // userAuth middleware already attached logged-in user to req.user
        const user = req.user;
        res.status(200).json({
            message: "Successfully get profile data",
            data: user,
        });
    } catch (error) {
        // Handle JWT errors (expired, invalid signature, etc.)
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
        }
        res.status(500).json({ message: "Error", error: error.message });
    }
});

// Send connection request (protected: requires login; uses req.user from userAuth)
app.post("/sendConnectionRequest", userAuth, async (req, res) => {
    try {
        const { firstName, lastName } = req.user;
        res.status(200).json({ message: "Request has been sent to " + firstName + " " + lastName });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});

// Get single user by email (protected: userAuth; body: { email })
app.get("/userbyemail", userAuth, async (req, res) => {
    try {
        // Email expected in request body
        const email = req.body.email;
        // Find user by email
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "User not found with this email" });
        }
        res.status(200).json({ user: user });
    } catch (error) {
        res.status(500).json({ message: "User retrieval failed with this email", error: error.message });
    }
});

// Get all users – Feed API (protected: userAuth)
app.get("/feed", userAuth, async (req, res) => {
    try {
        // Fetch all user documents from DB
        const users = await User.find();
        res.status(200).json({ users: users, total: users.length });
    } catch (error) {
        res.status(500).json({ message: "Users retrieval failed", error: error.message });
    }
});

// Delete a user by id (protected: userAuth)
app.delete("/user/:id", userAuth, async (req, res) => {
    try {
        // Get user id from route parameter
        const id = req.params.id;
        // Attempt to delete user by id
        const result = await User.findByIdAndDelete(id);

        // If nothing deleted, return 404
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "User deletion failed", error: error.message });
    }
});

// Update a user by id – partial update (protected: userAuth)
app.patch("/user/:id", userAuth, async (req, res) => {
    // Extract id and updateData from request
    const id = req.params.id;
    const updateData = req.body;

    try {
        // Only allow these fields to be updated
        const ALLOWED_UPDATES = ["firstName", "lastName", "email", "password", "age", "gender", "profilePicture", "about", "skills"];
        // Ensure every key in updateData is allowed
        const isValidUpdate = Object.keys(updateData).every(key => ALLOWED_UPDATES.includes(key));
        if (!isValidUpdate) {
            return res.status(400).json({ message: "Invalid update data" });
        }
        // Business rule: limit number of skills
        if (updateData?.skills?.length > 10) {
            return res.status(400).json({ message: "Skills count cannot be more than 10" });
        }

        // Update user with validation and return updated document
        const result = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, returnDocument: "after" });

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User updated successfully", updatedFields: updateData });
    } catch (error) {
        res.status(500).json({ message: "User update failed", error: error.message });
    }
});

// ===========================
// TODO ROUTES
// ===========================

// Create a new todo item
app.post("/todo", async (req, res) => {
    try {
        // Validate todo data (title, etc.)
        validateTodoData(req)
        // Extract title from body
        const { title } = req.body;
        // Check for duplicate title
        const duplicateData = await Todo.findOne({ title })
        if (duplicateData) {
            throw new Error("Duplicate data");
        }
        // Create new Todo document
        const todo = new Todo({ title })
        // Save todo in DB
        await todo.save();
        res.status(200).json({ message: "Todo item added Successfully", todo })
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})

// Update a todo item by id
app.patch("/todo/:id", async (req, res) => {
    try {
        // Validate todo data
        validateTodoData(req)
        // Extract id from route and update data from body
        const id = req.params.id;
        const updateReq = req.body
        // Update todo and run validators
        const updateTodo = await Todo.findByIdAndUpdate(id, updateReq, { runValidators: true, returnDocument: "after" })
        res.status(200).json({ message: "Todo item updated", updateTodo })

    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})

// Delete a todo item by id
app.delete("/todo/:id", async (req, res) => {
    try {
        // Get todo id from route parameter
        const id = req.params.id;
        // Try to delete todo
        const deleteTodo = await Todo.findByIdAndDelete(id)
        if (!deleteTodo) {
            return res.status(404).json({ message: "Todo not found" });
        }

        // This extra check is redundant because findByIdAndDelete returns the deleted document,
        // but kept here for demonstration.
        if (deleteTodo.deletedCount === 0) {
            return res.status(404).json({ message: "Todo not found" });
        }

        res.status(200).json({ message: "Todo item deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})

// Get all todos
app.get("/todo", async (req, res) => {
    try {
        // Fetch all todos
        const todos = await Todo.find({});
        if (!todos) {
            return res.status(404).json({ message: "Data not found" });
        }
        res.status(200).json({ message: "Data fetched successfull", Todos: todos });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})


// Get todos filtered by completion status (completed / not completed)
app.get("/todo/status", async (req, res) => {
    try {
        // Read completed flag from query string (?completed=true/false)
        const completed = req.query.completed
        // Find todos matching the completed status
        const TodosByStatus = await Todo.find({ completed })
        if (!TodosByStatus) {
            return res.status(404).json({ message: "Data not found" });
        }
        res.status(200).json({ message: "Data fetched successfull", Todos: TodosByStatus });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})

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
