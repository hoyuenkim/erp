const express = require('express');
const router = express.Router();
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const Excel = require('exceljs');
const multer = require('multer');
const fs = require('fs');
const moment = require('moment');

const loginRequired = require('../libs/loginRequired');

const TableModel = require('../models/TableModel');
const CustomerModel = require('../models/CustomerModel');
const StorageModel = require('../models/StorageModel');
const SalesModel = require('../models/SalesModel');
const OrderModel = require('../models/OrderModel');
const TableLogModel = require('../models/TableLogModel');

const uploadDir = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
    destination : (req, file, callback) =>{
        callback(null, uploadDir);
    },
    filename : (req, file, callback) =>{
        const date = new Date().getFullYear()+new Date().getMonth()+1;
        callback(null, `${date}_${file.originalname}`)
    }
})

const upload = multer({storage});

router.get('/server', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 5;
    const search = createSearch(req.query);
    const query = Object.assign(search.findContent);
    const count = await TableModel.count(query);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const customerList = await CustomerModel.find();
    const storageList = await StorageModel.find({type : 2, deleted : false});
    const stats = await TableModel.find(query).paginate(page, limit).populate('server.product').sort({date : -1});
    res.render('table/server', {page : page, search : search, maxPage : maxPage, urlQuery : urlQuery, stats : stats, customerList : customerList, storageList : storageList});
});

router.post('/regist/server', loginRequired, async (req, res)=>{
    if(req.body.ev === 'false'){var ev = {use : false, receive : false}} 
    else if(req.body.ev === 'true'){ var ev = {use : true, receive : false}} 
    if(req.body.parking === 'false') var parking = {use : false, receive : false};
    else if(req.body.parking === 'true'){ var parking = {use : true, receive : false}} 
    if(req.body.cctv === 'false') var cctv = {use : false, receive : false};
    else if(req.body.cctv === 'true'){ var cctv = {use : true, receive : false}} 
    if(req.body.em === 'false') var em = {use : false, receive : false};
    else if(req.body.em === 'true'){ var em = {use : true, receive : false}} 
    if(req.body.hn === 'false') var hn = {use : false, receive : false};
    else if(req.body.hn === 'true'){ var hn = {use : true, receive : false}} 
    if(req.body.op === 'false') var op = {use : false, receive : false};
    else if(req.body.op === 'true'){ var op = {use : true, receive : false}}
    const add = new TableModel({
        serial : req.body.serial, 
        subject : req.body.subject,
        customer : req.body.customer,
        date : req.body.date,
        server : JSON.parse(req.body.data),
        remarks : req.body.remark,
        manager : req.user.name,
        parking : parking,
        ev : ev,
        cctv : cctv,
        em : em,
        hn : hn,
        op : op,
        type : 1
    });
    add.save(function(err){
        if(err) console.error(err);
        res.json({message : 1});
    });
});

router.get('/onepass', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 5;
    const search = createSearch(req.query);
    const query = Object.assign(search.findContent);
    const count = await TableModel.count(query);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const customerList = await CustomerModel.find();
    const storageList = await StorageModel.find({type : 1, deleted : false});
    const stats = await TableModel.find(query).paginate(page, limit).populate('onepass.product').sort({date : -1});
    res.render('table/onepass', {page : page, search : search, maxPage : maxPage, urlQuery : urlQuery, stats : stats, customerList : customerList, storageList : storageList});
});

router.post('/regist/onepass', loginRequired, async (req, res)=>{
    try{
        const add = new TableModel({
            serial : req.body.serial, 
            subject : req.body.subject,
            customer : req.body.customer,
            date : req.body.date,
            onepass : JSON.parse(req.body.data),
            remarks : req.body.remark,
            manager : req.user.name,
            type : 0
        });
        add.save(function(err){
            if(err) console.error(err);
            res.json({message : 1});
        });
    } catch(err){
        if(err) console.error(err);
    }
});

