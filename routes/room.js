const express =  require('express');
const mongoose = require('mongoose');
const router = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const cloudinary = require('cloudinary');

const Room = require('../models/Room');
const User = require('../models/User');

router.post('/room/publish', isAuthenticated, async (req, res) => {
    const {title, description, price, location} = req.fields;
    if(title && description && price && location){
        try {
            
            const newRoom = new Room({
                title: title,
                description: description,
                price: price,
                location: [location.lat, location.lng],
                user: req.user._id
            });

            await newRoom.save();

            // We add the new room in the user field and update the user

            const user = await User.findById(req.user._id);
            let tab = user.rooms;
            tab.push(newRoom._id);

            await User.findByIdAndUpdate(user._id, {rooms : tab});

            res.status(200).json(newRoom);
    } catch (error) {
        res.status(400).json({message : error.message});
    }
}
    else{
        res.status(400).json({message : "Missing parameter(s)"});
    }
});

router.get('/rooms/:id', async (req, res) => {
    try {
        const theUserRooms = await Room.find(req.params._id).populate('user');
        res.status(200).json({theUserRooms});
    } catch (error) {
        res.status(400).json({message : error.message});
    }
});

router.put('/room/update/:id',isAuthenticated, async (req, res) => {
    try {
        const {id} = req.user;
        const roomToUpdate = await Room.findOne({id : req.params._id});
        // Check if the auth user is the owner of the room to update
        let {user} = roomToUpdate;
        user = String(user);
        // string comparison instead of objects
        if(id === user){
            res.status(200).json({roomToUpdate});
        }
        else{
            res.status(401).json({message : "Unauthorized"});
        }
    } catch (error) {
        res.status(400).json({message : error.message});
    }
});

router.delete('/room/delete/:id', isAuthenticated, async (req, res) => {
    try {
        const {id} = req.user;
        const roomToDelete = await Room.findById(req.params.id);
        // Check if the auth user is the owner of the room to update
        let {user} = roomToDelete;
        user = String(user);
        // string comparison instead of objects
        if(id === user){
            await roomToDelete.deleteOne();
            res.status(200).json({message : "Item removed"});
        }
        else{
            res.status(401).json({message : "Unauthorized"});
        }
    } catch (error) {
        res.status(400).json({message : error.message});
    }
});

// Add multiple photos, id of a room publication

router.put('/room/upload_picture/:id', isAuthenticated, async (req, res) => {
    if(req.params.id){
        if(req.files.picture){
            try {
                const theRoom = await Room.findById(req.params.id);
                if(theRoom){
                    if(String(req.user._id) === String(theRoom.user)){
                        // array content from the DB
                        let tab = theRoom.photos;

                        if(tab.length < 5){
                        // upload in the cloudinary user file
                        // https://cloudinary.com/documentation/image_upload_api_reference#optional_parameters
                        const cloudPhoto = await cloudinary.uploader.upload(
                            req.files.picture.path,
                            {
                            folder : `/airbnb-api/${theRoom.user}`
                            });
                            
                        const newPhoto = {
                            picture_id : cloudPhoto.public_id,
                            url : cloudPhoto.secure_url
                        };
                        tab.push(newPhoto);

                        await Room.findByIdAndUpdate(req.params.id, {photos : tab});
                        const theRoomUpdated = await Room.findById(req.params.id);
                        
                        res.status(200).json(theRoomUpdated);
                        }
                        else{
                            res.status(400).json({message : "You can't upload more photos."});
                        }
                    }
                    else{
                        res.status(400).json({message : "This is not your room!?"});
                    }
                }
                else{
                    res.status(400).json({message : "This room is not created here."}); 
                }
            } catch (error) {
                res.status(400).json({message : error.message});
            }
        }
        else{
            res.status(400).json({message : "Missing picture file."});
        }
        }
    else{
        res.status(400).json({message : "Missing user id."});
    }   
});

router.put('/room/delete_picture/:id', isAuthenticated,async (req, res) => {
    if(req.params.id){
        try {
            if(req.fields.picture_id){
                const room = await Room.findById(req.params.id);
                if(room){
                    if(String(req.user._id) === String(room.user)){
                        if(room.photos.length != 0){
                            //DB = const newPhoto = { picture_id : cloudPhoto.public_id, url : cloudPhoto.secure_url}
                            for(let i = 0; i < room.photos.length; i++){
                                if(room.photos[i].picture_id === req.fields.picture_id){
                                    await cloudinary.uploader.destroy(room.photos[i].picture_id, function(error,result) {
                                    console.log(result, error) });
                                    const roomDeleted = room.photos.splice(i, 1);
                                    await Room.findByIdAndUpdate(req.params.id, {photos : room.photos});
                                }
                                else{
                                    res.status(400).json({message : "No picture found."});
                                }
                            }
                            
                            const roomUpdated = await Room.findById(req.params.id);
                            res.status(200).json({roomUpdated});
                        }
                        else{
                            res.status(400).json({message : "There is no photo to delete."});
                        }
                    }
                    else{
                        res.status(400).json({message : "Unauthorized"});
                    }
                }
                else{
                    res.status(400).json({message : "This room doesn't exist."});
                }
            }
            else{
                res.status(400).json({message : "Missing parameter"});
            }
        } catch (error) {
            res.status(400).json({message : error.message});
        }
    }
    else{
        res.status(400).json({message : "Missing parameter"});
    }
});


// Read rooms with filter
router.get('/rooms',isAuthenticated, async (req, res) => {
    if(req.query){
        try {
            if(req.user){
                if(req.query.title){
                    
                }
            }
            else{
                res.status(401).json({message : "Unauthorized"});
            }
            
        } catch (error) {
            res.status(400).json({message : error.message});
        }
    }
    else{
        res.status(400).json({message : "Missing parameter"});
    }
});

module.exports = router;