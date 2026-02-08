// Require mongoose to interact with MongoDB from Node.js
const mongoose = require("mongoose");

// tryConnect: attempt a single connection and return a plain result object
// - uri: MongoDB connection string
// - opts: optional settings (supports `timeout` to control serverSelectionTimeoutMS)
async function tryConnect(uri, opts = {}) {
    try {
        // Use mongoose.connect() with a short server selection timeout for fast failure
        await mongoose.connect(uri, { serverSelectionTimeoutMS: opts.timeout || 5000 });
        // Return structured success so callers can branch without throwing here
        return { ok: true };
    } catch (err) {
        // Return the error instead of throwing to allow aggregated attempts
        return { ok: false, error: err };
    }
}

// One-time fix: drop old conversations index and backfill participantKey so getOrCreateDirectConversation works
async function fixConversationsIndex() {
    const coll = mongoose.connection.db.collection('conversations');
    try {
        await coll.dropIndex('type_1_participants_1');
    } catch (e) {
        if (e.code !== 27 && e.codeName !== 'IndexNotFound' && !/index not found/i.test(e.message)) throw e;
    }
    const Conversation = require('../models/conversation');
    const direct = await Conversation.find({ type: 'direct', $or: [{ participantKey: null }, { participantKey: { $exists: false } }] }).lean();
    for (const c of direct) {
        const ids = (c.participants || []).map((p) => p.toString()).sort((a, b) => a.localeCompare(b));
        if (ids.length === 2) {
            await coll.updateOne({ _id: c._id }, { $set: { participantKey: ids.join('_') } });
        }
    }
}

// connectDB: main startup function used by the app to ensure a working DB connection
const connectDB = async () => {
    // Read primary DB connection string from environment (.env or host env)
    const primaryUri = process.env.MONGODB_URI;

    // If no URI is configured, fail fast — this is a deployment/configuration issue
    if (!primaryUri) {
        throw new Error('MONGODB_URI is not set in .env');
    }

    // Attempt to connect to the primary (production) DB first (e.g. Atlas)
    const primary = await tryConnect(primaryUri, { timeout: 8000 });

    // If primary succeeded, run conversations index fix and return
    if (primary.ok) {
        await fixConversationsIndex();
        return;
    }

    // Primary failed — surface the reason in logs for debugging
    console.warn('Primary MongoDB connection failed:', primary.error && primary.error.message);

    // Development fallback: when running locally, try a local MongoDB instance
    // This improves DX by allowing the app to start without Atlas during development
    if ((process.env.NODE_ENV || 'development') === 'development') {
        const local = await tryConnect('mongodb://localhost:27017/devTinder', { timeout: 3000 });
        if (local.ok) {
            await fixConversationsIndex();
            console.log('MongoDB connected (local development)');
            return;
        }
        // If the local fallback also failed, log an actionable hint
        console.warn('Local dev fallback failed — consider running: docker run -d --name mongodev -p 27017:27017 mongo:6');
    }

    // If we reach here, all connection attempts failed — throw an error with the original message
    throw new Error("MongoDB connection error: " + (primary.error && primary.error.message));
};

// Export the connectDB function for use in the application startup sequence
module.exports = connectDB;