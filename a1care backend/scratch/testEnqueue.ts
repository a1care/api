import dotenv from 'dotenv';
dotenv.config();
import { enqueueSms } from '../src/queues/communicationQueue.js';

async function test() {
    console.log("Testing Enqueue...");
    await enqueueSms({ mobileNumber: "9515362625", otp: "654321" });
    console.log("Done.");
    process.exit(0);
}

test();
