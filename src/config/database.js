const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://yunusdev:Fm68prm7iWHHQNgc@namastenode.irxd56u.mongodb.net/devTinder");
    } catch (error) {
        throw new Error("MongoDB connection error:", error);
    }
}   

module.exports = connectDB;