const express = require('express');
const router = express.Router();
const uid2 = require('uid2');
const SHA256 = require('crypto-js/sha256');
const encBase64 = require('crypto-js/enc-base64');
const cloudinary = require('cloudinary');

const User = require('../models/User');
const Room = require('../models/Room');
const isAuthenticated = require('../middlewares/isAuthenticated');

// MAILGUN
const mailgun = require("mailgun-js");
const DOMAIN = process.env.MG_DOMAIN;
const APIKEY = process.env.MG_API_KEY;

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

// Read user profile
router.get('/users/:id', async (req, res) => {
    if(req.params.id){
        try {
            const userToFind = await User.findById(req.params.id).select("account rooms");
            res.status(200).json(userToFind);
        } catch (error) {
            res.status(400).json({ error : error.message});
        }
    }
    else{
        res.status(400).json({message : "Missing user id."});
    }
});

// Update a user
router.put('/user/update',isAuthenticated, async (req, res) => {
    const {email, username, name, description} = req.fields;
    if(email || username || name || description){
        try {
            const userToUpdate = await User.findById(req.user._id);
            // We check if the email is already save in the DB
            if(email){
                const searchEmail = await User.findOne({email : email});
                console.log(searchEmail);
                if(searchEmail){
                    res.status(400).json({message : "This email already exist."});
                }else{
                    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    const validEmail = regex.test(String(email).toLowerCase());
                    if(validEmail){
                        //console.log("email vérifié");
                        userToUpdate.email = email;
                    }
                    else{
                        res.status(400).json({message : "This is not a valid email adress."});
                    }
                    
                }
            }

            // We check if the username is already save in the DB
            if(username){
                const searchUsername = await User.findOne({username : username});
                if(searchUsername){
                    res.status(400).json({message : "This username is already used."}); 
                }
                else{
                    userToUpdate.account.username = username;
                }
            }

            if(name){
                userToUpdate.account.name = name;
            }
            if(description){
                userToUpdate.account.description = description;
            }
            await userToUpdate.save();
            res.send(userToUpdate);
        } catch (error) {
            res.status(400).json({ error : error.message});
        }
    }
    else{
        res.status(400).json({message : "Missing informations."});
    }
});

// Check the password of an authentified user
router.put('/user/update_password', isAuthenticated, async (req, res) => {
    const {previousPassword, newPassword} = req.fields;
    if(previousPassword && newPassword){
        try {
            const userToUpdate = await User.findById(req.user._id);
            const hashToCheck = SHA256(previousPassword + userToUpdate.salt).toString(encBase64);
            
            if(hashToCheck === userToUpdate.hash){
                if(String(previousPassword) != String(newPassword)){
                    const salt = uid2(64);
                    const token = uid2(64);
                    const newHash = SHA256(newPassword + salt).toString(encBase64);
                    
                    userToUpdate.hash = newHash;
                    userToUpdate.salt = salt;
                    userToUpdate.token = token;
                    await userToUpdate.save();
    
                    // The data we send with Mailgun
                    const mg = mailgun({apiKey: APIKEY, domain: DOMAIN});
                    const data = {
                    from: "Airbnb API <postmaster@" + DOMAIN + ">",
                    to: userToUpdate.email,
                    subject: "Password update",
                    text: '/user/update_password',
                    };
                    
                    // We send the email
                    mg.messages().send(data, function (error, body) {
                        // console.log("body : ", body);
                        // console.log("error : ", error);
                        if (error) {
                            res.status(400).json({ error: "An error occurred" });
                        } else {
                            res.json({ 
                            _id: userToUpdate._id,
                            token: userToUpdate.token,
                            email: userToUpdate.email,
                            account: userToUpdate.account,
                            rooms: userToUpdate.rooms,    
                            message: "An email with the a new password has been sent to the user" });
                        }
                        });
                } 
                else{
                    res.status(400).json({message : "The passwords must be different."});
                }
            }
            else{
                res.status(400).json({message : "This is not your previous password."});
            }
        } catch (error) {
            res.status(400).json({ error : error.message});
        }
    }
    else{
        res.status(400).json({message : "Missing fields."});
    }
});

