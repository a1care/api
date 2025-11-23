const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
res.send('🩺💙 Welcome to A1Care! Your 24×7 API is live and working perfectly 🚀✨');
});

app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});