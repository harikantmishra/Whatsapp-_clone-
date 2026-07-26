const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const connectDb= require("./config/dbconnect.js");
const authRouter = require('./routes/authRoute.js')
const response = require('./utils/responseHandler.js');
const chatRouter = require('./routes/chatRoute.js')
const initializeSocket = require('./service/socketService.js');
const http = require('http');
const statusRoute = require('./routes/statusRoute.js');

const parseAllowedOrigins = (value) =>
    (value || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);


dotenv.config();

connectDb();

const app = express();

const PORT = process.env.PORT || 5000;
const allowedOrigins = parseAllowedOrigins(process.env.FRONTEND_URL);
const fallbackOrigin = "http://localhost:5173";

// Middlewares
app.use(cors({
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        const validOrigins = allowedOrigins.length ? allowedOrigins : [fallbackOrigin];

        if (validOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));


const server = http.createServer(app);

const io = initializeSocket(server);

app.use((req,res,next)=>{
    req.io=io;
    req.socketUserMap = io.socketUserMap;
    next();
})



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
    });
});

app.use('/api/auth',authRouter);
app.use('/api/chat',chatRouter);
app.use('/api/status',statusRoute);






// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
