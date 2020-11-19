const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: { type: String, required: true, unique: true },
  token: String,
  hash: String,
  salt: String,
  resetPasswordToken: { type: String, default: null },
  resetPasswordDate: { type: Number, default: null },
  account: {
    username: { type: String, required: true, unique: true },
    name: String,
    description: String,
    photo: Object
  },
  rooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room"
    }
  ]
});

module.exports = User;