const express =  require('express');
const mongoose = require('mongoose');
const router = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');

const Room = require('../models/Room');

router.post('/room/publish', isAuthenticated, async (req, res) => {
    try {
        const {title, description, price, location} = req.fields;

        const newRoom = new Room({
            title: title,
            description: description,
            price: price,
            location: [location.lat, location.lng],
            user: req.user._id
        });

        await newRoom.save();
        res.status(200).json({newRoom});
    } catch (error) {
        res.status(400).json({message : error.message});
    }
});

router.get('/rooms', async (req, res) => {
    try {
        const allTheRoomsToRent = await Room.find().select('title price location');
        res.status(200).json({allTheRoomsToRent});
    } catch (error) {
        res.status(400).json({message : error.message});
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

module.exports = router;