var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

var StorageSchema = new Schema({
  product : String,
  stock : {
    type : Number,
    default : 0
  },
  cost : {
    type : Number,
    default : 0
  },
  price : {
    type : Number,
    default : 0
  },
  type : {
    type : Number,
    default : 0
  },
  detail : Number,
  created_at : {
    type : Date,
    default : Date.now()
  },
  deleted : {
    type : Boolean,
    default : false
  },
});

StorageSchema.virtual('stat').get(function(){
  let data;
  let stat = this.type;
  if(stat === 0){
    data = '미정';
  }
  else if(stat === 1){
    data = '원패스';
  } else if(stat === 2) {
    data = '서버';;
  } else if(stat === 3){
    data = '자재';
  } else if(stat ===4){
    data = '재공품'
  }
  return data;
});

StorageSchema.plugin( autoIncrement.plugin , {model : 'storage' , field : 'id' , startAt : 1});
module.exports = mongoose.model('storage', StorageSchema);
