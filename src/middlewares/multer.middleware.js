import multer from "multer";



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp") // callback function
    },
    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) // creating a special suffix for the file
    //   cb(null, file.fieldname + '-' + uniqueSuffix)
    cb(null, file.originalname) 
    // its not a good practice to save the file by the original name but the file will be on our server for a very little time therefore we can ignore that, later I will change this with generating a special sufix.
    }
})
  
export const upload = multer({ storage, })

// we are using diskStorage because memoryStorage can be overloaded due to uploading heavy files be it video or any file in general.