var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

const MaterialSchema = new Schema({
    product : {type : mongoose.Schema.Types.ObjectId, ref : 'storage'}
    ,
    parts : [
        {
            product : {type : mongoose.Schema.Types.ObjectId, ref : 'storage'},
            unit : Number,
        }
    ],
    create_at : {
        type : Date,
        default : Date.now()
    },
});

MaterialSchema.plugin( autoIncrement.plugin , {model : 'material' , field : 'id' , startAt : 1});
module.exports = mongoose.model('material', MaterialSchema);
