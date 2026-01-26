// Import the Schema and model from mongoose
const {Schema, model} = require("mongoose");

// Create a new schema for the user
// The schema is a blueprint for the user collection in the database
// The schema defines the structure of the documents in the collection
// The schema defines the fields and their types
// The schema defines the constraints on the fields
// The schema defines the default values for the fields
// The schema defines the indexes for the fields
// The schema defines the validators for the fields
// The schema defines the virtuals for the fields
// The schema defines the methods for the fields
const userSchema = new Schema({
    // First name of the user
    firstName: {
        type: String,
        required: true
    },
    // Last name of the user
    lastName: {
        type: String,
        required: true
    },
    // Email of the user
    email: {
        type: String,
        required: true
    },
    // Password of the user
    password: {
        type: String,
        required: true
    },
    // Age of the user
    age: {
        type: Number,
        required: true
    },
    // Gender of the user
    gender: {
        type: String,
        required: true
    },
    // Created at date of the user
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Updated at date of the user
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create a new model for the user
const User = model("User", userSchema);

// Export the user model
module.exports = User;