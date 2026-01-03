const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const mainRoutes = require('./src/routes/mainroutes');
const path = require('path');
const PatientAuth = require('./src/routes/Patient/authentication.routes');
const ApiError = require('./src/utils/ApiError');
const AddressRoutes = require("./src/routes/Patient/address.routes")
// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration - Temporarily allow all origins
app.use(cors({
    origin: '*',  // Allow all origins temporarily - REMEMBER TO RESTRICT LATER
    credentials: false  // Must be false when origin is *
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 1. API Routes (Specific) ---
app.use('/api', mainRoutes);

// patient authentication routes 
app.use('/api/patient/auth', PatientAuth);

//patient address routes 
app.use('/api/patient/address' , AddressRoutes)
// capture the error from controllers and send JSON response
app.use((err, req, res, next) => {

    if(err instanceof ApiError) {
        console.error(`API Error: ${err.message}`);
    } else {
        console.error(`Unexpected Error: ${err.message}`);
    }
    console.error(err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message
    });
});

// --- 2. Root Route (Specific) ---
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>A1Care API</title>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: #f5f7fa;
                    font-family: Arial, sans-serif;
                }
                .msg {
                    font-size: 28px;
                    font-weight: bold;
                    color: #2c3e50;
                }
            </style>
        </head>
        <body>
            <div class="msg">🚀 A1Care 24×7 API is up and running! 💙✨</div>
        </body>
        </html>
    `);
});

// --- 3. 404 Catch-All Middleware ---
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});