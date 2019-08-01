const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StandardSchema = new Schema({
    // name : String,
    id : {
      type : String,
      default : Date.now() 
    },
    created_at : {
      type : Date,
      default : Date.now()
    },
    //please config your db Schema
  });

  module.exports = mongoose.model('standard', StandardSchema);
  