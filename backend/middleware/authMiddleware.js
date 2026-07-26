const jwt = require("jsonwebtoken");
const response = require("../utils/responseHandler.js");
const getEnvValue = require("../utils/getEnvValue.js");

const authMiddleware = (req,res,next)=>{
    const authToken = req.cookies?.auth_token;

    if(!authToken){
        return response(res,401,'authorization token missing. Please provide token');
    }
    try{  
        const jwtSecret = getEnvValue("JWT_SECRET", "jwtSecret", "jwtSecret ");

        if (!jwtSecret) {
            return response(res,500,'JWT secret is not configured');
        }
        const decode  = jwt.verify(authToken,jwtSecret);
        req.user = decode ;
        console.log(req.user);
        next();
    }
    catch(error){
        console.error(error);
        return response(res,401,'Invalid or expired token');
    }

}

module.exports = authMiddleware;  

