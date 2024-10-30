import { Router } from "express";
import { registerUser, logInUser, logOutUser, refreshAccessToken } from "../controllers/userControllers.js";
import { upload } from "../middlewares/multer.middlewares.js"
import { verifyJWTAndGetUser } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(   //main is registerUser, so before this is middleware
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(logInUser)

router.route("/logout").post(verifyJWTAndGetUser, logOutUser)

router.route("/refresh-access-token").post(refreshAccessToken)

export default router 