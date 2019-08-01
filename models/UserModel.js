var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  username : String,
  password : String,
  name : String,
  phone : String,
  email : String,
  addr : String,
  addr_detail : String,
  created_at : {
    type : Date,
    default : Date.now()
  },
});

UserSchema.plugin( autoIncrement.plugin , {model : 'user' , field : 'id' , startAt : 1});
module.exports = mongoose.model('user', UserSchema);
