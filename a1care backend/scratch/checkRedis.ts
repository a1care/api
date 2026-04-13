import dotenv from 'dotenv';
dotenv.config();
import RedisClient from '../src/configs/redisConnect.js';

async function check() {
    const otp = await RedisClient.get('otp:patient:9515362625');
    console.log("OTP in Redis:", otp);
    process.exit(0);
}

check();
