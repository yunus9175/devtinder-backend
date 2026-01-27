const validator = require("validator");
const validateSignupData = (req) => {

    const { firstName, lastName, email, password } = req.body;
    if(!firstName || !lastName){
        throw new Error("Name is not valid");
    }
    if(!validator.isEmail(email)){
        throw new Error("Invalid email");
    }
    if(!validator.isStrongPassword(password)){
        throw new Error("Password is not strong");
    }
}

module.exports = { validateSignupData };