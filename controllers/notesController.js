const User = require('../models/User')
const Note = require('../models/Note')
const asyncHandler = require('express-async-handler') //Simple middleware for handling exceptions inside of async express routes and passing them to your express error handlers, dont have to use try catches
const bcrypt = require('bcrypt') //encrypts the password before saving it in the database for security

// @desc Get all notes
// @route GET /notes
// @access Private
const getAllNotes = asyncHandler(async (req,res) =>{
    const notes = await Note.find().lean() //Find notes from database
    if(!notes?.length) {
        return res.status(400).json({ message: "No Notes Found"})
    }

    // Add username to each note before sending the response 
    // See Promise.all with map() here: https://youtu.be/4lqJBBEpjRE 
    // You could also do this with a for...of loop
    const notesWithUser = await Promise.all(notes.map(async (note) => {
        console.log(note)
        const user = await User.findById(note.user).lean().exec()
        console.log(user)
        return { ...note, username: user.username }
    }))

    res.json(notesWithUser)
})

// @desc create a new note
// @route POST /notes
// @access Private
const createNewNote = asyncHandler(async (req,res) =>{
    const { user , title , text } = req.body

    //confirm data
    if (!user || !title || !text){
        return res.status(400).json({ message: 'All fields are required'})
    }

    //check for duplicate
    const duplicate = await Note.findOne({title}).
    collation({locale:'en',strength:2}).lean().exec()

    if(duplicate){
        return res.status(400).json({message: 'Duplicate Note title'})
    }

    const noteObject = {
        user,
        title,
        text
    }

    //creating and storing in db

    const note = await Note.create(noteObject)

    if (note) { //user created
        res.status(200).json({ message: `New note ${title} created`})
    } else{
    res.status(400).json({ message: ' Invalid data recieved'})
    }

})

// @desc update existing note
// @route PATCH /notes
// @access Private
const updateNote = asyncHandler(async (req,res) =>{
    const { id, user, title, text, completed } = req.body
    
    // Confirm data
    if (!id || !user || !title || !text || typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'All fields are required' })
    }

    // Confirm note exists to update
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Note not found' })
    }

    // Check for duplicate title
    const duplicate = await Note.findOne({ title }).
    collation({locale:'en',strength:2}).lean().exec()

    // Allow renaming of the original note 
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Duplicate note title' })
    }

    note.user = user
    note.title = title
    note.text = text
    note.completed = completed

    const updatedNote = await note.save()

    res.json(`'${updatedNote.title}' updated`)

})

// @desc delete a note
// @route DELETE /notes
// @access Private
const deleteNote = asyncHandler(async (req,res) =>{
    const { id } = req.body

    // Confirm data
    if (!id) {
        return res.status(400).json({ message: 'Note ID required' })
    }

    // Confirm note exists to delete 
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Note not found' })
    }

    const result = await note.deleteOne()

    const reply = `Note '${result.title}' with ID ${result._id} deleted`

    res.json(reply)
})
module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote
}
