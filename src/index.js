import dotenv from "dotenv"
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path: './.env'
})

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("EXPRESS CONNECTION ERROR !!!: ", error);
            throw error;
        })
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is ruuning at PORT : ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log("MongoDb connection failed !!! ", error);
    })

//! 1st approach is as shown in the below which is write everything in the index.js file
/*
import e from "express";
const app = e();

; (async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.log("ERR: ",error);
            throw error;
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })

    } catch (error) {
        console.error("ERROR: ",error);
        throw error;
    }
})() //; is just for cleaning purpose if ther is no ; before the line of this
*/