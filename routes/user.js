const express = require('express');
const router = express.Router();
const uid2 = require('uid2');
const SHA256 = require('crypto-js/sha256');
const encBase64 = require('crypto-js/enc-base64');

const User = require('../models/User');

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
        res.status(400).json({ error : error.message})
    }
});

module.exports = router;