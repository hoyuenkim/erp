const express = require('express');
const router = express.Router();
const path = require('path');
const Excel = require('exceljs');
const moment = require('moment');
const tz = require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

const loginRequired = require('../libs/loginRequired');

const CustomerModel = require('../models/CustomerModel');
const SalesModel = require('../models/SalesModel');
const OrderModel = require('../models/OrderModel');
const StorageModel = require('../models/StorageModel');
const TableModel = require('../models/TableModel');

router.get('/home', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const count = await OrderModel.count(search.findContent);
    const pre = await OrderModel.count({status : 0});
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const orderLog = await OrderModel.find(search.findContent).populate('product').paginate(page, limit);
    res.render('logs/order/home', {page : page, search : search, count : count, maxPage : maxPage, urlQuery : urlQuery, orderLog : orderLog, pre : pre});
});

router.post('/delete', async (req, res)=>{
    const conf = await OrderModel.findOne({id : req.body.id});
    if(conf.status === 1) await StorageModel.update({product : req.body.product}, {$inc : {stock : -req.body.unit}});
    await OrderModel.remove({id : req.body.id});
    res.json({message : 1});
});

router.get('/edit/:id', async (req, res)=>{
    const order = await OrderModel.findOne({id : req.params.id}).populate('product');
    res.render('logs/order/edit', {order : order});
});

router.post('/edit/:id', async (req, res)=>{
    const query = {
        unit : req.body.unit,
        unitPrice : req.body.unitPrice,
        amount : req.body.amount
    };
    await OrderModel.update({serial : req.params.id}, {$set : query});
    await res.redirect('/order/edit/'+req.params.id);
});

router.post('/product/search', async (req, res)=>{
    let searchList = [];
    if(req.body.product){
        searchList = await StorageModel.find({product: { $regex: req.body.product, $options: 'i' }});
    }
    res.json({searchList : searchList});
});

router.post('/income', async (req, res)=>{
    const today = new Date();
    const query = {
        unit : req.body.remain,
        date : today
    };
    console.log(req.body.id);
    await OrderModel.update({id : req.body.id}, {$push : {log : query}});
    await StorageModel.update({_id : req.body._id}, {$inc : {stock: req.body.remain}});
    await res.json({date : today.toLocaleDateString()});
});

router.post('/log/regist', async (req, res)=>{
    const query = {
        unit : req.body.unit,
        date : req.body.date
    };
    await OrderModel.update({id : req.body.id}, {$push : {log : query}});
    const log = await OrderModel.findOne({id : req.body.id});
    const length = log.log.length;
    const _id = log.log[length-1]._id;
    await StorageModel.update({_id : req.body.product}, {$inc : {stock : req.body.unit}});
    await res.json({date : req.body.date, unit : req.body.unit, _id : _id});
});

router.post('/log/edit', async (req, res)=>{
    const log = await OrderModel.findOne({id : req.body.id});
    const minus = parseInt(req.body.former) - parseInt(req.body.unit);
    const arr = [];
    log.log.forEach(function(data){
        let query = {};
        if(data._id == req.body._id){
                query._id = req.body._id,
                query.unit = req.body.unit,
                query.date = req.body.date
        } else {
            query._id = data._id,
            query.unit = data.unit,
            query.date = data.date
        }
        arr.push(query);
    });
    await OrderModel.update({id : req.body.id}, {$set : {log : arr}});
    await StorageModel.update({_id : req.body.product}, {$inc : {stock : minus}});
    await res.json({date : req.body.date, unit : req.body.unit, _id : req.body._id});
});

router.post('/log/delete', async (req, res)=>{
    try{
        if(req.body._id){
            await OrderModel.update({id : req.body.id}, {$pull : {log : {_id : req.body._id}}});
            await StorageModel.update({_id : req.body.product}, {$inc : {stock : -req.body.unit}});
            res.json({message : 1});
        } else {
            res.json({message : 0});
        }
    } catch(err){
        console.error(err);
    }
});

router.post('/as/delete', async (req, res)=>{
    try{
        await OrderModel.update({id : req.body.id}, {$pull : {as : {_id : req.body._id}}});
        const onepass = await TableModel.findOne({subject : req.body.subject});
        const arr = [];
        onepass.onepass.forEach(function(op){
            let obj = {}
            if(op._id == req.body.dependancy){
                obj.product = op.product,
                obj._id = op._id,
                obj.unit = req.body.unit,
                obj.unitPrice = op.unitPrice,
                obj.ship = false
            } else {
                obj.product = op.product,
                obj._id = op._id,
                obj.unit = op.unit,
                obj.unitPrice = op.unitPrice,
                obj.ship = op.ship
            }
            arr.push(obj);
        });
    await TableModel.update({subject : req.body.subject}, {$set : {onepass: arr}});
    await SalesModel.remove({item_id : req.body.dependancy});
    const conf = await StorageModel.findOne({_id : req.body.product});
    console.log(conf.product);
    await StorageModel.update({_id : req.body.product}, {$inc : {stock : -req.body.unit}});
    res.json({message : 1});
    } catch (err){
       if(err) console.error(err)
    }
});

router.post('/as/edit', async (req, res)=>{
    try{
        console.log(req.body.unit);
        const order = await OrderModel.findOne({id: req.body.id});
        const arr = [];
        order.as.forEach(function(log){
            let obj = {};
            if(log._id == req.body._id){
                obj._id = log._id;
                obj.date = req.body.date;
                obj.unit = req.body.unit;
                obj.comment = req.body.comment;
            } else {
                obj._id = log._id;
                obj.date = log.date;
                obj.unit = log.unit;
                obj.comment = log.comment;
            }
            console.log(obj);
            arr.push(obj);
        });
        await StorageModel.update({_id : req.body.product}, {$inc : {stock : -req.body.unit}});
        await OrderModel.update({id : req.body.id}, {$set : {as : arr}});
        res.json({message : 1});
    } catch (err) {
        if(err) console.error(err);
    }
});

router.post('/as/regist', async (req, res)=>{
    let obj = {};
            obj.date = req.body.date;
            obj.unit = req.body.unit;
            obj.comment = req.body.comment;
    await OrderModel.update({id : req.body.id}, {$push : {as : obj}});
    const order = await OrderModel.findOne({id : req.body.id});
    const length = order.as.length-1;
    const _id = order.as[length]._id;
    await StorageModel.update({_id : req.body.product}, {$inc : {stock : -req.body.unit}});
    res.json({message : 1, _id});
});


function createSearch(queries){
    var findContent = {};
    if(queries.searchType && queries.searchText && queries.searchText.length >= 1){
        var searchTypes = queries.searchType.toLowerCase().split(",");
        var postQueries = [];
        if(searchTypes.indexOf("subject")>=0){
        postQueries.push({subject : {$regex : new RegExp(queries.searchText, "i")}});
        }
        if(searchTypes.indexOf("customer")>=0){
        postQueries.push({customer : {$regex : new RegExp(queries.searchText, "i")}});
        }
        if(searchTypes.indexOf("product")>=0){
        postQueries.push({product : {$regex : new RegExp(queries.searchText, "i")}});
        }
        if(postQueries.length>0) findContent = {$or:postQueries};
      }
      return { searchType : queries.searchType, searchText : queries.searchText, findContent : findContent}
    }

module.exports = router;
