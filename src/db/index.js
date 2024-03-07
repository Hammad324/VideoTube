import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"; // importing DB_NAME

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB is connected!!, DB HOST: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.error("MongoDB failed to connect: ", error);
        process.exit(1)
    }
}

export default connectDB

// mongoose ik return object deta hai.