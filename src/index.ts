import http from 'http'
import dotenv from 'dotenv'
import app from './app.js'
import { connectDb } from './configs/db.js';

dotenv.config();

async function start(){
    await connectDb()

    const server = http.createServer(app)

    server.listen(process.env.PORT , ()=>{
        console.log(`server is running at http://localhost${process.env.PORT}`)
    })
}

start();