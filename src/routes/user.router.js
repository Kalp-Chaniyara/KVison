import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";   // Can import {} via only when we didn't use export default

const router = Router()

router.route("/register").post(registerUser)

export default router