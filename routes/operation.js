const express = require('express');
const router = express.Router();
const path = require('path');
const Excel = require('exceljs');
const moment = require('moment');
const tz = require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");
const nodemailer = require('nodemailer');

const loginRequired = require('../libs/loginRequired');

const StorageModel = require('../models/StorageModel');
const MaterialModel = require('../models/MaterialModel');
const CustomerModel = require('../models/CustomerModel');
const OperationModel = require('../models/OperationModel');

router.post('/parts/search', async (req, res)=>{
    let searchList = [];
    if(req.body.product) searchList = await StorageModel.find({type : 3, product: { $regex: req.body.product, $options: 'i' }});
    if(searchList.length == 0){
        res.json({message : 0, searchList});
    } else {
        res.json({searchList});
    }
});

router.post('/product/search', async (req, res)=>{
    let searchList = [];
    if(req.body.product) searchList = await StorageModel.find({$or : [{type : 3}, {type : 1}], product: { $regex: req.body.product, $options: 'i' }});
    res.json({searchList : searchList});
});

router.post('/subject/search', async (req, res)=>{
    let searchList = [];
    const storages = await StorageModel.find({product: { $regex: req.body.subject, $options: 'i' }});
    const materials = await MaterialModel.find();
    const arr = [];
    materials.forEach(function(material){
        let product = JSON.stringify(material.product);
        arr.push(product);
    });
    storages.forEach(function(storage){
        console.log(arr.indexOf(JSON.stringify(storage._id)))
        if(arr.indexOf(JSON.stringify(storage._id)) == -1){
            searchList.push(storage);
        }
    });
    res.json({searchList : searchList});
});

router.post('/storage/regist', async(req, res)=>{
    const product = new StorageModel({
        product : req.body.subject,
        type : 3,
    });
    product.save(function(err){
        if(err) console.error(err);
        res.json({product : req.body.subject})
    });
});

router.post('/parts/regist', async (req, res)=>{
    const storage = new StorageModel({
        product : req.body.product,
        deleted : false,
        type : 3,
    });
    storage.save((err)=>{
        if(err) console.error(err);
        res.json({message : 1});
    });
});

router.get('/material/home', loginRequired, async (req, res)=>{
    let page = 1;
    if(req.query.page) page = req.query.page;
    const limit = 10;
    const search = createSearch(req.query) 
    const count = await MaterialModel.count(search.findContent);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const materialList = await MaterialModel.find(search.findContent).sort({id : -1}).populate('parts.product').populate('product');
    res.render('operation/material/home', {page : page, maxPage : maxPage, urlQuery : urlQuery, materialList : materialList, search : search});
});

router.get('/material/regist', loginRequired, (req, res)=>{
    res.render('operation/material/editor', {material : ""});
});

router.post('/material/regist', (req, res)=>{
    if(typeof req.body.parts === 'string'){
        const material = new MaterialModel({
            product : req.body.product,
            parts : {product : req.body.parts, unit : req.body.unit}
        });
        material.save(function(err){
            if(err) console.error(err);
                res.redirect('/material/home');
        });
    } else {
        parts = [];
        for(i=0;i<req.body.parts.length;i++){
            parts.push({product : req.body.parts[i], unit : req.body.unit[i]});
        }
        const material = new MaterialModel({
            product : req.body.product,
            parts : parts
        });
        material.save(function(err){
            if(err) console.error(err)
                res.redirect('/material/home');
        });
    }
});

router.get('/material/edit/:id', loginRequired, async (req, res)=>{
    const material = await MaterialModel.findOne({id : req.params.id}).populate('parts.product').populate('product');
    res.render('operation/material/editor', {material : material});
});

router.post('/material/edit/:id', (req, res)=>{
    if(typeof req.body.parts === 'string'){
        const query = {
            product : req.body.product,
            parts : {product : req.body.parts, unit : req.body.unit}
        };
        MaterialModel.update({id : req.params.id}, {$set : query}, function(err){
            if(err) console.error(err);
            res.redirect('/');
        });
    } else {
        parts = [];
        for(i=0;i<req.body.product.length;i++){
            parts.push({product : req.body.parts[i], unit : req.body.unit[i]});
        }
        const query = {
            subject : req.body.subjectid,
            parts : parts
        };
        MaterialModel.update({id : req.params.id}, {$set : query}, function(err){
            if(err) console.error(err)
            res.redirect('/')
        });
    }
});

