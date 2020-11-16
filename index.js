const express = require('express');
const mongoose = require('mongoose');
const formidable = require('express-formidable');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(formidable());
app.use(cors());
app.use(helmet());

require('dotenv').config();

//BDD
mongoose.connect(process.env.MONGODB_URI,
{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
});

// CLOUDINARY
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//ROUTES
const userRoute = require('./routes/user');
app.use(userRoute);
const roomRoute = require('./routes/room');
app.use(roomRoute);

app.use(express.static("public"));

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/signup.html");
});

app.all('*', (req, res) => {
    res.status(404).json({ error : "page not found"})
});

app.listen(process.env.PORT, () => {
    console.log("CONNECTED");
});
