var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

var SalesSchema = new Schema({
  subject : {
    type : String,
    default : ''
  },
  product : {type : mongoose.Schema.Types.ObjectId, ref : 'storage'},
  manager : String,
  serial : String,
  customer : String,
  unitPrice : Number,
  set : Number,
  amount : Number,
  status : {
    type : Number,
    default : 0
  },
  date : Date,
  shipping : Date,
  type : Number,
  created_at : {
    type : Date,
    default : Date.now()
  },
  item_id : String,
});

SalesSchema.virtual('totalAmount').get(function(){
  const amount = this.set * this.unitPrice
  return amount;
});

SalesSchema.virtual('typeStatus').get(function(){
  if(this.type === 0){
    return '미정'
  }
  else if(this.type === 1){
    return '원패스';
  } else if(this.type === 2) {
    return '서버';
  }
});

SalesSchema.virtual('shipdate').get(function(){
  if(this.shipping){
    return this.shipping.toLocaleDateString();
  } else {
    return '출고전'
  }
});

SalesSchema.plugin( autoIncrement.plugin , {model : 'saleslog' , field : 'id' , startAt : 1});
module.exports = mongoose.model('saleslog', SalesSchema);