router.get('/summary', async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query);
    const count = await TableModel.count(search.findContent);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const tableList = await TableModel.find(search.findContent).sort({date : 1}).paginate(page, limit);
    const countArr = [];
    tableList.forEach(function(table){
        countArr.push(table.getCount);
    });
    res.render('table/summary', {page : page, count : count, search : search, maxPage : maxPage, urlQuery : urlQuery, tableList : tableList})
});

router.post('/subject/remove', async (req, res)=>{
    const conf = TableModel.findOne({serial : req.body.serial});
    if(!conf) {
        res.json({message : 0});
    } else {
        await TableModel.remove({serial : req.body.serial});
        if(req.body.ship == 'true'){
            await SalesModel.remove({item_id : req.body._id});
            await StorageModel.update({}, {$inc : {stock : parseInt(req.body.unit)}});
        }
    }
});

router.post('/detail/drop/onepass', async (req, res)=>{
    console.log(req.body.product);
    await TableModel.update({serial : req.body.serial}, {$pull : {onepass : {_id : req.body._id}}});
    if(req.body.ship == 'true'){
        await SalesModel.remove({item_id : req.body._id}); 
        await StorageModel.update({_id : req.body.product}, {$inc : {stock : parseInt(req.body.unit)}});
    }
    const remain = await TableModel.findOne({serial : req.body.serial});
    if(remain && remain.server.length === 0 && remain.onepass.length === 0){
        await TableModel.remove({serial : req.body.serial});
        await res.json({message :2});
    } else {
        await res.json({message : 1});
    }
});

router.post('/detail/drop/server', async (req, res)=>{
    console.log(req.body);
    await TableModel.update({serial : req.body.serial}, {$pull : {server : {_id : req.body._id}}});
    if(req.body.ship == 'true'){
        await SalesModel.remove({item_id : req.body._id}); 
        await StorageModel.update({_id : req.body.product}, {$inc : {stock : parseInt(req.body.unit)}});
    }
    const remain = await TableModel.findOne({serial : req.body.serial});
    if(remain && remain.server.length === 0 && remain.onepass.length === 0){
        await TableModel.remove({serial : req.body.serial});
        await res.json({message :2});
    } else {
        await res.json({message : 1});
    }
}); 

router.post('/edit/confirm/onepass', loginRequired, async (req, res)=>{
    if(req.body.date === '출고일 미정') req.body.date = '';
    const urlQuery = req.body.url;
    const conf = await TableModel.findOne({serial : req.body.serial});
    if(req.body.conf == 1){
        const log = new TableLogModel({
            serial : conf.serial,
            subject : conf.subject,
            customer : conf.customer,
            manager : conf.manager,
            date : conf.date,
            onepass : conf.onepass,
            server : conf.server,
            opship : conf.opship,
            svship : conf.svship,
            type : conf.type,
            remarks : conf.remark,
            created_at : conf.created_at,
        });
        await log.save();
        const status = {
            subject : req.body.subject,
            customer : req.body.customer,
            date : req.body.date,
            onepass : JSON.parse(req.body.data),
            remarks : req.body.remarks
        }
        await OrderModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        await SalesModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        await TableModel.update({serial : req.body.serial}, {$set : status}, (err)=>{
            if(err) console.error(err);
            res.json({message : 1, urlQuery : urlQuery});
        });
    } else {
        const status = {
            subject : req.body.subject,
            customer : req.body.customer,
            date : req.body.date,
            onepass : JSON.parse(req.body.data),
            remarks : req.body.remarks
        }
        await OrderModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        await SalesModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        await TableModel.update({serial : req.body.serial}, {$set : status}, (err)=>{
            if(err) console.error(err);
            res.json({message : 1, urlQuery : urlQuery});
        });
    }
});