router.post('/material/find', async (req, res)=>{
    let searchList = [];
    const storages = await StorageModel.find({product: { $regex: req.body.product, $options: 'i' }});
    const materials = await MaterialModel.find();
    const arr = [];
    materials.forEach(function(material){
        let product = JSON.stringify(material.product);
        arr.push(product);
    });
    storages.forEach(function(storage){
        if(arr.indexOf(JSON.stringify(storage._id)) != -1){
            searchList.push(storage);
        }
    });
    res.json({searchList : searchList});
});

router.get('/storage/home', async (req, res)=>{
    let page = 1;
    if(req.query,page) page = req.query.page;
    const lists  = await MaterialModel.find();
    const limit = 10;
    const search = createSearch(req.query);
    const count = await OperationModel.count(search.findContent);
    const maxPage = Math.ceil(count/limit);
    const urlQuery = req._parsedUrl.query;
    const storageList = await OperationModel.find(search.findContent).paginate(page, limit).populate('product').populate('parts.product').populate('customer');
    res.render('operation/storage/home', {lists, search, maxPage, urlQuery, storageList, page});
});

router.get('/order', loginRequired, async (req, res)=>{
    const customerList = await CustomerModel.find();
    res.render('operation/order', {customerList : customerList});
});

router.post('/order', async(req, res)=>{
    const dirname = path.join(__dirname, '../static');
    const workbook = new Excel.Workbook();
    workbook.xlsx.readFile(dirname+'/order_book.xlsx')
    .then(function() {
        const worksheet = workbook.getWorksheet('자재발주');
        const worksheet2 = workbook.getWorksheet('추가자재');
        const date = worksheet.getCell('C6');
        const customer = worksheet.getCell('C7');
        const attention = worksheet.getCell('C8');
        const c_tel = worksheet.getCell('C9');
        const app = worksheet.getCell('C10');
        const title = worksheet.getCell('C11');
        const from = worksheet.getCell('I7');
        const res = worksheet.getCell('I8');
        const res_num = worksheet.getCell('I9');
        const res_mob = worksheet.getCell('I10');
        date.value = new Date().toLocaleDateString();
        customer.value = req.body.customer;
        attention.value = req.body.attention;
        c_tel.value = req.body.phone;
        app.value = req.body.app;
        title.value = req.body.title;
        from.value = 'Dasan Kys. cop';
        res_num.value = '070-4900-0537';
        res_mob.value = req.user.phone;
        res.value = req.user.name;
        const material = req.body.material;
        if(typeof material === 'string'){
            let product = worksheet.getCell(`D${19}`);
            let unit = worksheet.getCell(`G${19}`);
            product.value = req.body.material;
            unit.value = parseInt(req.body.unit);
        } else {
            for(i=0;i<material.length;i++){
                let product = worksheet.getCell(`D${i+19}`);
                let unit = worksheet.getCell(`G${i+19}`);
                product.value =  req.body.material[i];
                unit.value = parseInt(req.body.unit[i]);
            }
        }
        const file = {};
        file.subject = req.body.title;
        file.filename = `kyspo_${new Date().toLocaleDateString()}_${customer}.xlsx`; 
        file.filepath = dirname+`/kyspo_${new Date().toLocaleDateString()}_${customer}.xlsx`
        workbook.xlsx.writeFile(file.filepath);
        return file;
    })
    .then((file)=>{
        console.log(req.user.email)
        let transporter = nodemailer.createTransport({
            service : 'gmail',
            auth : {
              user : 'hy.kim@kysco.kr',
              pass : 'eksql7818!'
            }
          });
          
          let mailOptions = {
            attachments: [
                {
                    filename : file.filename,
                    path : file.filepath
                }
            ],
            from : `${req.user.name} <kys@kysco.kr>`,
            to : req.body.email,
            subject : `kyspo_${file.subject} ${new Date().toLocaleDateString()}`,
            text : `
              안녕하세요 다산카이스 김호연입니다.
              ${req.body.subject} 건의 발주서를 보내드립니다.

            `,
          };
          transporter.sendMail(mailOptions, function(err, info){
            if(err) console.error(err);
            console.log('email sent : ' + info.response);
          });
    })
    .then(async ()=>{
        const material = req.body.material
        if(typeof material == 'string'){
            const parts = [];
            if(typeof req.body.parts == 'string'){
                parts.push({product : req.body.parts, unit : req.body.partsunit});
            } else {
                for(i=0;i<req.body.parts.length;i++){
                    parts.push({product : req.body.parts[i], unit : req.body.partsunit[i]});
                }
            }
          const order = new OperationModel({
              customer : req.body.bscode,
              amount : req.body.amount,
              unit : req.body.unit,
              parts : parts,
              product: req.body.product
          });
          await order.save();
          parts.forEach(async function(part){
             await StorageModel.update({_id : part.product}, {$inc : {stock : -parseInt(part.unit)}});
          });
        } else {
            const partsArr = [];
            const unitArr = [];
            const init = 0;
            req.body.rows.forEach(function(row){
                partsArr.push(req.body.parts.splice(init, parseInt(row)));
                unitArr.push(req.body.partsunit.splice(init, parseInt(row)))
            });
            for(i=0;i<partsArr.length;i++){
                let parts = [];
                let arrParts = partsArr[i];
                let arrUnit = unitArr[i];
                for(j=0;j<arrParts.length;j++){
                    parts.push({product : arrParts[j], unit : arrUnit[j]});
                }
                let order = new OperationModel({
                    customer : req.body.bscode,
                    amount : req.body.amount[i],
                    unit : req.body.unit[i],
                    parts : parts,
                    product: req.body.product[i],
                });
                await order.save();
                parts.forEach(async function(part){
                    await StorageModel.update({_id : part.product}, {$inc : {stock : -parseInt(part.unit)}});
                });
            }
        }
    })
    .then(()=>{
        res.redirect('/home');
    })
    .catch((err)=>{
        console.error(err);
    })
});

