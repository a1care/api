const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const mainRoutes = require('./src/routes/mainroutes');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration - Allow requests from admin panel
app.use(cors({
    origin: [
        'http://localhost:5173',      // Dev server
        'http://localhost:4173',      // Preview server
        'http://localhost:3000',      // Local backend
        'https://admin.a1carehospital.in'  // Production admin panel
    ],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. API Routes (Specific) ---
app.use('/api', mainRoutes);

// --- 2. Root Route (Specific) ---
// This must be placed before the 404 handler
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


// --- 3. 404 Catch-All Middleware (Must be last route handler) ---
// This only executes if the request didn't match /api, /, or any other routes above
app.use((req, res, next) => {
    // We send a JSON 404 response instead of the default HTML
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});


// Start Server (Listen remains at the bottom)
app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});