// Email sent to a unauthentified user for a password change
router.post('/user/recover_password/', async (req, res) => {
    if(req.fields.email){
        try {
            const user = await User.findOne({email : req.fields.email});
            const userEmail = user.email;
            if(user){

                const resetPwdToken = uid2(64);
                const resetPwdDate = Date.now();
                user.resetPasswordToken = resetPwdToken;
                user.resetPasswordDate = resetPwdDate;

                await user.save();

                // The data sent with Mailgun
                const mg = mailgun({apiKey: APIKEY, domain: DOMAIN});
                const data = {
                from: "Airbnb API <postmaster@" + DOMAIN + ">",
                to: userEmail,
                subject: "Password recovery",
                text: `Connect to this page for a password recovery : /user/reset_password?token=${resetPwdToken}`,
                };
                
                // We send the email
                mg.messages().send(data, function (error, body) {
                    // console.log("body : ", body);
                    // console.log("error : ", error);
                    if (error) {
                        res.status(400).json({ error: "An error occurred" });
                    } else {
                        res.json([user, user.resetPasswordToken, user.resetPasswordDate]);
                    }
                });
            }
            else{
                res.status(400).json({message : "There is no user with this email."});
            }
        } catch (error) {
            res.status(400).json({ error : error.message});
        }
    }
    else{
        res.status(400).json({message : "Missing email."});
    }
});

// The unauthentified user connect to this url for a password reset
router.post('/user/reset_password', async (req, res) => {
    if(req.fields.PasswordToken && req.fields.date && req.fields.password){
        try {
            // We find the user in the DB with is temporary token
            const userToUpdate = await User.findOne({resetPasswordToken : req.fields.PasswordToken});
            console.log(userToUpdate);
            // TEMPORARY TOKEN
            const millis = req.fields.date - userToUpdate.resetPasswordDate;
            if(millis < 600000){
                //PASSWORD
                const salt = uid2(64);
                const token = uid2(64);
                const newHash = SHA256(req.fields.Password + salt).toString(encBase64);
                userToUpdate.hash = newHash;
                userToUpdate.salt = salt;
                userToUpdate.token = token;
                userToUpdate.resetPasswordDate = null;
                userToUpdate.resetPasswordToken = null;
                
                await userToUpdate.save();

                // The data sent with Mailgun
                const mg = mailgun({apiKey: APIKEY, domain: DOMAIN});
                const data = {
                from: "Airbnb API <postmaster@" + DOMAIN + ">",
                to: userToUpdate.email,
                subject: "Password recovery",
                text: `Your new password is up to date.`,
                };
                
                // We send the email
                mg.messages().send(data, function (error, body) {
                    // console.log("body : ", body);
                    // console.log("error : ", error);
                    if (error) {
                        res.status(400).json({ error: "An error occurred" });
                    } else {
                        res.json({ 
                        _id: userToUpdate._id,
                        token: userToUpdate.token,
                        email: userToUpdate.email,
                        account: userToUpdate.account,
                        rooms: userToUpdate.rooms,    
                        message: "Password up to date." });
                    }
                });
            }
            else{
                res.status(403).json({message : "Request out of date."});
            }
            

        } catch (error) {
            res.status(400).json({ error : error.message});
        }
    }
    else{
        res.status(400).json({message : "Missing parameters."});
    }
});
// Read user rooms
router.get('/user/rooms/:id', async (req, res) => {
    if(req.params.id){
        try {
            const userToFind = await User.findById(req.params.id).select("account rooms");
            if(userToFind){
                // Rooms in array 
            const userRooms = userToFind.rooms;
                if(userRooms.length > 0){
                    let array = [];

                    for(let i = 0; i < userRooms.length; i ++){
                        array.push(await Room.findById(userRooms[i]));
                    }
                    
                    res.status(200).json(array);
                }
                else{
                    res.status(400).json({ error : "This user doesn't have rooms."});
                }
            }
            else{
                res.status(400).json({ error : "Wrong parameter."});
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