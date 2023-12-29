const mongoose = require('mongoose')

const Schema = mongoose.Schema;

const exSchema = new Schema ({
  username: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now() }
});

module.exports = mongoose.model('Exercise', exSchema);