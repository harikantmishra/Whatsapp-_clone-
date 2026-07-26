const jwt = require("jsonwebtoken");
const getEnvValue = require("./getEnvValue.js");

const generateToken = (userId)=>{
    const jwtSecret = getEnvValue("JWT_SECRET", "jwtSecret", "jwtSecret ");

    if (!jwtSecret) {
        throw new Error("JWT secret is not configured");
    }
    return jwt.sign({ userId }, jwtSecret, {
        expiresIn:'30d'
    })
};

module.exports = generateToken;