router.post('/find/partslist', async(req, res)=>{
    const partsList = await MaterialModel.findOne({product : req.body.product}).populate('parts.product');
    res.json({partsList : partsList.parts});
});

router.post('/income', async (req, res)=>{
    const today = new Date();
    const query = {
        unit : req.body.remain,
        date : today,
    }
    await OperationModel.update({id : req.body.id}, {$push : {log : query}});
    await StorageModel.update({_id : req.body._id}, {$inc : {stock : req.body.remain}});
    await res.json({date : today.toLocaleDateString()});
});

router.get('/detail/:id', async (req, res)=>{
    const storage = await OperationModel.findOne({id : req.params.id}).populate('customer').populate('product');
    res.render('operation/storage/edit', {storage});
});

router.post('/storage/log/regist', async (req, res)=>{
    await OperationModel.update({id : req.body.id}, {$push : {log : {date : req.body.date, unit : req.body.unit}}});
    const log = await OperationModel.findOne({id : req.body.id});
    const length = log.log.length;
    const _id = log.log[length-1]._id;
    await StorageModel.update({_id : req.body.product}, {$inc : {stock : req.body.unit}});
    await res.json({date : req.body.date, unit : req.body.unit, _id : _id});
});

router.post('/storage/log/edit', async (req, res)=>{
    const log = await OperationModel.findOne({id : req.body.id});
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
    await OperationModel.update({id : req.body.id}, {$set : {log : arr}});
    await StorageModel.update({_id : req.body.product}, {$inc : {stock : minus}});
    await res.json({date : req.body.date, unit : req.body.unit, _id : req.body._id});
});

router.post('/storage/log/delete', async (req, res)=>{
    try{
        if(req.body._id){
            await OperationModel.update({id : req.body.id}, {$pull : {log : {_id : req.body._id}}});
            await StorageModel.update({_id : req.body.product}, {$inc : {stock : -req.body.unit}});
            res.json({message : 1});
        } else {
            res.json({message : 0});
        }
    } catch(err){
        console.error(err);
    }
});

router.post('/delete', async (req, res)=>{
    await StorageModel.update({_id : req.body._id}, {$inc : {stock : -req.body.received}});
    await OperationModel.remove({id : req.body.id});
    res.json({message : 1});
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