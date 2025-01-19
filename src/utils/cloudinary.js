import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null

        //Upload on Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //File successfully uploaded, then unlink it 
        fs.unlinkSync(localFilePath)
        
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath)  //Remove the locally saved temp. file from the server
        return null;
    }
}

const deleteThumbnailOnCloudinary = async (url) => {
    try {
        const publicId = url.split("/").pop().split(".")[0]
        
        if(!publicId)
        {
            return console.log("No public Id present")
        }

        await cloudinary.uploader.destroy(publicId)
        .then((result) => {console.log(result)})
    } 
    catch (error) {
        console.log(error.message)
    }
}

const deleteVideoOnCloudinary = async (url) => {
    
    try {
        const publicId = url.split("/").pop().split(".")[0]
    
        if(!publicId)
        {
            return console.log("No public Id present")
        }
    
        await cloudinary.uploader.destroy(publicId,{resource_type: "video"})
        .then((result) => {console.log(result)})
    } catch (error) {
        console.log(error.message)
    }
}

export {
    uploadOnCloudinary,
    deleteThumbnailOnCloudinary,
    deleteVideoOnCloudinary
}