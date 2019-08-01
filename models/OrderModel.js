var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

var OrderSchema = new Schema({
  subject : String,
  serial : String,
  product : { type : mongoose.Schema.Types.ObjectId, ref : 'storage'},
  manager : String,
  customer : String,
  unit : Number,
  log : [{ 
      unit : Number,
      date : Date
  }],
  as : [{
    dependancy : String,
    date : Date,
    unit : Number,
    comment : String,
  }],
  unitPrice : Number,
  amount : Number,
  type : Number,
  status : {
    type : Number,
    default : 0
  },
  created_at : {
    type : Date,
    default : Date.now()
  },
});

OrderSchema.virtual('income').get(function(){
  if(this.log.length > 0){
  let sortingField = 'date';
  const logs = this.log.sort(function(a, b){
     return a[sortingField] - b[sortingField];;
    });
    return logs;
  } else {
    return [];
  };
});

OrderSchema.virtual('typeStatus').get(function(){
  if(this.type === 0){
    return '미정'
  }
  else if(this.type === 1){
    return '원패스';
  } else if(this.type === 2) {
    return '서버';
  } else if(this.type === 3) {
    return '자재'
  } else if(this.type === 4){
    return '기타상품'
  }
});

OrderSchema.virtual('remain').get(function(){
  const entire = this.unit;
  let received = 0;
  this.log.forEach(function(count){
    received = received + count.unit;
  });
  const remain = entire - received;
  const length = this.log.length;
  const result = {}
  result.remain = remain;
  result.received = received;
  if(this.log.length > 0){
    result.date = this.log[length-1].date.toLocaleDateString();
    result.unit = this.log[length-1].unit;
  }
  return result;
});

OrderSchema.virtual('ship').get(function(){
  let ship = 0;
  this.as.forEach(function(count){
    ship = ship + count.unit;
  });
  return ship;
});

OrderSchema.virtual('aslog').get(function(){
  if(this.as.length > 0){
    let sortingField = 'date';
    const logs = this.as.sort(function(a, b){
       return a[sortingField] - b[sortingField];;
      });
      return logs;
    } else {
      return [];
    };
});

OrderSchema.plugin( autoIncrement.plugin , {model : 'orderlog' , field : 'id' , startAt : 1});
module.exports = mongoose.model('orderlog', OrderSchema);
