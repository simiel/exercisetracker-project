const mongoose = require('mongoose')
const nanoid = require('nanoid')

const nid = nanoid.nanoid();
const Schema = mongoose.Schema;

//User Schema with NanoID generating auth key for extra authentication

const userSchema = new Schema ({
  username: {type: String, required: true},
  authKey: {type: String, required: true, default: nid}
});

module.exports = mongoose.model('User', userSchema);