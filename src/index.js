 import dotenv from 'dotenv';
import connectDB from "./db/index.js";

dotenv.config({ // configuring dotenv after import syntax.
    path: '/.env'
})

connectDB();

























// require('dotenv').config({path: './env'}) // isse bhi kam hojaeyga bas code ki consistency ke liye import mien convert kardo.

// 2 approaches hoti hain db ko connect karne ki
// => index.js mein hi iife ya function bnake execute kardein.
// => ya phir src/db mein index.js mein ye sab kam karke main file mein import karke execute karvadein.

// import express from "express" // initializing app
// const app = express()

// using an iife with async/await and try/catch for better approach.
/* ;( async () => { 
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`) // connecting the database.
        app.on("error!", (error) => {
            console.log("Error: ", error)
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listenening on port ${process.env.PORT}`)
        }) // app is running on this port.

    } catch (error) {
        console.error(`Error: `, error);
        throw error
    }
} )(); // iife executed
*/
// async/await is liye use karte hian kiun ke kisi bhiu db ke connect hone mien time lagta hai or agar hum aisa nhi karein ge to wohi promise <Pending> wali state mein chale jayenge.