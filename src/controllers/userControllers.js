import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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

export {
    registerUser,
    logInUser,
    logOutUser
}