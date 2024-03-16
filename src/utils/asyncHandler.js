// we created this for db because we will have to interact with db on multiple ocassions, be it vedio history, or anythin else

// we can use promises or hof approach

// creating a hof:

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: error.message
//         }) 
//     }
// } 

// or use promises:

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
        .resolve(requestHandler(req, res, next))
        .catch((err) => next(err)) // reject likh hua tha mein ne yhan isi liye reject is not a function ka error arha tha
    }
}

export {asyncHandler}

