const mongoose = require("mongoose");

async function tryConnect(uri, opts = {}) {
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: opts.timeout || 5000 });
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err };
    }
}

const connectDB = async () => {
    const primaryUri = process.env.MONGODB_URI;
    if (!primaryUri) {
        throw new Error('MONGODB_URI is not set in .env');
    }

    // Try primary (Atlas)
    const primary = await tryConnect(primaryUri, { timeout: 8000 });
    if (primary.ok) {
        return;
    }



    // Dev fallback: try localhost Mongo
    if ((process.env.NODE_ENV || 'development') === 'development') {
        const local = await tryConnect('mongodb://localhost:27017/devTinder', { timeout: 3000 });
        if (local.ok) {
            return;
        }
    }

    // Connection failed
    throw new Error("MongoDB connection error: " + (primary.error && primary.error.message));
};

module.exports = connectDB;