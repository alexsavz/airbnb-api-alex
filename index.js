const express = require('express');
const mongoose = require('mongoose');
const formidable = require('express-formidable');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(formidable());
app.use(cors());
app.use(helmet());

mongoose.connect('mongodb://localhost/airbnb-api',
{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
});


