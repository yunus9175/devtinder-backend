// Import the Schema and model from mongoose
const { Schema, model } = require("mongoose");
// Import validator for email/URL/password validation in schema
const validator = require("validator");
// Import bcrypt to compare passwords in instance method (hashing done in route)
const bcrypt = require("bcrypt");
// Import jwt to sign tokens in instance method getJWT
const jwt = require("jsonwebtoken");
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
        validate: {
            validator: function (v) {
                return validator.isEmail(v);
            },
            message: "Invalid email"
        }
    },
    // Password of the user
    password: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return validator.isStrongPassword(v);
            },
            message: "Password is not strong"
        }
    },
    // Age of the user
    age: {
        type: Number,
        min: 18,
    },
    // Gender of the user
    gender: {
        type: String,
        // enum: ["male", "female", "other"],
        validate: {
            validator: function (v) {
                return v === "male" || v === "female" || v === "other";
            },
            message: "Gender must be male, female or other"
        }

    },
    // Profile picture URL (optional; default avatar)
    profilePicture: {
        type: String,
        default: "https://37assets.37signals.com/svn/765-default-avatar.png",
        validate: {
            validator: function (v) {
                return validator.isURL(v);
            },
            message: "Invalid profile picture URL"
        }
    },
    // Short bio (optional; default intro text)
    about: {
        type: String,
        default: "I am a developer who loves to code and build things."
    },
    // List of skills (optional; array of strings)
    skills: {
        type: [String],
    },
}, { timestamps: true });

// Instance method: generate JWT for this user (used after login)
// Payload contains _id; token expires in 10 days. Use env var for secret in production.
userSchema.methods.getJWT = function () {
    const user = this;
    const token = jwt.sign({ _id: user._id }, "DEVTINDE@ADVANCECOURS123", {
        expiresIn: "10d",
    });
    return token;
};

// Instance method: compare plain password with stored hash (used at login)
// Returns true if userInputPassword matches user.password hash.
userSchema.methods.getValidPassword = async function (userInputPassword) {
    const user = this;
    const passwordHash = user.password;
    const isValidPassword = await bcrypt.compare(userInputPassword, passwordHash);
    return isValidPassword;
};
// Create a new model for the user
const User = model("User", userSchema);

// Export the user model
module.exports = User;