const jwt = require('jsonwebtoken')

const generateToken = ()=>{
    return jwt.sign({userId},process.env.jwtSecret,{
        expiresIn:'30d'
    })
}

module.exports = generateToken;