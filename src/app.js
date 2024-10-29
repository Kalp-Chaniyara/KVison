import e from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = e();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(e.json({limit:"16kb"}))
app.use(e.urlencoded({extended:true,limit:"16kb"}))
app.use(e.static("public"))
app.use(cookieParser())

//routes import
import userRouter from "./routes/user.router.js" //we can give our own name when we used export default

//routes define
//! app.get() ---> we can write it when we deifne routes,controllers all here but as now we seperate controllers and routes then we have to do it through the middleware compulosry

app.use("/api/v1/users",userRouter)  //when /api/v1/users route hits all controlls goes to the userRouter

export default app