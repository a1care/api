import { Queue } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();
import { getQueueRedisConnection } from '../src/queues/redisConnection.js';

async function check() {
    const connection = getQueueRedisConnection();
    if (!connection) {
        console.error("No redis connection");
        process.exit(1);
    }
    const queue = new Queue('a1care-communications', { connection });
    const counts = await queue.getJobCounts();
    console.log("Queue Counts:", counts);
    process.exit(0);
}

check();
