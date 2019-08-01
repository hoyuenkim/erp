var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

var CustomerSchema = new Schema({
  name : String,
  ceo : String,
  phone : String,
  email : String,
  bizcode : Number,
  attention : String,
  addr : String,
  addr_detail : String,
  deleted : Boolean,
  created_at : {
    type : Date,
    default : Date.now()
  },
});

CustomerSchema.plugin( autoIncrement.plugin , {model : 'customer' , field : 'id' , startAt : 1});
module.exports = mongoose.model('customer', CustomerSchema);
