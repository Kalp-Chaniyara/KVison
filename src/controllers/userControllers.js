import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        // console.log("CHILLLL")
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body
    console.log("email: ", email);

    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Please fill in all fields.")
    }
    //Add another validation for email etc....

    const exitedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (exitedUser) {
        throw new ApiError(409, "user with email or username already exists")
    }

    //? try to print req.files and see all its properties and attributes

    // console.log(req.body)
    // const regularObject = { ...req.body };
    // console.log(regularObject);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path; -------> //gives error bcz ---> what if we have req.files but no coverImage then coverImage[0] is not defined

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath)
        throw new ApiError(400, "avatar is required")

    console.log(avatarLocalPath)

    const avatarOn = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatarOn)
        throw new ApiError(400, "avatar file is required")

    const user = await User.create({
        fullName,
        avatar: avatarOn.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"   //in the createdUser password and refreshToken is not selected and we can we see any fields except this two
    )

    // if(!createdUser)
    //     throw new ApiError(500, "something went wrong while registering user")

    // const response = new ApiResponse(201, createdUser, "user created successfully")
    // return res.json(response)
    //! above and below both correct but 
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user created successfully")
    )
})

const logInUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Please provide username or email")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(404, "Invalid user password")
    }

    // console.log("IDD",user._id);

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // console.log("DONEEEEEE")

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully")
        )
})

const logOutUser = asyncHandler(async (req, res) => {
    //here we need the user to logOut but how can we get it ?
    // We cannot get it from req.body as for register and login bcz we do not provide a form to user to logout otherwise it can logout any account by filling the form
    //so by using the custom middleware we can get the user from the access/refresh token and we can take that user by adding it into the req during the middleware functionality

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: null
            }
        },
        {
            new: true
        }
    )

    // const userr = await User.findById(req.user._id);

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {
                    // userr
                },
                "User logged out successfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshAccessToken || req.body.refreshAccessToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Invalid refresh token")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshAccessToken) {
            throw new ApiError(401, "Invalid refresh token OR refresh token is expired OR refresh token is used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        newRefreshToken
                    },
                    "Access token refreshed successfully")
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token OR Error while refreshing the access token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body

    //We put verifyJWTAndGetUser middleware to check whether user is loggedin or not 
    //and if user is login then we can get the user from req.user

    const user = await User.findById(req.user._id)

    const isEnteredPasswordCorrect = await user.isPasswordCorrect(currentPassword)

    if (!isEnteredPasswordCorrect) {
        throw new ApiError(400, "Current password is incorrect")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed Successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is missing")
    }

    const avatarOnCloudinary = await uploadOnCloudinary(avatarLocalPath)

    if (!avatarOnCloudinary.url) {
        throw new ApiError(400, "Error while uploading an avatar")
    }

    const user = await User.findById(req.user._id)
    user.avatar = avatarOnCloudinary.url
    await user.save({ validateBeforeSave: false })

    //*both above and below works completely correct

    // await User.findByIdAndUpdate(
    //     req.user._id,
    //     {
    //         $set:{
    //             avatar:avatarOnCloudinary.url
    //         }
    //     },
    //     {
    //         new:true
    //     }
    // )

    return res
        .status(200)
        .json(new ApiResponse(200, { user }, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage is missing")
    }

    const coverImageOnCloudinary = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImageOnCloudinary.url) {
        throw new ApiError(400, "Error while uploading an coverImage")
    }

    const user = await User.findById(req.user._id)
    user.coverImage = coverImageOnCloudinary.url
    await user.save({ validateBeforeSave: false })

    //*both above and below works completely correct

    // await User.findByIdAndUpdate(
    //     req.user._id,
    //     {
    //         $set:{
    //             coverImage:coverImageOnCloudinary.url
    //         }
    //     },
    //     {
    //         new:true
    //     }
    // )

    return res
        .status(200)
        .json(new ApiResponse(200, { user }, "CoverImage updated successfully"))
})

const userChannelProfile = asyncHandler(async (req, res) => {
    const username = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                uername: username?.toLowerCase()  //1st username ---> attributes of the database
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers "
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo "
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                cahnnelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                cahnnelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)  //! req.user._id just returns the string not whole id, and _id is the whole mondodbId which type of ObjectId('......')... but in the regular basis mongoose behind the scene automatically convert req.user._id into the proper mongodbId when we use the findById or any operation.. But here we use the aggregation pipeline so monogoose does not work and also treat as mondodb so we need to convert it into the proper mongodb id that's why we use the new mongoose.Types.ObjectId(req.user._id) to convert into the actual proper mongodbId
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {   //here the owner field name is already exists so it replace the old data with the new one (hre first object), and if owner doesn't exist then it add that into the field in which we want to add other it will replace old one with the new one.... to access this frontend developer has to access the 0th index element of the object array so we just pass them an object for easiness of the frontend developer, nothing else
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully"))
})

export {
    registerUser,
    logInUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
    userChannelProfile,
    getWatchHistory
}