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
const StorageModel = require('../models/StorageModel');
const TableModel = require('../models/TableModel');

router.get('/home', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const count = await SalesModel.count(search.findContent);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const salesLog = await SalesModel.find(search.findContent).populate('product').paginate(page, limit);
    res.render('logs/sales/home', {page : page, search : search, count : count, maxPage : maxPage, urlQuery : urlQuery, salesLog : salesLog});
});

router.post('/shipping', async (req, res)=>{
    const date = Date.now();
    const today = moment(date).format('YYYY-MM-DD');
    const product = await TableModel.findOne({serial : req.body.serial});
    try{
            await StorageModel.update({product : req.body.product}, {$inc : {stock : -req.body.unit}});
            await SalesModel.update({id : req.body.id}, {$set : {status : 1, shipping : today}});
            res.json({message : 0, shipping: today});
    } catch(err){
        if(err) console.error(err);
    }
});

router.post('/shipping/cancel', async (req, res)=>{
    try{
        const date = Date.now();
        const today = moment(date).format('YYYY-MM-DD');
        const product = await StorageModel.findOne({product : req.body.product});
        if(!req.body._id){
            await StorageModel.update({product : req.body.product}, {$inc : {stock : req.body.unit}});
            await SalesModel.update({id : req.body.id}, {$set : {status : 1, shipping : today}});
            res.json({message : 0});
        } else if (req.body._id && req.body.type == 1){
            await TableModel.update({serial : req.body.serial}, {$pull : {onepass : {_id : req.body._id}}});
            await TableModel.update({serial : req.body.serial}, {$push : {onepass : {product : product._id, unit : req.body.unit, unitPrice : req.body.unitPrice, ship : false}}});
            await SalesModel.remove({item_id : req.body._id});
            await StorageModel.update({product : req.body.product}, {$inc : {stock : parseInt(req.body.unit)}});
            res.json({message : 1, shipping: today});
        } else if(req.body._id && req.body.type == 2){
            await TableModel.update({serial : req.body.serial}, {$pull : {server : {_id : req.body._id}}});
            await TableModel.update({serial : req.body.serial}, {$push : {server : {product : product._id, unit : req.body.unit, unitPrice : req.body.unitPrice, ship : false}}});
            await SalesModel.remove({item_id : req.body._id});
            await StorageModel.update({product : req.body.product}, {$inc : {stock : parseInt(req.body.unit)}});
            res.json({message : 1, shipping: today});
        }
    } catch(err){
        console.error(err);
    }
    });
    
router.get('/edit/:id', loginRequired, async (req, res)=>{
    const storageList = await StorageModel.find();
    const data = await SalesModel.findOne({id : req.params.id});
    const sales = await SalesModel.findOne({id : req.params.id}).populate('product');
        res.render('logs/sales/edit', {sales : sales, product : data.product, storageList : storageList});
});

