const express = require('express');
const router = express.Router();
const uid2 = require('uid2');
const SHA256 = require('crypto-js/sha256');
const encBase64 = require('crypto-js/enc-base64');
const cloudinary = require('cloudinary');

const User = require('../models/User');
const Room = require('../models/Room');
const isAuthenticated = require('../middlewares/isAuthenticated');
const { findById } = require('../models/User');

// CREATE A NEW USER IN THE DB

router.post('/user/sign_up', async (req, res) => {
    // console.log(req.fields);
    // {
    //     email: 'jean@@airbnb-api.com',
    //     password: 'pass',
    //     username: 'Jean-75',
    //     name: 'Jean',
    //     description: 'My name is Jean.'
    //   }
    const {email, password, username, name, description} = req.fields;

    try {
        const newUser = await User.findOne({email : email});
        if(newUser){
            res.status(409).json({message : "This email already has an account"});
        }
        else{
            if(email && password && username && name && description){
                const token = uid2(64);
                const salt = uid2(64);
                const hash = SHA256(password + salt).toString(encBase64);

                const newDbUser = new User({
                    email: email,
                    token: token,
                    hash: hash,
                    salt: salt,
                    account: {
                        username: username,
                        name: name,
                        description: description,
                    }
                });
                await newDbUser.save();
                res.status(200).json({
                    _id: newDbUser._id,
                    token: newDbUser.token,
                    email: newDbUser.email,
                    account: newDbUser.account,
                });
            } 
            else{
                res.status(400).json({message : "Missing parameter(s)"});
            } 
        }
    } catch (error) {
        res.status(400).json({error : error.message});
    }
});

// LOG IN

router.post('/user/log_in', async (req,res) => {
    const {email, password} = req.fields;
    try {
        if(email && password){
            const userToLogin = await User.findOne({email: email});
            if(userToLogin){
                const hashToCompare = SHA256(password + userToLogin.salt).toString(encBase64);
                if(hashToCompare === userToLogin.hash){
                    res.status(200).json({
                        _id: userToLogin._id,
                        token: userToLogin.token,
                        email: userToLogin.email,
                        account: userToLogin.account,
                    });
                }
                else{
                    res.status(400).json({ error: "Wrong password"});
                }
            }
            else{
                res.status(400).json({ error: "Unauthorized" });
            }
        }
        else{
            res.status(400).json({ error: "Missing parameter(s)" });
        }
    } catch (error) {
        res.status(400).json({ error : error.message});
    }
});

// Upload user photo 

router.put('/user/upload_picture/:id',isAuthenticated, async (req, res) => {
    try {
        if(req.params.id){
            const pictureUploader = await User.findById(req.params.id);
            const picture =  req.files.picture.path;

            // Sending the image to cloudinary
            const result = await cloudinary.uploader.upload(picture, {
                folder : `/airbnb-api/${pictureUploader._id}`
            });

            // Save uploaded photo in the DB
            pictureUploader.account.photo = result;
            await pictureUploader.save();
            res.status(200).json(pictureUploader);
        }
    } catch (error) {
        res.status(400).json({ error : error.message});
    }
});

// Delete user photo

router.put('/user/delete_picture/:id', isAuthenticated, async (req, res) => {
    if(req.params.id){
        try {
            const userPictureToDelete = await User.findById(req.params.id);

            if(userPictureToDelete){
                if(String(userPictureToDelete._id) === String(req.user._id)){
                    // Check if the user already has a photo
                    if(userPictureToDelete.account.photo){

                        await cloudinary.uploader.destroy(userPictureToDelete.account.photo.public_id, function(error,result) {
                            console.log(result, error) });
                        
                        await User.findByIdAndUpdate(req.params.id, {
                        "account.photo": null,
                        });
                        const userPictureDeleted = await User.findOne(req.params.id);
                        res.status(200).json(userPictureDeleted);
                    }
                    else{
                        res.status(400).json({message : "no photo found"});
                    }
                }
                else{
                    res.status(401).json({message : "unauthorized"});
                }
            }
            else{
                res.status(400).json({message : "user not find."});
            }   
        } catch (error) {
            res.status(400).json({ error : error.message});
        }
    }
    else{
        res.status(400).json({message : "Missing user id."});
    }
});

module.exports = router;