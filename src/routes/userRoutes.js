import { Router } from "express";
import { registerUser, logInUser, logOutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateUserAvatar, updateUserCoverImage, userChannelProfile, getWatchHistory } from "../controllers/userControllers.js";
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

router.route("/change-password").post(verifyJWTAndGetUser,changeCurrentPassword)

router.route("/me").get(verifyJWTAndGetUser,getCurrentUser)

router.route("/avatar").patch(verifyJWTAndGetUser,upload.single("avatar"),updateUserAvatar) //se patch to modied the only which we want if we use put then the whole things will be mofied

router.route("/cover-image").patch(verifyJWTAndGetUser,upload.single("coverImage"),updateUserCoverImage) //se patch to modied the only which we want if we use put then the whole things will be mofied

router.route("/channel/:username").get(verifyJWTAndGetUser,userChannelProfile) //here we use username by req.params means we pass it in the url so write it after :

router.route("/history").get(verifyJWTAndGetUser,getWatchHistory)
export default router 