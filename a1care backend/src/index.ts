import dotenv from 'dotenv'
import app from './app.js'
import { connectDb } from "./configs/db.js";
import { initFCM } from "./configs/fcmConfig.js";

dotenv.config();

const startServer = async () => {
    try {
        await connectDb();
        await initFCM();
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server running on port ${process.env.PORT || 3000}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();