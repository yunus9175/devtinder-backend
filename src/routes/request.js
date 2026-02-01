const express = require("express");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");
const router = express.Router();

// ===========================
// Send connection request (protected: userAuth)
// POST /request/send/:status/:toUserId – status: interested | ignored
// ===========================
router.post("/request/send/:status/:toUserId", userAuth, async (req, res) => {
    try {
        const { toUserId, status } = req.params;
        const { _id: fromUserId } = req.user;

        // Only these statuses are allowed when sending a new request
        const ALLOWED_STATUS = ["ignored", "interested"];
        if (!ALLOWED_STATUS.includes(status)) {
            return res.status(400).json({ message: "Invalid status type: " + status });
        }

        // Prevent duplicate: no existing request in either direction (A→B or B→A)
        const existingConnectionRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId, toUserId },
                { fromUserId: toUserId, toUserId: fromUserId },
            ],
        });
        if (existingConnectionRequest) {
            return res.status(400).json({ message: "Connection already Exist!" });
        }

        // Receiver must exist in DB
        const recieverUser = await User.findOne({ _id: toUserId });
        if (!recieverUser) {
            return res.status(400).json({ message: "User not found!" });
        }

        const connectRequest = new ConnectionRequest({
            fromUserId,
            toUserId,
            status,
        });
        await connectRequest.save();

        // Build success message from status and sender/receiver first names
        const senderName = req.user.firstName;
        const receiverName = recieverUser.firstName;
        const statusMessages = {
            interested: `${senderName} has expressed interest in connecting with ${receiverName}!`,
            ignored: `${senderName} has marked the connection with ${receiverName} as ignored.`,
        };
        const message = statusMessages[status] || `${senderName} sent a connection request to ${receiverName} (status: ${status}).`;

        res.status(200).json({ message, data: connectRequest });
    } catch (error) {
        // MongoDB duplicate key (e.g. unique index on fromUserId + toUserId)
        if (error.code === 11000) {
            return res.status(400).json({
                status: "Error",
                message: "The request connection is already exist.",
            });
        }
        res.status(500).json({ message: "Error", error: error.message });
    }
});

// ===========================
// Review connection request (protected: userAuth)
// POST /request/review/:status/:requestedId – logged-in user is the receiver; status: accepted | rejected
// ===========================
router.post("/request/review/:status/:requestedId", userAuth, async (req, res) => {
    try {
        const { _id: loggedInUserId } = req.user;
        const { requestedId, status } = req.params;

        // Only accepted or rejected when reviewing (as receiver)
        const ALLOWED_STATUS = ["accepted", "rejected"];
        if (!ALLOWED_STATUS.includes(status)) {
            return res.status(400).json({ message: "Invalid status type: " + status });
        }

        // Request must exist, be addressed to logged-in user, and still be "interested"
        const connectionRequest = await ConnectionRequest.findOne({
            _id: requestedId,
            toUserId: loggedInUserId,
            status: "interested",
        });
        if (!connectionRequest) {
            return res.status(400).json({ message: "Connection request not found!" });
        }

        // Update status and save
        connectionRequest.status = status;
        const data = await connectionRequest.save();

        res.status(200).json({ message: "You " + status + " connection request", data });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});

module.exports = router;