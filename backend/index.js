const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const connectDb= require("./config/dbconnect.js");
const authRouter = require('./routes/authRoute.js')


dotenv.config();

const app = express();

const PORT = process.env.PORT;

// Middlewares
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

connectDb();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes

app.use('/api/auth',authRouter);


// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});