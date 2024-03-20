import { Router } from "express";
import { logOutUser, registerUser, userLogin } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        }, 
        {
            name: "coverImage",
            maxCount: 1,
        }
    ]), // accepts an array
    registerUser
    )

router.route("/login").post(userLogin)

// secure routes

router.route("/logout").post(verifyJWT, logOutUser)

export default router