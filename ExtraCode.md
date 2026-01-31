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
