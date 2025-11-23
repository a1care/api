const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db'); 
const mainRoutes = require('./src/routes/mainroutes');

// Load environment variables
dotenv.config({ silent: true });


connectDB();

const app = express();
const PORT = process.env.PORT || 3000;


// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.use('/api', mainRoutes);

// Root route (existing logic remains)

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


// Start Server
app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});