router.post('/edit/confirm/server', async (req, res)=>{
    if(req.body.date === '출고일 미정') req.body.date = '';
    const urlQuery = req.body.url;
    const conf = await TableModel.findOne({serial : req.body.serial});
    if(req.body.ev === 'false'){var ev = {use : false, receive : false}} 
    else if(req.body.ev === 'true'){ var ev = {use : true, receive : false}} 
    if(req.body.parking === 'false') var parking = {use : false, receive : false};
    else if(req.body.parking === 'true'){ var parking = {use : true, receive : false}} 
    if(req.body.cctv === 'false') var cctv = {use : false, receive : false};
    else if(req.body.cctv === 'true'){ var cctv = {use : true, receive : false}} 
    if(req.body.em === 'false') var em = {use : false, receive : false};
    else if(req.body.em === 'true'){ var em = {use : true, receive : false}} 
    if(req.body.hn === 'false') var hn = {use : false, receive : false};
    else if(req.body.hn === 'true'){ var hn = {use : true, receive : false}} 
    if(req.body.op === 'false') var op = {use : false, receive : false};
    else if(req.body.op === 'true'){ var op = {use : true, receive : false}}
    if(req.body.conf === 1){
        const log = new TableLogModel({
            serial : conf.serial,
            subject : conf.subject,
            customer : conf.customer,
            manager : conf.manager,
            date : conf.date,
            onepass : conf.onepass,
            server : conf.server,
            opship : conf.opship,
            svship : conf.svship,
            type : conf.type,
            remarks : conf.remark,
            created_at : conf.created_at,
        });
        await log.save();
        const status = {
            subject : req.body.subject,
            customer : req.body.customer,
            date : req.body.date,
            server : JSON.parse(req.body.data),
            parking : parking,
            ev : ev,
            cctv : cctv,
            em : em,
            hn : hn,
            op : op
        }
        await TableModel.update({serial : req.body.serial}, {$set : status});
        await OrderModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        await SalesModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        await res.json({message : 1, urlQuery : urlQuery});
    } else {
        const status = {
            subject : req.body.subject,
            customer : req.body.customer,
            date : req.body.date,
            server : JSON.parse(req.body.data),
            parking : parking,
            ev : ev,
            cctv : cctv,
            em : em,
            hn : hn,
            op : op
        }
        await TableModel.update({serial : req.body.serial}, {$set : status});
        await OrderModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        await SalesModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        await res.json({message : 1, urlQuery : urlQuery});
    }
});

router.post('/server/select', async(req, res)=>{
    StorageModel.find({type : 1, deleted : false}, (err, storageList)=>{
        res.json({storageList : storageList});
    });
});

