const express = require('express')
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");
const bcrypt = require("bcrypt")
const { validateEditProfilrData, validateProfilePassword } = require('../utils/validation');
const router = express.Router()

// Get current user profile (protected: userAuth runs first, then req.user is set)
router.get("/profile/view", userAuth, async (req, res) => {
    try {
        // userAuth middleware already attached logged-in user to req.user
        const user = req.user;
        delete user.password;
        res.status(200).json({
            message: "Successfully get profile data",
            data: user,
        });
    } catch (error) {
        // Handle JWT errors (expired, invalid signature, etc.)
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
        }
        res.status(500).json({ message: "Error", error: error.message });
    }
});

router.patch("/profile/edit", userAuth, async (req, res) => {
    const updateData = req.body;
    try {
        // validation of user sent fields
        validateEditProfilrData(req)
        const userId = req.user._id;
        // Update user with validation and return updated document
        const result = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true, returnDocument: "after" });

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "Profile updated successfully", data: result });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }

});
// Update current user's password (protected: userAuth; body: { currentPassword, newPassword })
// Requiring current password prevents someone with a stolen token from changing the password and locking out the user.
router.patch("/profile/password", userAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    try {
        // Validate body has currentPassword + newPassword and newPassword meets strong-password rules
        validateProfilePassword(req);
        // Verify user knows current password before allowing change (req.user has full document including password hash)
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, req.user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }
        // Hash the new password; never store plain text (schema validator expects plain text, so we skip it below)
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // updateOne returns { acknowledged, matchedCount, modifiedCount } – not the document
        const result = await User.updateOne(
            { _id: userId },
            { password: hashedPassword },
            { runValidators: false }
        );
        // matchedCount 0 means no user found with this id
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});
module.exports = router;