const adminAuth = (req, res, next) => {
    const token="1234567890";
    if (token) {
        next();
    } else {
        res.status(401).send("Unauthorized");
    }
}

const userAuth = (req, res, next) => {
    const token="1234567890";
    if (token) {
        next();
    } else {
        res.status(401).send("Unauthorized");
    }
}
module.exports = { adminAuth, userAuth };