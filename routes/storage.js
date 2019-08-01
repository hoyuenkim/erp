const express = require('express');
const router = express.Router();
const loginRequired = require('../libs/loginRequired');

const StorageModel = require('../models/StorageModel');
const CustomerModel = require('../models/CustomerModel');
const TableModel = require('../models/TableModel');
const OrderModel = require('../models/OrderModel');
const MaterialModel = require('../models/MaterialModel');

router.get('/home', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const count = await StorageModel.count(search.findContent);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const storages = await StorageModel.find(search.findContent).paginate(page, limit);
    res.render('storage/home', {page : page, limit : limit, search : search, count : count, maxPage : maxPage, urlQuery : urlQuery, storages : storages, conf : 'home'});
});

router.get('/regist', loginRequired, (req, res)=>{
    res.render('storage/regist', {product : "", edit : false});
});


router.get('/server', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const query = Object.assign(search.findContent, {type : 2});
    const count = await StorageModel.count(query);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const storages = await StorageModel.find(query).paginate(page, limit);
    res.render('storage/home', {page : page, limit : limit, search : search, count : count, maxPage : maxPage, urlQuery : urlQuery, storages : storages, conf : 'server'});
});

router.get('/onepass', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const query = Object.assign(search.findContent, {type : 1});
    const count = await StorageModel.count(query);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const storages = await StorageModel.find(query).paginate(page, limit);
    res.render('storage/home', {page : page, limit : limit, search : search, count : count, maxPage : maxPage, urlQuery : urlQuery, storages : storages, conf : 'onepass'});
});

router.get('/parts',  loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const query = Object.assign(search.findContent, {type : 3});
    const count = await StorageModel.count(query);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const storages = await StorageModel.find(query).paginate(page, limit);
    res.render('storage/home', {page : page, limit : limit, search : search, count : count, maxPage : maxPage, urlQuery : urlQuery, storages : storages, conf : 'parts'});
});

router.get('/unknown', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const query = Object.assign(search.findContent, {type : 0});
    const count = await StorageModel.count(query);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const storages = await StorageModel.find(query).paginate(page, limit);
    res.render('storage/home', {page : page, limit : limit, search : search, count : count, maxPage : maxPage, urlQuery : urlQuery, storages : storages, conf : 'unknown'});
});

router.post('/regist', (req, res)=>{
    const storage = new StorageModel({
        product : req.body.product,
        stock : req.body.stock,
        type : req.body.type,
        cost : req.body.cost,
        price : req.body.price,
        detail : req.body.detail,
        deleted : false,
    });
    storage.save(function(err){
        if(err) console.error(err);
        res.redirect('/storage/home');
    });
});

router.get('/edit/:id', loginRequired, async (req, res)=>{
    const product = await StorageModel.findOne({id : req.params.id});
    res.render('storage/regist', {product : product, edit : true});
});

router.post('/edit/:id', async (req, res)=>{
    console.log(req.body.detail)
    const query = {
        product : req.body.product,
        stock : req.body.stock,
        type : req.body.type,
        detail : req.body.detail,
        price : req.body.price,
    };
    let redirect = '';
    if(req.body.type == 1) redirect = 'onepass';
    if(req.body.type == 2) redirect = 'server';
    if(req.body.type == 3) redirect = 'parts';
    StorageModel.update({id : req.params.id}, {$set : query}, (err)=>{
        if(err) console.error(err);
        res.redirect('/storage/'+redirect);
    });
});

router.post('/subject/conf', async (req, res)=>{
    try{
        const conf = await StorageModel.findOne({product : req.body.product});
        if(!conf){
            res.json({message : true, product: req.body.product});
        } else {
            res.json({message : false, objId : conf._id});
        }
    } catch(err){
        console.error(error);
    }
});

router.post('/subject/regist', async (req, res)=>{
    const storage = new StorageModel({
        product : req.body.product,
        deleted : false,
    });
    storage.save(function(err){
        if(err) console.error(err);
        res.json({message : true, product : req.body.product, objId : storage._id});
    });
});

router.post('/delete', (req, res)=>{
    StorageModel.update({id : req.body.id}, {$set : {deleted : true}}, (err)=>{
        if(err) console.error(err);
        res.json({message : 1});
    });
});

router.post('/product/auth', async (req, res)=>{
    StorageModel.findOne({product : req.body.product}, (err, conf)=>{
        if(err) console.error(err);
        if(conf){
            res.json({message : 1});
        } else {
            res.json({message : 0})
        }
    });
});

router.post('/recovery', (req, res)=>{
    StorageModel.update({id : req.body.id}, {$set : {deleted : false}}, (err)=>{
        if(err) console.error(err);
        res.json({message : 1});
    });
});

router.get('/as', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const urlQuery = req._parsedUrl.query;
    const query = Object.assign(search.findContent, {type : 1})
    const count = await OrderModel.count(query);
    const maxPage = Math.ceil(count/limit);
    const logs = await OrderModel.find(query).populate('product');
    res.render('storage/as/home', {logs, search, maxPage, page, urlQuery})
});

router.get('/as/site/:id', async (req, res)=>{
    const logs = await OrderModel.findOne({id : req.params.id});
    res.render('storage/as/site', {logs});
});

function createSearch(queries){
    var findContent = {};
    if(queries.searchType && queries.searchText && queries.searchText.length >= 1){
        var searchTypes = queries.searchType.toLowerCase().split(",");
        var postQueries = [];
        if(searchTypes.indexOf("product")>=0){
        postQueries.push({product : {$regex : new RegExp(queries.searchText, "i")}});
        }
        if(searchTypes.indexOf("subject")>=0){
            postQueries.push({subject : {$regex : new RegExp(queries.searchText, "i")}});
            }
        if(postQueries.length>0) findContent = {$or:postQueries};
      }
      return { searchType : queries.searchType, searchText : queries.searchText, findContent : findContent}
    }

module.exports = router;