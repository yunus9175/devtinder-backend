const { Schema, model } = require("mongoose");

const todoSchema = new Schema({
    title: {
        type: String,
        unique: true,
        required: true,
        minLength: 3,
        maxLength: 100
    },
    completed: {
        type: Boolean,
        default: false
    }
})

const Todo = model("Todo", todoSchema);
module.exports = Todo;