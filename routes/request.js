const express = require('express');
const router = express.Router();
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const Excel = require('exceljs');

const loginRequired = require('../libs/loginRequired');

const TableModel = require('../models/TableModel');
const CustomerModel = require('../models/CustomerModel');
const StorageModel = require('../models/StorageModel');
const SalesModel = require('../models/SalesModel');
const OrderModel = require('../models/OrderModel');

router.get('/estimate', loginRequired, async (req, res)=>{
    try{
        const customerList = await CustomerModel.find();
        const productList = await StorageModel.find({type : {$gte : 1} , deleted : false});
        res.render('order/estimate', {customerList : customerList, productList : productList});
    } catch(err){
        console.error(err);
    }
});

router.post('/estimate', (req, res)=>{
    const dirname = path.join(__dirname, '../static');
    const workbook = new Excel.Workbook();
    workbook.xlsx.readFile(dirname+'/order_book.xlsx')
    .then(function() {
        const worksheet = workbook.getWorksheet('자재발주');
        const date = worksheet.getCell('C6');
        const customer = worksheet.getCell('C7');
        const attention = worksheet.getCell('C8');
        const c_tel = worksheet.getCell('C9');
        const app = worksheet.getCell('C10');
        const subject = worksheet.getCell('C11');
        const from = worksheet.getCell('I7');
        const res = worksheet.getCell('I8');
        const res_num = worksheet.getCell('I9');
        const res_mob = worksheet.getCell('I10');
        date.value = "'"+new Date().toLocaleDateString();
        customer.value = req.body.customer;
        attention.value = req.body.attention;
        c_tel.value = req.body.c_tel;
        app.value = req.body.app;
        subject.value = req.body.subject;
        from.value = 'Dasan Kys. cop';
        res_num.value = '070-4900-0537';
        const product = req.body.product;
        if(typeof product === 'string'){
            let product = worksheet.getCell(`D${19}`);
            let set = worksheet.getCell(`G${19}`);
            let unitPrice = worksheet.getCell(`H${19}`);
            product.value = req.body.productname;
            set.value = parseInt(req.body.set);
            unitPrice.value = parseInt(req.body.unitPrice);
        } else {
            for(i=0;i<product.length;i++){
                let product = worksheet.getCell(`D${i+19}`);
                let set = worksheet.getCell(`G${i+19}`);
                let unitPrice = worksheet.getCell(`H${i+19}`);
                product.value = req.body.productname[i];
                set.value = parseInt(req.body.set[i]);
                unitPrice.value = parseInt(req.body.unitPrice[i]);
            }
        }
        const file = {};
        file.subject = req.body.subject;
        file.filename = `kysco_${new Date().toLocaleDateString()}_${customer}.xlsx`; 
        file.filepath = dirname+`/kysco_${new Date().toLocaleDateString()}_${customer}.xlsx`
        workbook.xlsx.writeFile(file.filepath);
        return file;
    })
    .then((file)=>{
            let transporter = nodemailer.createTransport({
            service : 'gmail',
            auth : {
              user : 'hoops.nation.kr@gmail.com',
              pass : '$kpc100400'
            }
          });
          
          let mailOptions = {
            attachments: [
                {
                    filename : file.filename,
                    path : file.filepath
                }
            ],
            from : req.user.email,
            to : req.body.email,
            subject : `견적서_${file.subject} ${new Date().toLocaleDateString()}`,
            text : `
              안녕하세요 다산카이스 ${req.user.name}입니다.
              ${req.body.subject} 건의 견적서를 송부해드립니다.

            `,
          };
          transporter.sendMail(mailOptions, function(err, info){
            if(err) console.error(err);
            console.log('email sent : ' + info.response);
          });
    })
    .then(async()=>{
        const product = req.body.product;
        if(typeof product === 'string'){
            const sales = new SalesModel({
                subject : req.body.subject,
                product : req.body.product,
                manager : req.user.name,
                serial : Date.now(),
                customer : req.body.customer,
                unitPrice : req.body.unitPrice,
                set : req.body.set,
                amount : parseInt(req.body.unitPrice)*parseInt(req.body.set),
                status : 0,
            });
            sales.save((err)=>{
                if(err) console.error(err)
            });
        } else {
            const serial = Date.now();
            for(i=0;i<product.length;i++){
                let sales = new SalesModel({
                    subject : req.body.subject,
                    product : req.body.product[i],
                    serial : serial,
                    manager : req.user.name,
                    customer : req.body.customer,
                    unitPrice : req.body.unitPrice[i],
                    set : req.body.set[i],
                    amount : parseInt(req.body.unitPrice[i])*parseInt(req.body.set[i]),
                    status : 0,
                });
                sales.save((err)=>{
                    if(err) console.error(err)
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

router.get('/order', loginRequired, async (req, res)=>{
    try{
        const customerList = await CustomerModel.find();
        res.render('order/order', {customerList : customerList});
    } catch(err){
        if(err) console.error(err);
    }
});

router.post('/order', loginRequired, (req, res)=>{
    const dirname = path.join(__dirname, '../static');
    const workbook = new Excel.Workbook();
    let readFile;
    if(req.body.type === 1) {
        readFile = dirname+'/order_book.xlsx'
    } else {
        readFile = dirname+'/order_book_foreign.xlsx'
    }
    workbook.xlsx.readFile(readFile)
    .then(function(args) {
        const worksheet = workbook.getWorksheet('자재발주');
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
        const product = req.body.productname;
        if(typeof product === 'string'){
            let product = worksheet.getCell(`D${19}`);
            let unit = worksheet.getCell(`G${19}`);
            let unitPrice = worksheet.getCell(`H${19}`);
            product.value = req.body.subject+'_'+req.body.productname;
            unit.value = parseInt(req.body.unit);
            unitPrice.value = parseInt(req.body.unitPrice);
        } else {
            for(i=0;i<product.length;i++){
                let product = worksheet.getCell(`D${i+19}`);
                let unit = worksheet.getCell(`G${i+19}`);
                let unitPrice = worksheet.getCell(`H${i+19}`);
                product.value =  req.body.subject[i]+'_'+req.body.productname[i];
                unit.value = parseInt(req.body.unit[i]);
                unitPrice.value = parseInt(req.body.unitPrice[i]);
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
        let transporter = nodemailer.createTransport({
            service : 'gmail',
            auth : {
              user : 'hoops.nation.kr@gmail.com',
              pass : '$kpc100400'
            }
          });
          
          let mailOptions = {
            attachments: [
                {
                    filename : file.filename,
                    path : file.filepath
                }
            ],
            from : '"김호연" <hy.kim@kysco.kr>',
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
    .then(async()=>{
        const product = req.body.product;
        if(typeof product === 'string'){
            console.log(req.body.subject);
                const order = new OrderModel({
                    product : req.body.product,
                    subject : req.body.subject,
                    serial : req.body.serial,
                    manager : req.user.name,
                    customer : req.body.customer,
                    unitPrice : req.body.unitPrice,
                    unit : req.body.unit,
                    amount : parseInt(req.body.unitPrice)*parseInt(req.body.unit),
                    type : req.body.type,
                    status : 0,
                });
                order.save((err)=>{
                    if(err) console.error(err);
                }); 
            }
        else {
            for(i=0;i<product.length;i++){
                    let order = new OrderModel({
                        product : req.body.product[i],
                        serial : req.body.serial[i],
                        subject : req.body.subject[i],
                        serial : req.body.serial[i],
                        manager : req.user.name,
                        customer : req.body.customer,
                        unitPrice : req.body.unitPrice[i],
                        unit : req.body.unit[i],
                        type : req.body.type[i],
                        amount : parseInt(req.body.unitPrice[i])*parseInt(req.body.unit[i]),
                        status : 0,
                    });
                    order.save((err)=>{
                        if(err) console.error(err);
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

module.exports = router;