router.post('/shipment/onepass', async(req,res)=>{
    let flag = false;
    const results = await TableModel.findOne({serial : req.body.serial}).populate('onepass.product');
    const rows = results.onepass.length;
    for(i=0;i<rows;i++){
    if(results.onepass[i].ship === false || !results.onepass[i].ship){
        const order = await OrderModel.findOne({serial : req.body.serial, product : results.onepass[i].product._id});
        if((!order || (parseInt(order.remain.received)-parseInt(order.ship)) < parseInt(results.onepass[i].unit)) && results.onepass[i].product.detail == 1){
            res.json({message : 2, product : results.onepass[i].product.product});
            flag = true;
            break;
        } else {
            await TableModel.update({serial : req.body.serial}, {$pull : {onepass : {_id : results.onepass[i]._id}}});
            await TableModel.update({serial : req.body.serial}, {$push : {onepass : {product : results.onepass[i].product._id, unit : results.onepass[i].unit, unitPrice : results.onepass[i].unitPrice, ship : true}}});
            const table = await TableModel.findOne({serial : req.body.serial});
            const length = table.onepass.length;
            const _id = table.onepass[length-1]._id;
            const date = Date.now();
            const today = moment(date).format('YYYY-MM-DD');
            const sale = new SalesModel({
                subject : req.body.subject,
                product : results.onepass[i].product._id,
                manager : req.user.name,
                serial : req.body.serial,
                customer : req.body.customer,
                unitPrice : results.onepass[i].unitPrice,
                set : results.onepass[i].unit,
                amount : parseInt(results.onepass[i].unit)*parseInt(results.onepass[i].unitPrice),
                date : today,
                shipping : today,
            status : 1,
            type : 1,
            item_id : _id,
        });
        await sale.save();
        const query = {
            dependancy : results.onepass[i]._id,
            date : Date.now(),
            unit : results.onepass.unit,
            comment : '초기현장분',
        }
        await OrderModel.update({serial : req.body.serial, product : results.onepass[i].product._id}, {$push : {as : query}});
        await OrderModel.update({serial : req.body.serial, product : results.onepass[i].product._id}, {$set : {status : 2}});
        await StorageModel.update({_id : results.onepass[i].product}, {$inc:  {stock : -parseInt(results.onepass[i].unit)}});
                }
            }
        }
        if(flag == false) res.json({message : 1});
    });
    
    router.post('/shipment/server', async(req,res)=>{
        const results = await TableModel.findOne({serial : req.body.serial});
        results.server.forEach(async function(result){
            if(result.ship === false || !result.ship){
            const date = Date.now();
            const today = moment(date).format('YYYY-MM-DD');
            const sale = new SalesModel({
                  subject : req.body.subject,//제목보내기
                  product : result.product,
                  manager : req.user.name,
                  serial : req.body.serial,
                  customer : req.body.customer,//고객보내기
                  unitPrice : result.unitPrice,
                  set : result.unit,
                  amount : parseInt(result.unit)*parseInt(result.unitPrice),
                  date : today,
                  shipping : today,
                  status : 1,
                  type : 2,
                  item_id : result._id,
            });
        await sale.save();
        await StorageModel.update({_id : result.product}, {$inc:  {stock : -parseInt(result.unit)}});
        }
    });
    const server = await TableModel.findOne({serial : req.body.serial});
    const query = [];
    server.server.forEach(async function(sv){
            query.push({_id : sv._id, product : sv.product, unit : sv.unit, unitPrice : sv.unitPrice, ship : true});
    });
    await TableModel.update({serial : req.body.serial}, {$set : {server : query}});
    await res.json({message : 1});
});

router.get('/schedule', async (req, res)=>{
    try {
        const schedules = await TableModel.find();
        res.render('table/schedule', {schedules});
    } catch(err) {
        if(err) console.error(err);
    }
});

router.get('/schedule/subject/:serial', loginRequired, async (req, res)=>{
    try {
        const status = await TableModel.findOne({serial : req.params.serial}).populate('onepass.product').populate('server.product');   
        const customer = await CustomerModel.findOne({name : status.customer});
        const order = await OrderModel.find({serial : req.params.serial});
        const serverList = await StorageModel.find({type : 2});
        const sales = await SalesModel.find({serial : req.params.serial}).populate('product');
        const opList = await StorageModel.find({type : 1 , deleted : false});
        const svList = await StorageModel.find({type : 2, deleted : false});
        res.render('table/subject', {status : status , sales : sales, op : status.onepass, sv : status.server, opList : opList, svList : svList, customer : customer, serverList : serverList});
    } catch (err) {
        if(err) console.error(err);
    }
});

router.post('/schedule/subject/:serial', upload.array('files'), async (req, res)=>{
    try{
        const filenames = [];
        req.files.map(file => {
            filenames.push({filename: file.filename})
        })
        if(req.body.date === '출고일 미정') req.body.date = '';
        let onepass = [];
        if(typeof req.body.onepassProduct === 'string'){
            onepass = [{product : req.body.onepassProduct, unit : req.body.onepassUnit, unitPrice : req.body.onepassUnitPrice, ship : req.body.opShip}];
        } else if(typeof req.body.onepassProduct === 'object'){
            for(i=0;i<req.body.onepassProduct.length;i++){
                onepass.push({product : req.body.onepassProduct[i], unit : req.body.onepassUnit[i], unitPrice : req.body.onepassUnitPrice[i], ship : req.body.opShip[i]})
            }
        }
        let server = [];
        if(typeof req.body.serverProduct === 'string'){
            server = [{product : req.body.serverProduct, unit : req.body.serverUnit, unitPrice : req.body.serverUnitPrice, ship : req.body.svShip}];
        } else if(typeof req.body.serverProduct === 'object'){
            for(i=0;i<req.body.serverProduct.length;i++){
                server.push({product : req.body.serverProduct[i], unit : req.body.serverUnit[i], unitPrice : req.body.serverUnitPrice[i], ship : req.body.svShip[i]});
            }
        }
        const table = await TableModel.findOne({serial: req.params.serial});
        const file = table.files.concat(filenames)
        const query = {
            date : req.body.date,
            onepass : onepass,
            server : server,
            files : file,
        };
        await TableModel.update({serial : req.params.serial}, {$set : query});
        await OrderModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        await SalesModel.updateMany({serial : req.body.serial}, {$set : {subject : req.body.subject}});
        res.redirect(`/table/schedule/subject/${req.params.serial}`);
    } catch(err){
        if(err) console.error(err);
    }

});


