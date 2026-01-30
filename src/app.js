// Import the express library
const express = require("express");
const connectDB = require("./config/database");
const User = require("./models/user");
const Todo = require("./models/todo");
const { validateSignupData, validateTodoData } = require("./utils/validation");
const validator = require("validator");
const bcrypt = require("bcrypt");
// Create an instance of the express application
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Create a new user
app.post("/signup", async (req, res) => {
    try {
        // helper function for validations
        validateSignupData(req);
        const { firstName, lastName, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ firstName, lastName, email, password: hashedPassword });
        await user.save();

        // Return user without password
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        res.status(201).json({ message: "User created successfully", user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Normalize email (lowercase and trim) to match schema
        const normalizedEmail = email.toLowerCase().trim();

        // Find user by normalized email
        const user = await User.findOne({ email: normalizedEmail });

        if (!validator.isEmail(email)) {
             return res.status(401).json({ message: "Invalid email" });
        }

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Return user without password
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        res.status(200).json({
            message: "Login successful",
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
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
    // body id and updateData
    const id = req.params.id;
    const updateData = req.body;

    try {
        const ALLOWED_UPDATES = ["firstName", "lastName", "email", "password", "age", "gender", "profilePicture", "about", "skills"];
        const isValidUpdate = Object.keys(updateData).every(key => ALLOWED_UPDATES.includes(key));
        if (!isValidUpdate) {
            return res.status(400).json({ message: "Invalid update data" });
        }
        if (updateData?.skills?.length > 10) {
            return res.status(400).json({ message: "Skills count cannot be more than 10" });
        }

        const result = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, returnDocument: "after" });

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User updated successfully", updatedFields: updateData });
    } catch (error) {
        res.status(500).json({ message: "User update failed", error: error.message });
    }
});

app.post("/todo", async (req, res) => {
    try {
        // helper function for validations
        validateTodoData(req)
        const { title } = req.body;
        const duplicateData = await Todo.findOne({ title })
        if (duplicateData) {
            throw new Error("Duplicate data");
        }
        const todo = new Todo({ title })
        await todo.save();
        res.status(200).json({ message: "Todo item added Successfully", todo })
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})

app.patch("/todo/:id", async (req, res) => {
    try {
        // helper function for validations
        validateTodoData(req)
        const id = req.params.id;
        const updateReq = req.body
        const updateTodo = await Todo.findByIdAndUpdate(id, updateReq, { runValidators: true, returnDocument: "after" })
        res.status(200).json({ message: "Todo item updated", updateTodo })

    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})

app.delete("/todo/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const deleteTodo = await Todo.findByIdAndDelete(id)
        if (!deleteTodo) {
            return res.status(404).json({ message: "Todo not found" });
        }

        if (deleteTodo.deletedCount === 0) {
            return res.status(404).json({ message: "Todo not found" });
        }

        res.status(200).json({ message: "Todo item deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})

//get all todos

app.get("/todo", async (req, res) => {
    try {
        const todos = await Todo.find({});
        if (!todos) {
            return res.status(404).json({ message: "Data not found" });
        }
        res.status(200).json({ message: "Data fetched successfull", Todos: todos });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})


//find by completed/uncompleted todos
app.get("/todo/status", async (req, res) => {
    try {
        const completed=req.query.completed
      const TodosByStatus= await Todo.find({completed})
      if (!TodosByStatus) {
            return res.status(404).json({ message: "Data not found" });
        }
        res.status(200).json({ message: "Data fetched successfull", Todos: TodosByStatus });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
})
connectDB().then(() => {
    console.log("MongoDB connected");
    // Start the server on port 3000
    app.listen(8080, () => {
        console.log("Server is running on port 8080");
    });
}).catch((error) => {
    console.log("MongoDB connection error:", error);
});
