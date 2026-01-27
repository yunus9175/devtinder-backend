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
        required: true,
        minlength: 3,
        maxlength: 50
    },
    // Last name of the user (optional)
    lastName: {
        type: String,
        minlength: 3,
        maxlength: 50
    },
    // Email of the user
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        required: true,
    },
    // Password of the user
    password: {
        type: String,
        required: true
    },
    // Age of the user
    age: {
        type: Number,
        required: true,
        min: 18,
    },
    // Gender of the user
    gender: {
        type: String,
        required: true,
        // enum: ["male", "female", "other"],
        validate: {
            validator: function(v) {
                return v === "male" || v === "female" || v === "other";
            },
            message: "Gender must be male, female or other"
        }

    },
    profilePicture: {
        type: String,
        default: "https://37assets.37signals.com/svn/765-default-avatar.png"
    },
    about: {
        type: String,
        default: "I am a developer who loves to code and build things."
    },
    skills: {
        type: [String],
    },
},{timestamps:true});

// Create a new model for the user
const User = model("User", userSchema);

// Export the user model
module.exports = User;