router.get('/regist', loginRequired, async (req, res)=>{
    const serverList = await StorageModel.find({type : 2});
    const customerList = await CustomerModel.find();
    res.render('table/regist', {customerList, serverList});
});

router.post('/regist', (req, res)=>{
    let onepass = [];
    if(typeof req.body.onepassProduct === 'string'){
        onepass = [{product : req.body.onepassProduct, unit : req.body.onepassUnit, unitPrice : req.body.onepassUnitPrice, ship : req.body.opShip}];
    } else if(typeof req.body.onepassProduct === 'object'){
        for(i=0;i<req.body.onepassProduct.length;i++){
            onepass.push({product : req.body.onepassProduct[i], unit : req.body.onepassUnit[i], unitPrice : req.body.onepassUnitPrice[i], ship : req.body.opShip[i]})
        }
    }
    let server = [];
    if(typeof req.body.serverProduct === 'string'){
        server = [{product : req.body.serverProduct, unit : req.body.serverUnit, unitPrice : req.body.serverUnitPrice, ship : req.body.svShip}];
    } else if(typeof req.body.serverProduct === 'object'){
        for(i=0;i<req.body.serverProduct.length;i++){
            server.push({product : req.body.serverProduct[i], unit : req.body.serverUnit[i], unitPrice : req.body.serverUnitPrice[i], ship : req.body.svShip[i]});
        }
    }
    const serial = Date.now();
    const table = new TableModel({
        serial : serial,
        subject : req.body.subject,
        customer : req.body.customer,
        date : req.body.date,
        onepass : onepass,
        server : server,
        manager : req.user.name,
        parking : {use : req.body.parking},
        ev : {use : req.body.ev},
        cctv : {use : req.body.cctv},
        em : {use : req.body.em},
        op : {use : req.body.op},
        hn : {use : req.body.hn}
    });
    table.save(function(err){
        if(err) console.error(err);
        res.redirect('/table/schedule/subject/'+serial);
    });
});

router.post('/server/stock', async (req, res)=>{
   const storage = await StorageModel.findOne({name : req.body.name});
   const stock = storage.stock - parseInt(req.body.unit);
   await StorageModel.update({name : req.body.name}, {$set : {stock : stock}});
   await res.json({message : 1});
});

router.post('/server/delete', async (req, res)=>{
    await TableModel.remove({serial : req.body.serial});
    await SalesModel.remove({serial : req.body.serial});
    res.json({message : 1});
});

router.post('/product/price', async (req, res)=>{
    const product = await StorageModel.findOne({_id : req.body.product});
    res.json({price : product.price});
});

router.post('/server/file/check', async (req, res)=>{
    const project = await TableModel.findOne({serial : req.body.serial});
    const arr = [];
    project[req.body.target].files.forEach(function(file){
        arr.push({no : file.no, name : file.name, received : false});
    });
    await TableModel.update({serial : req.body.serial}, {$set : {[req.body.target] : {use : true, files : arr}}})
    const files = project[req.body.target].files;
    res.json({message : 1, files : files});
});

