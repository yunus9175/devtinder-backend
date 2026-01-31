const express = require('express')
const { userAuth } = require("../middlewares/auth");
const router = express.Router()
// Send connection request (protected: requires login; uses req.user from userAuth)
router.post("/sendConnectionRequest", userAuth, async (req, res) => {
    try {
        const { firstName, lastName } = req.user;
        res.status(200).json({ message: "Request has been sent to " + firstName + " " + lastName });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});
module.exports = router