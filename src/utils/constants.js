const membershipAmount = {
    standard: 500,
    premium: 1000
};

// Duration in days for each membership type (from payment capture)
const membershipDurationDays = {
    standard: 30,
    premium: 365
};

module.exports = {
    membershipAmount,
    membershipDurationDays
};