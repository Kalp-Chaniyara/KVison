import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

import dotenv from 'dotenv';

dotenv.config();

const connectDB = async()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`\n MongoDb Connected !! DB HOST: ${connectionInstance.connection.host}`) //To see where we connect as databse for production,development,testing are different
    } catch (error) {
        console.log("MONGODB CONNECTION FAILED: ",error);
        process.exit(1)
    }
}

export default connectDB