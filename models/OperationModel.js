const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');

const  OperationSchema = new Schema({
    customer : {type : mongoose.Schema.Types.ObjectId, ref : 'customer'},
    product : {type : mongoose.Schema.Types.ObjectId, ref : 'storage'},
    unit : Number,
    parts : [
        {
       product : {type : mongoose.Schema.Types.ObjectId, ref : 'storage'},
            unit : {
                type: Number,
                default : 0
            }
        }   
    ],
    manager : {type : mongoose.Schema.Types.ObjectId, ref : 'user'},
    amount : Number,
    date : Date,
    created_at :{
        type : Date,
        default : Date.now()
    },
    status : {
        type : Number,
        default : 0
    },
    log : [{ 
        unit : Number,
        date : Date
    }],
    dependancy : {type : mongoose.Schema.Types.ObjectId, ref : 'orderlog'},
  });

OperationSchema.virtual('income').get(function(){
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

  OperationSchema.virtual('remain').get(function(){
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

OperationSchema.plugin( autoIncrement.plugin , {model : 'operationlog' , field : 'id' , startAt : 1});
module.exports = mongoose.model('operationlog', OperationSchema);
  