router.post('/edit/:id', async (req, res)=>{
    try { 
        if(!req.body._id){
            const query = {
                set : req.body.set,
                unitPrice : req.body.unitPrice,
                amount : req.body.amount,
                shipping : req.body.shipping
            };
            await SalesModel.update({id : req.params.id}, {$set : query});
            res.redirect('/sales/edit/'+req.params.id);
        } else if(req.body._id && req.body.type == 1){
            const query = {
                product : req.body.product,
                unit : req.body.set,
                unitPrice : req.body.unitPrice,
                ship : true,
            };
            await TableModel.update({serial : req.body.serial}, {$pull : {onepass : {_id : req.body._id}}});
            await TableModel.update({serial : req.body.serial}, {$push : {onepass : query}});
            const item_id = await TableModel.findOne({serial : req.body.serial});
            const rows = item_id.onepass.length - 1;
            const data = {
                set : req.body.set,
                unitPrice : req.body.unitPrice,
                amount : req.body.amount,
                item_id : item_id.onepass[rows]._id,
                shipping :req.body.shipping
            }
            await SalesModel.update({id :req.params.id}, {$set : data});
            const minus = parseInt(req.body.set) - parseInt(req.body.og_set);
            await StorageModel.update({product : req.body.pdt}, {$inc :{stock : - minus}});
                res.redirect('/sales/edit/'+req.params.id);
            } else if(req.body._id && req.body.type == 2) {
            const query = {
                product : req.body.product,
                unit : req.body.set,
                unitPrice : req.body.unitPrice,
                ship : true,
            };
            await TableModel.update({serial : req.body.serial}, {$pull : {server : {_id : req.body._id}}});
            await TableModel.update({serial : req.body.serial}, {$push : {server : query}});
            const item_id = await TableModel.findOne({serial : req.body.serial});
            const rows = item_id.server.length - 1;
            const data = {
                set : req.body.set,
                unitPrice : req.body.unitPrice,
                amount : req.body.amount,
                item_id : item_id.server[rows]._id,
                shipping :req.body.shipping
            }
            await SalesModel.update({id : req.params.id}, {$set : data});
            const minus = parseInt(req.body.set) - parseInt(req.body.og_set);
            await StorageModel.update({product : req.body.pdt}, {$inc :{stock : - minus}});
                res.redirect('/sales/edit/'+req.params.id);
             }
        } catch(err){
            if(err) console.error(err);
        }
    });

    router.get('/edit/table/:id', loginRequired, async (req, res)=>{
        const storageList = await StorageModel.find();
        const data = await SalesModel.findOne({id : req.params.id});
        const sales = await SalesModel.findOne({id : req.params.id}).populate('product');
            res.render('logs/sales/edit', {sales : sales, product : data.product, storageList : storageList});
    });
    
    router.post('/edit/table/:id', async (req, res)=>{
        try {
             if(req.body.type == 1){
                const query = {
                    product : req.body.product,
                    unit : req.body.set,
                    unitPrice : req.body.unitPrice,
                    ship : true,
                };
                await TableModel.update({serial : req.body.serial}, {$pull : {onepass : {_id : req.body._id}}});
                await TableModel.update({serial : req.body.serial}, {$push : {onepass : query}});
                const item_id = await TableModel.findOne({serial : req.body.serial});
                const rows = item_id.onepass.length - 1;
                const data = {
                    set : req.body.set,
                    unitPrice : req.body.unitPrice,
                    amount : req.body.amount,
                    item_id : item_id.onepass[rows]._id,
                    shipping :req.body.shipping
                }
                await SalesModel.update({id :req.params.id}, {$set : data});
                const minus = parseInt(req.body.set) - parseInt(req.body.og_set);
                await StorageModel.update({product : req.body.pdt}, {$inc :{stock : - minus}});
                res.redirect('/table/schedule/subject/'+req.body.serial);
                } else if(req.body.type == 2) {
                const query = {
                    product : req.body.product,
                    unit : req.body.set,
                    unitPrice : req.body.unitPrice,
                    ship : true,
                };
                await TableModel.update({serial : req.body.serial}, {$pull : {server : {_id : req.body._id}}});
                await TableModel.update({serial : req.body.serial}, {$push : {server : query}});
                const item_id = await TableModel.findOne({serial : req.body.serial});
                const rows = item_id.server.length - 1;
                const data = {
                    set : req.body.set,
                    unitPrice : req.body.unitPrice,
                    amount : req.body.amount,
                    item_id : item_id.server[rows]._id,
                    shipping :req.body.shipping
                }
                await SalesModel.update({id : req.params.id}, {$set : data});
                const minus = parseInt(req.body.set) - parseInt(req.body.og_set);
                await StorageModel.update({product : req.body.pdt}, {$inc :{stock : - minus}});
                    res.redirect('/table/schedule/subject/'+req.body.serial);
                 }
            } catch(err){
                if(err) console.error(err);
            }
        });

router.post('/delete', async (req, res)=>{
    try{   
        if(!req.body._id){
            await SalesModel.remove({id : req.body.id});
            await StorageModel.update({product : req.body.product}, {$inc : {stock : parseInt(req.body.unit)}});
            await res.json({message : 1});
        } else if(req.body._id && req.body.type == 1){
            console.log('onpass : delete');
            await TableModel.update({serial : req.body.serial}, {$pull : {onepass : {_id : req.body._id}}});
            await SalesModel.remove({id : req.body.id});
            await StorageModel.update({product : req.body.product}, {$inc : {stock : parseInt(req.body.unit)}});
            const remain = await TableModel.findOne({serial : req.body.serial});
            if(remain && remain.server.length === 0 && remain.onepass.length === 0){
                await TableModel.remove({serial : req.body.serial});
                await res.json({message : 1});
            } else {
                await res.json({message : 1});
            }
        } else if(req.body._id && req.body.type == 2){
            console.log('server : delete');
            await TableModel.update({serial : req.body.serial}, {$pull : {server : {_id : req.body._id}}});
            await SalesModel.remove({id : req.body.id});
            await StorageModel.update({product : req.body.product}, {$inc : {stock : parseInt(req.body.unit)}});
            const remain = await TableModel.findOne({serial : req.body.serial});
            if(remain && remain.server.length === 0 && remain.onepass.length === 0){
                await TableModel.remove({serial : req.body.serial});
                await res.json({message : 1});
            } else {
                await res.json({message : 1});
            }
        };
    } catch(err){
        if(err) console.error(err);
    }
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