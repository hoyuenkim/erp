const express = require('express');
const router = express.Router();
const loginRequired = require('../libs/loginRequired');

const CustomerModel = require('../models/CustomerModel');
const StorageModel = require('../models/StorageModel');

router.get('/home', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const count = await CustomerModel.count(search.findContent);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const customers = await CustomerModel.find(search.findContent).paginate(page, limit);
    res.render('customer/home', {page : page, search : search, count : count, maxPage : maxPage, urlQuery : urlQuery, customers : customers});
});

router.get('/company/:id', loginRequired, (req, res)=>{
    CustomerModel.findOne({id : req.params.id}, (err, customer)=>{
        if(err) console.error(err);
        res.render('customer/regist', {customer : customer});
    });
});

router.post('/company/:id', (req, res)=>{
    const customer ={
        name : req.body.name,
        ceo : req.body.ceo,
        attention : req.body.attention,
        email : req.body.email,
        bizcode : req.body.bizcode,
        phone : req.body.phone,
        addr : req.body.addr,
        addr_detail : req.body.addr_detail
    };
    CustomerModel.update({id : req.params.id}, {$set : customer}, (err)=>{
        if(err) console.error(err);
        res.redirect('/customer/home')
    });
});

router.get('/regist', loginRequired, (req, res)=>{
    res.render('customer/regist', {customer : ""});
});

router.post('/regist', (req, res)=>{
    const customer = new CustomerModel({
        name : req.body.name,
        ceo : req.body.ceo,
        attention : req.body.attention,
        email : req.body.email,
        bizcode : req.body.bizcode,
        phone : req.body.phone,
        addr : req.body.addr,
        addr_detail : req.body.addr_detail
    });
    customer.save((err)=>{
        if(err) console.error(err);
        res.redirect('/customer/home');
    });
});


router.post('/auth/name', (req, res)=>{
    CustomerModel.findOne({name : req.body.name}, (err, conf)=>{
        if(err) console.error(err);
        if(conf) {
            res.json({message : 1});
        } else {
            res.json({message : 0});
        }
    });
});

router.post('/auth/email', (req, res)=>{
    CustomerModel.findOne({email : req.body.email}, (err, conf)=>{
        if(err) console.error(err);
        if(conf) {
            res.json({message : 1});
        } else {
            res.json({message : 0});
        }
    });
});

router.post('/auth/bizcode', (req, res)=>{
    CustomerModel.findOne({bizcode : req.body.bizcode}, (err, conf)=>{
        if(conf) {
            res.json({message : 1});
        } else {
            res.json({message : 0});
        }
    });
});


router.post('/data', (req, res)=>{
    CustomerModel.findOne({name : req.body.customer}, (err, customer)=>{
        if(err) console.error(err);
        res.json({customer : customer});
    });
});

function createSearch(queries){
    var findContent = {};
    if(queries.searchType && queries.searchText && queries.searchText.length >= 1){
        var searchTypes = queries.searchType.toLowerCase().split(",");
        var postQueries = [];
        if(searchTypes.indexOf("name")>=0){
        postQueries.push({name : {$regex : new RegExp(queries.searchText, "i")}});
        }
        if(searchTypes.indexOf("attention")>=0){
        postQueries.push({attention : {$regex : new RegExp(queries.searchText, "i")}});
        }
        if(postQueries.length>0) findContent = {$or:postQueries};
      }
      return { searchType : queries.searchType, searchText : queries.searchText, findContent : findContent}
    }

module.exports = router;