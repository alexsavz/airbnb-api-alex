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

mongoose.connect(process.env.MONGODB_URI,
{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
});

const userRoute = require('./routes/user');
app.use(userRoute);

app.get('/', (req, res) => {
    res.send("Welcome to the AirBnB-API-Alex!");
})

app.all('*', (req, res) => {
    res.status(404).json({ error : "page not found"})
});

app.listen(process.env.PORT, () => {
    console.log("CONNECTED");
});