router.post('/server/file/uncheck', async (req, res)=>{
   const project = await TableModel.findOne({serial : req.body.serial});
   const arr = [];
   project[req.body.target].files.forEach(function(file){
    arr.push({no : file.no, name : file.name, received : false});
   });
   await TableModel.update({serial : req.body.serial}, {$set : {[req.body.target] : {use : false, files : arr}}});
   res.json({message : 1});
});


router.post('/server/file/receive', async (req, res)=>{
    const datas = await TableModel.findOne({serial : req.body.serial});
    const arr = [];
    datas[req.body.target].files.forEach(function(data){
        if(data.no == req.body.no){
            arr.push({no : data.no, name : data.name, received : true});
        } else {
            arr.push({no: data.no, name : data.name, received : data.received})
        }
    });
    await TableModel.update({serial : req.body.serial}, {$set : {[req.body.target] : {use : true, files : arr}}});
    res.json({message : 1});
});

router.post('/server/file/receive/cancel', async (req, res)=>{
    const datas = await TableModel.findOne({serial : req.body.serial});
    const arr = [];
    datas[req.body.target].files.forEach(function(data){
        if(data.no == req.body.no){
            arr.push({no : data.no, name : data.name, received : false});
        } else {
            arr.push({no: data.no, name : data.name, received : data.received})
        }
    });
    await TableModel.update({serial : req.body.serial}, {$set : {[req.body.target] : {use : true, files : arr}}});
    res.json({message : 1});
});

router.post('/onepass/prodcuct/search', async (req, res)=>{
    let searchList = [];
    if(req.body.product){
        searchList = await StorageModel.find({product: { $regex: req.body.product, $options: 'i' }, type : 1, deleted : false});
    }
    res.json({searchList : searchList});
});

router.post('/server/prodcuct/search', async (req, res)=>{
    let searchList = [];
    if(req.body.product){
        searchList = await StorageModel.find({product: { $regex: req.body.product, $options: 'i' }, type : 2, deleted : false});
    }
    res.json({searchList : searchList});
});

router.post('/onepass/ship/each', async (req, res)=>{
    try {
        const order = await OrderModel.findOne({serial : req.body.serial, product : req.body.product});
        if((!order || (order.remain.received - order.ship) < parseInt(req.body.unit)) && req.body.detail == 1){
            res.json({message : 2});
        } else {
            const query = {
                product : req.body.product,
                unit : req.body.unit,
                unitPrice : req.body.unitPrice,
                ship : true
            };
            await TableModel.update({serial : req.body.serial}, {$pull : {onepass : {_id : req.body._id}}});
            await TableModel.update({serial : req.body.serial}, {$push : {onepass : query}});
            const item_id = await TableModel.findOne({serial : req.body.serial});
            const rows = item_id.onepass.length-1;
            const date = Date.now();
            const today = moment(date).format('YYYY-MM-DD');
            const sale = new SalesModel({
                subject : req.body.subject,
                product : req.body.product,
                manager : req.user.name,
                serial : req.body.serial,
                customer : req.body.customer,
                unitPrice : req.body.unitPrice,
                set : req.body.unit,
                amount : parseInt(req.body.unit)*parseInt(req.body.unitPrice),
                shipping : today,
                status : 1,
                type : 1,
                item_id : item_id.onepass[rows]._id,
            });
            await sale.save();
            await OrderModel.update({serial : req.body.serial, product : req.body.product}, {$push : {as : {dependancy : item_id.onepass[rows]._id, unit : req.body.unit, date : Date.now(), comment : '초기현장분'}}})
            await StorageModel.update({_id : req.body.product}, {$inc : {stock : -parseInt(req.body.unit)}});
            await res.json({id : item_id.onepass[rows]._id, shipping : today});
            }
        } catch (err){
            if(err) console.error(err);
        }
    });
    
