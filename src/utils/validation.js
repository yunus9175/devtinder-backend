const validator = require("validator");

const validateSignupData = (req) => {

    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName) {
        throw new Error("Name is not valid");
    }
    if (!validator.isEmail(email)) {
        throw new Error("Invalid email");
    }
    if (!validator.isStrongPassword(password)) {
        throw new Error("Password is not strong");
    }
}

const validateTodoData = async (req) => {
    const { title } = req.body

    if (!title) {
        throw new Error("Title is not valid");
    }
    if (title.length > 100) {
        throw new Error("Title should not be greater that 100 chars");
    }
}

const validateEditProfilrData = (req) => {
    const updateData = req.body;
    // Only allow these fields to be updated
    console.log({ updateData })
    const ALLOWED_UPDATES = ["firstName", "lastName", "password", "age", "gender", "profilePicture", "about", "skills"];
    // Ensure every key in updateData is allowed
    const isValidUpdate = Object.keys(updateData).every(key => ALLOWED_UPDATES.includes(key));

    if (!isValidUpdate) {
        throw new Error("Invalid update data");
    }
    // Business rule: limit number of skills
    if (updateData?.skills?.length > 10) {
        throw new Error("Skills count cannot be more than 10");
    }
    if (updateData?.profilePicture && !validator.isURL(updateData?.profilePicture)) {
        throw new Error("Profile URL not valid");
    }
}

const validateProfilePassword = (req) => {
    const { currentPassword, newPassword } = req.body;
    const updateData = req.body;
    const ALLOWED_UPDATES = ["currentPassword", "newPassword"];
    // Ensure every key in updateData is allowed
    const isValidUpdate = Object.keys(updateData).every(key => ALLOWED_UPDATES.includes(key));

    if (!isValidUpdate) {
        throw new Error("Invalid update data");
    }
    if (!currentPassword || !newPassword) {
        throw new Error("Current password and new password are required");
    }
    if (!validator.isStrongPassword(newPassword) && !validator.isStrongPassword(currentPassword)) {
        throw new Error("Password is not strong or current password is not strong");
    }
};
module.exports = { validateSignupData, validateTodoData, validateEditProfilrData, validateProfilePassword };