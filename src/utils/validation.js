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

const validateTodoData =async (req) => {
    const { title } = req.body

    if (!title) {
        throw new Error("Title is not valid");
    }
    if (title.length > 100) {
        throw new Error("Title should not be greater that 100 chars");
    }
}
module.exports = { validateSignupData, validateTodoData };