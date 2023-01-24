const User = require('../models/User')
const Note = require('../models/Note')
const asyncHandler = require('express-async-handler') //Simple middleware for handling exceptions inside of async express routes and passing them to your express error handlers, dont have to use try catches
const bcrypt = require('bcrypt') //encrypts the password before saving it in the database for security

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = asyncHandler(async (req,res) =>{
    const users = await User.find().select('-password').lean() //Find users from database, select -password means do not return password, lean method returns a raw document without any methods attached to the doument like the save method
    if(!users?.length) {
        return res.status(400).json({ message: "No Users Found"})
    }

    res.json(users)
})

// @desc create new user
// @route POST /users
// @access Private
const createNewUser = asyncHandler(async (req,res) =>{
    const {username , password , roles } = req.body

    //confirm data
    if (!username || !password ){
        return res.status(400).json({ message : " All Fields are Required"})
    }

    //check for duplicate
    const duplicate = await User.findOne({username}).
    collation({locale:'en',strength:2}).lean().exec() //mongoose said if we are passing anything in use exec()

    if(duplicate){
        return res.status(409).json({ message: "Duplicate User"})
    }

    //hasing the password

    const hashedPwd = await bcrypt.hash(password,10) // addinf 10 salt rounds to the password

    const userObject = (!Array.isArray(roles) || !roles.length)
        ? {username, "password": hashedPwd} 
        :{username, "password": hashedPwd,roles}

    // create and store new user

    const user = await User.create(userObject)

    if (user) { //user created
        res.status(200).json({ message: `New user ${username} created`})
    } else{
    res.status(400).json({ message: ' Invalid user data recieved'})
    }
})

// @desc update a user
// @route PATCH /users
// @access Private
const UpdateUser = asyncHandler(async (req,res) =>{
    const {id, username , password , roles, active } = req.body

    //confirm data
    if (!id || !username || !Array.isArray(roles) ||!roles.length || typeof active !== 'boolean'){
        return res.status(400).json( {message: 'All Fields are required'})
    }

    const user = await User.findById(id).exec() //need this to be a mongoose document with save so dont add lean()

    if(!user){
        return res.status(400).json({ message: 'User Not Found'})
    }

    //check for duplicates
    const duplicate = await User.findOne({username}).
    collation({locale:'en',strength:2}).lean().exec()
    // Allow updates to the original user
    if (duplicate && duplicate?._id.toString() !== id){
        return res.status(409).json({ message: 'Duplicate username'})
    }

    user.username = username
    user.roles = roles
    user.active = active

    if (password) {
        //Hash password
        user.password = await bcrypt.hash(password,10)
    }

    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} updated`})  
})

// @desc delete a user
// @route DELETE /users
// @access Private
const deleteUser = asyncHandler(async (req,res) =>{
    const { id } = req.body

    if(!id){
        return res.status(400).json({ message: 'User ID Required'})
    }

    //first check to see if user has assigned notes, if yes dont delete user
    const note = await Note.findOne({ user: id }).lean().exec()

    if(note){
        return res.status(400).json({ message: 'user has assigned notes'})
    }

    const user = await User.findById(id).exec()

    if(!user){
        return res.status(400).json({ message: 'User not found'})
    }

    const result = await user.deleteOne()

    const reply = `username ${result.username} with id ${result._id} deleted`

    res.json(reply)
})

module.exports = {
    getAllUsers,
    createNewUser,
    UpdateUser,
    deleteUser
}