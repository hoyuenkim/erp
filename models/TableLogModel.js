var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

var TableLogSchema = new Schema({
  serial : String,
  subject : String,
  customer : String,
  manager : String,
  date : Date,
  onepass : [{
    product : {type : mongoose.Schema.Types.ObjectId, ref : 'storage' },
    unit : Number,
    unitPrice : Number,
    ship : {
      type : Boolean,
      default : false
    }
  }],
  server : [{
    product : {type : mongoose.Schema.Types.ObjectId, ref : 'storage' },
    unit : Number,
    unitPrice : Number,
    ship : {
      type : Boolean,
      default : false
    }
  }],
  type : Number,
  remarks : String,
  created_at : {
    type : Date,
    default : Date.now()
  },
  static : {
    use : {
      type : Boolean,
      default : true
    },
    receive : {
      type : Boolean,
      default : false
    }
  },
  parking : {
    use : {
      type : Boolean,
      default : false
    },
    receive : {
      type : Boolean,
      default : false
    }
  },
  ev : {
    use : {
      type : Boolean,
      default : false
    },
    receive : {
      type : Boolean,
      default : false
    }
  },
  cctv : {
    use : {
      type : Boolean,
      default : false
    },
    receive : {
      type : Boolean,
      default : false
    },
  },
  em : {
    use : {
      type : Boolean,
      default : false
    },
    receive : {
      type : Boolean,
      default : false
    }
  },
  op : {
    use : {
      type : Boolean,
      default : false
    },
    receive : {
      type : Boolean,
      default : false
    }
  },
  hn : {
    use : {
      type : Boolean,
      default : false
    },
    receive : {
      type : Boolean,
      default : false
    }
  },
});

TableLogSchema.virtual('onepass_ship').get(function(){
  const entire = this.onepass.length;
  let count = 0;
  this.onepass.forEach(function(op){
    if(op.ship === true){
      count ++
    }
  });
  if(count == entire){
    return '출고완료'
  } else {
    return '미출고';
  }
});

TableLogSchema.virtual('server_ship').get(function(){
  const entire = this.server.length;
  let count = 0;
  this.server.forEach(function(sv){
    if(sv.ship === true){
      count ++
    }
  });
  if(count == entire){
    return '출고완료';
  } else {
    return '미출고';
  }
});

TableLogSchema.virtual('getDate').get(function(){
  if(!this.date){
    return '출고일 미정';
  } else {
    let dateString = '';
    dateString = dateString + this.date.getFullYear();
    dateString = dateString + '-' + Number(this.date.getMonth()+1);
    dateString = dateString + '-' + this.date.getDate();
    return dateString;
  }
});

TableLogSchema.virtual('count').get(function(){
  let count = 0;
  if(this.static.use === true) count ++;
  if(this.ev.use === true) count ++;
  if(this.em.use === true) count ++;
  if(this.hn.use === true) count ++;
  if(this.cctv.use === true) count ++;
  if(this.op.use === true) count ++;
  if(this.parking.use === true) count ++;
  return count;
});

TableLogSchema.virtual('countFile').get(function(){
  let count = 0;
  if(this.static.receive === true) count ++;
  if(this.ev.receive === true) count ++;
  if(this.em.receive === true) count ++;
  if(this.hn.receive === true) count ++;
  if(this.cctv.receive === true) count ++;
  if(this.op.receive === true) count ++;
  if(this.parking.receive === true) count ++;
  return count;
});

TableLogSchema.virtual('getCount').get(function(){
  let result = '';
  if(this.hn.use === true) result = result + '홈넷, ';
  if(this.op.use === true) result = result + '원패스, ';
  if(this.em.use === true) result = result + '비상호출, ' ;
  if(this.ev.use === true) result = result + '엘리베이터, ';
  if(this.cctv.use === true) result = result + 'CCTV, ' ;
  if(this.parking.use === true) result = result + '주차, ';
  return result;
});

TableLogSchema.plugin( autoIncrement.plugin , {model : 'tablelog' , field : 'id' , startAt : 1});
module.exports = mongoose.model('tablelog', TableLogSchema);
