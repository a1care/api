const express = require('express');
const app = express();
const PORT = 3000;

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


app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});