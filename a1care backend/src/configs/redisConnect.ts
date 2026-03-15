import { createClient } from 'redis';
import dotenv from 'dotenv'

dotenv.config()

console.log(process.env.REDIS_USERNAME)

const redisHost = process.env.REDIS_HOST;
const redisUsername = process.env.REDIS_USERNAME;
const redisPassword = process.env.REDIS_PASSWORD;

let RedisClient: any = null;

const mockRedis = {
    setEx: async (key: string, seconds: number, value: string) => {
        (global as any)._redisMock = (global as any)._redisMock || new Map();
        (global as any)._redisMock.set(key, value);
        setTimeout(() => (global as any)._redisMock.delete(key), seconds * 1000);
        return 'OK';
    },
    get: async (key: string) => {
        return (global as any)._redisMock?.get(key) || null;
    },
    del: async (key: string) => {
        (global as any)._redisMock?.delete(key);
        return 1;
    },
    connect: async () => console.log("Mock Redis (Internal) connected"),
    on: () => { }
};

if (redisHost && redisUsername && redisPassword) {
    RedisClient = createClient({
        username: redisUsername,
        password: redisPassword,
        socket: {
            host: redisHost,
            port: 18171
        }
    });

    RedisClient.on('error', (err: any) => console.log('Redis Client Error', err));

    await RedisClient.connect().then(() => {
        console.log("Redis is connected successfully")
    }).catch((error: any) => {
        console.log("Error in connecting redis client", error)
        RedisClient = mockRedis as any;
    });
} else {
    console.log("Redis credentials not found in .env, using in-memory fallback.");
    RedisClient = mockRedis as any;
}

export default RedisClient as any;


