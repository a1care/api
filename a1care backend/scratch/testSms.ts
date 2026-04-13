import dotenv from 'dotenv';
dotenv.config();
import sendAlotsSms from '../src/utils/alotsSms.js';

async function test() {
    console.log("Testing SMS delivery...");
    const result = await sendAlotsSms("8309438063", "123456");
    console.log("Result:", result);
    process.exit(0);
}

test();
