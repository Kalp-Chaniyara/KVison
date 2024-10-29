import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.originalname) //try to make it unique(change it for best practice)
    }
}) //return the whole path ./public/temp/file/name

const upload = multer({
    // storage: storage
    //? above and below both are same as new es6 versio of js bcz here property name and variable name both are same
    storage
})