router.post('/onepass/ship/cancel/each', async (req, res)=>{
    try {
        const query = {
            product : req.body.product,
            unit : req.body.unit,
            unitPrice : req.body.unitPrice,
            ship : false
        }
        await OrderModel.update({serial : req.body.serial, product : req.body.product}, {$pull : {as : {dependancy : req.body._id}}});
        await TableModel.update({serial : req.body.serial}, {$pull : {onepass : {_id : req.body._id}}});
        await TableModel.update({serial : req.body.serial}, {$push : {onepass : query}});
        const item_id = await TableModel.findOne({serial : req.body.serial});
        const rows = item_id.onepass.length-1;
        await StorageModel.update({_id : req.body.product}, {$inc : {stock : parseInt(req.body.unit)}});
        await SalesModel.remove({item_id : req.body._id});
        await res.json({id : item_id.onepass[rows]._id});
    } catch (err){
        if(err) console.error(err);
    }
});

router.post('/server/ship/each', async (req, res)=>{
    try {
        const query = {
            product : req.body.product,
            unit : req.body.unit,
            unitPrice : req.body.unitPrice,
            ship : true
        }
        await TableModel.update({serial : req.body.serial}, {$pull : {server : {_id : req.body._id}}});
        await TableModel.update({serial : req.body.serial}, {$push : {server : query}});
        const item_id = await TableModel.findOne({serial : req.body.serial});
        const rows = item_id.server.length-1;
        const date = Date.now();
        const today = moment(date).format('YYYY-MM-DD');
        const sale = new SalesModel({
              subject : req.body.subject,
              product : req.body.product,
              manager : req.user.name,
              serial : req.body.serial,
              customer : req.body.customer,
              unitPrice : req.body.unitPrice,
              set : req.body.unit,
              amount : parseInt(req.body.unit)*parseInt(req.body.unitPrice),
              date : today,
              shipping : today,
              status : 1,
              type : 2,
              item_id : item_id.server[rows]._id,
        });
        await StorageModel.update({_id : req.body.product}, {$inc : {stock : -parseInt(req.body.unit)}});
        await sale.save();
        await res.json({id : item_id.server[rows]._id, value : req.body._id, shipping : today});
    } catch (err){
        if(err) console.error(err);
    }
});

router.post('/server/ship/cancel/each', async (req, res)=>{
    try {
        const query = {
            product : req.body.product,
            unit : req.body.unit,
            unitPrice : req.body.unitPrice,
            ship : false
        }
        await TableModel.update({serial : req.body.serial}, {$pull : {server : {_id : req.body._id}}});
        await TableModel.update({serial : req.body.serial}, {$push : {server : query}});
        const item_id = await TableModel.findOne({serial : req.body.serial});
        const rows = item_id.server.length-1;
        await StorageModel.update({_id : req.body.product}, {$inc : {stock : parseInt(req.body.unit)}});
        await SalesModel.remove({item_id : req.body._id});
        await res.json({id : item_id.server[rows]._id});
    } catch (err){
        if(err) console.error(err);
    }
});

router.post('/server/product/unitPrice', async (req, res)=>{
    const unitPrice = await StorageModel.findOne({_id : req.body.product});
    res.json({unitPrice : unitPrice.price});
});

router.post('/subject/search', async (req, res)=>{
    const searchList = await TableModel.find({subject :{ $regex: req.body.subject, $options: 'i' }});
    res.json({searchList : searchList});
});

router.post('/statement/account', async(req, res)=>{
    const customer = await CustomerModel.findOne({name : req.body.customer});
});

router.post('/file/delete', async (req, res)=>{
    console.log(req.body.file)
    const file = path.join(__dirname, '../uploads/', req.body.filename);
    console.log(file)
    TableModel.update({serial: req.body.serial}, {$pull: {files: {_id: req.body.id}}}, (err)=>{
        if(err) console.error(err);
        fs.unlink(file, (err)=>{
            if(err) console.error(err);
            res.json({message: 1});
        });
    });
});

router.get('/delete/test', (req, res)=>{
    const file = '../upload/digi6262894.zip';
    fs.unlink(file, (err)=>{
        if(err) console.error(err);
        res.send(file);
    })
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
        if(postQueries.length>0) findContent = {$or:postQueries};
      }
      return { searchType : queries.searchType, searchText : queries.searchText, findContent : findContent}
    }

module.exports = router;