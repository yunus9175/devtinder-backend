// User routes: connection list and received requests (all protected by userAuth)

const express = require("express");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const router = express.Router();

// Fields to return when populating user refs (no password, minimal profile)
const USER_POPULATE_FIELDS = "firstName lastName profilePicture age about skills";

// ===========================
// GET /user/connection – list all accepted connections for the logged-in user
// ===========================
router.get("/user/connection", userAuth, async (req, res) => {
    try {
        // Logged-in user's id (they are either sender or receiver in each row)
        const { _id: toUserId } = req.user;

        // Find all accepted requests where logged-in user is either sender or receiver
        const connectRequest = await ConnectionRequest.find({
            $or: [
                { toUserId, status: "accepted" },
                { fromUserId: toUserId, status: "accepted" },
            ],
        })
            .populate("fromUserId", USER_POPULATE_FIELDS)
            .populate("toUserId", USER_POPULATE_FIELDS);

        // For each row, return the *other* user (the connection): if I am fromUserId, return toUserId; else return fromUserId
        const data = connectRequest.map((row) => {
            if (row.fromUserId._id.toString() === toUserId.toString()) {
                return row.toUserId;
            }
            return row.fromUserId;
        });

        res.status(200).json({ message: "All accepted request fetched", data });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});

// ===========================
// GET /user/requests/received – list pending requests sent *to* the logged-in user (status: interested)
// ===========================
router.get("/user/requests/received", userAuth, async (req, res) => {
    try {
        // Logged-in user is the receiver of these requests
        const { _id: toUserId } = req.user;

        // Find requests where I am the receiver and status is still "interested" (pending)
        const connectRequest = await ConnectionRequest.find({
            toUserId,
            status: "interested",
        }).populate("fromUserId", "firstName lastName profilePicture age about skills");

        // connectRequest is always an array (find returns [] if none); send it as data
        res.status(200).json({ message: "All pending request fetched", data: connectRequest });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});

module.exports = router;