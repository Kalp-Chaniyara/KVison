import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body
    console.log("email: ", email);

    if ([fullName, email, username, password].some((field) => field?.trim() === ""))
    {
        throw new ApiError(400, "Please fill in all fields.")
    }
    //Add another validation for email etc....

    const exitedUser = User.findOne({
        $or:[{username}, {email}]
    })

    if(exitedUser)
    {
        throw new ApiError(409, "user with email or username already exists")
    }

    //? try to print req.files and see all its properties and attributes

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.avatar[0]?.path;

    if(!avatarLocalPath)
        throw new ApiError(400, "avatar is required")

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
        throw new ApiError(400, "avatar file is required")

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"   //in the createdUser password and refreshToken is not selected and we can we see any fields except this two
    )

    if(!createdUser)
        throw new ApiError(500, "something went wrong while registering user")

    const response = new ApiResponse(201, createdUser, "user created successfully")
    return res.json(response)
    //! above and below both correct but 
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user created successfully")
    )
})

export {
    registerUser,
}