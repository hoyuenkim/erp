//essential modules
const express = require('express');
const logger = require('morgan');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const moment = require('moment');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const requestIp = require('request-ip');
const tz = require('moment-timezone');
moment.tz.setDefault('Asia/Seoul');
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');
const loginRequired = require('./libs/loginRequired');
const autoIncrement = require('mongoose-auto-increment');
const Excel = require('exceljs');
const mongodb = require('mongodb');
var arrayCounter = require('array-counter');
const convert = require('object-array-converter');
const _sum = require('sum-by');

const mongoose = require('mongoose');

//express initialize
const app = express();
require('dotenv').config();

//mongodb connection
const options = {
	// useNewUrlParser : true,
	useMongoClient: true,
	// useCreateIndex : true,
	reconnectTries: Number.MAX_VALUE,
	reconnectInterval: 500,
	poolSize: 10,
	bufferMaxEntries: 0,
	connectTimeoutMS: 10000,
	// socketTimeoutMs : 45000,
	family: 4
};

// mongoose.Promise = global.Promise;
const connect = mongoose.connect('mongodb://127.0.0.1:27017/erp', options);
autoIncrement.initialize(connect);

const db = mongoose.connection;
// const test = mongodb.connection.db;
db.on('error', console.error);
db.once('open', function() {
	console.log('mongodb connected');
});

const connectMongo = require('connect-mongo');
const MongoStore = connectMongo(session);

const sessionMiddleWare = session({
	secret: process.env.COOKIE_PASSWORD,
	resave: true,
	saveUninitialized: false,
	cookie: {
		maxAge: 2000 * 60 * 60
	},
	store: new MongoStore({
		mongooseConnection: mongoose.connection,
		ttl: 14 * 24 * 60 * 60
	})
});

app.use(sessionMiddleWare);

app.use(passport.initialize());
app.use(passport.session());

//passport session
app.use(function(req, res, next) {
	app.locals.isLogin = req.isAuthenticated();
	app.locals.userData = req.user;
	next();
});

//models
const UserModel = require('./models/UserModel');
const StorageModel = require('./models/StorageModel');
const SalesModel = require('./models/SalesModel');
const OrderModel = require('./models/OrderModel');
const CustomerModel = require('./models/CustomerModel');
const TableModel = require('./models/TableModel');

//static setting
app.use('/static', express.static('static'));
app.use('/libs', express.static('libs'));
app.use('/uploads', express.static('uploads'));

//middleware setting
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_PASSWORD));
app.use(logger('dev'));
app.use(requestIp.mw());
app.use(flash());

//view setting
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//routes
const accounts = require('./routes/accounts');
const request = require('./routes/request');
const customer = require('./routes/customer');
const table = require('./routes/table');
const sales = require('./routes/sales');
const storage = require('./routes/storage');
const order = require('./routes/order');
const operation = require('./routes/operation');

app.use('/accounts', accounts);
app.use('/request', request);
app.use('/customer', customer);
app.use('/table', table);
app.use('/sales', sales);
app.use('/storage', storage);
app.use('/order', order);
app.use('/operation', operation);

app.get('/', (req, res) => {
	if (req.user) {
		res.redirect('/home');
	} else {
		res.render('./accounts/login', { flashMessage: req.flash().error });
	}
});

app.get('/home', loginRequired, async (req, res) => {
	try {
		const weeks = getWeeks();
		const today = new Date();
		const orderList = await OrderModel.find().sort({ created_at: -1 }).populate('product').limit(5);
		const salesList = await SalesModel.find().sort({ created_at: -1 }).populate('product').limit(5);
		const tableList = await TableModel.find({
			$and: [ { date: { $ne: '' } }, { date: { $gte: today, $lte: weeks.future } } ]
		}).sort({ date: 1 });
		const alertList = await TableModel.find({ $and: [ { date: { $ne: '' } }, { date: { $lt: today } } ] });
		const list = [];
		const serverTable = await TableModel.find({
			$and: [ { date: { $ne: '' } }, { date: { $lte: weeks.future } } ]
		});
		const onepassTable = await TableModel.find({
			$and: [ { date: { $ne: '' } }, { date: { $lte: weeks.future } } ]
		});
		const stock = await StorageModel.find({ type: 2 });
		const order = await OrderModel.find({ status: 0 });
		serverTable.forEach(function(data) {
			data.server.forEach(function(server) {
				for (i = 0; i < server.unit; i++) {
					if (server.ship === false) {
						list.push(server.product);
					}
				}
			});
		});
		const data = arrayCounter(list);
		const severStorages = [];
		stock.forEach(function(item) {
			i;
			let minus = data[item._id];
			if (!minus) minus = 0;
			let query = {
				_id: item._id,
				id: item.id,
				product: item.product,
				stock: item.stock - minus
			};
			severStorages.push(query);
		});
		const storageList = await StorageModel.find({ type: 1, deleted: false });
		const keyList = [];
		onepassTable.forEach(function(item) {
			item.onepass.forEach(function(one) {
				if (one.ship === false) {
					keyList.push(one.product.toString());
				}
			});
		});
		const keyArray = [];
		keyList.forEach(function(key) {
			if (keyArray.indexOf(key) === -1) {
				keyArray.push(key);
			}
		});
		const entire = [];
		onepassTable.forEach(function(item) {
			item.onepass.forEach(function(item) {
				if (item.ship === false) {
					entire.push(item);
				}
			});
		});
		const result = [];
		for (i = 0; i < keyArray.length; i++) {
			let obj = {};
			let product = keyArray[i];
			let unit = 0;
			for (j = 0; j < entire.length; j++) {
				if (keyArray[i] == entire[j].product.toString()) {
					unit = unit + entire[j].unit;
				}
			}
			obj.product = product;
			obj.unit = unit;
			result.push(obj);
		}
		const onepassStorages = [];
		storageList.forEach(function(storage) {
			const query = {};
			query.product = storage.product;
			query.unit = storage.stock;
			result.forEach(function(each) {
				if (storage._id == each.product) {
					query.unit = storage.stock - each.unit;
				}
			});
			onepassStorages.push(query);
		});
		res.render('home', {
			orderList: orderList,
			salesList: salesList,
			tableList: tableList,
			alertList: alertList,
			severStorages: severStorages,
			onepassStorages: onepassStorages
		});
	} catch (err) {
		if (err) console.error(err);
	}
});

app.get('/update', function(req, res) {
	StorageModel.updateMany({}, { stock: 0 }, function(err) {
		res.send('ok');
	});
});

app.get('/update/table', function(req, res) {
	const query = {
		static: {
			use: true,
			files: [
				{ no: 1, name: '서버 IP', received: false },
				{ no: 2, name: 'UI IP', received: false },
				{ no: 3, name: '조감도', received: false }
			]
		},
		em: {
			use: false,
			files: [
				{ no: 1, name: '비상벨 IP', received: false },
				{ no: 2, name: '비상벨 번호', received: false },
				{ no: 3, name: '도면', received: false }
			]
		},
		parking: {
			use: false,
			files: [ { no: 1, name: '주차위치', received: false } ]
		},
		cctv: {
			use: false,
			files: [
				{ no: 1, name: '프로토콜', received: false },
				{ no: 2, name: 'IP 채널', received: false },
				{ no: 3, name: 'CCTV 번호', received: false },
				{ no: 4, name: '매칭 비상벨번호', received: false },
				{ no: 5, name: '도면', received: false }
			]
		},
		ev: {
			use: false,
			files: [
				{ no: 1, name: '프로토콜', received: false },
				{ no: 2, name: '콜 IP', received: false },
				{ no: 3, name: '엘리베이터 ID', received: false }
			]
		},
		hn: {
			use: false,
			files: [ { no: 1, name: '프로토콜', received: false }, { no: 2, name: '홈넷 IP', received: false } ]
		},
		op: {
			use: false,
			files: [
				{ no: 1, name: '수신기 IP', received: false },
				{ no: 2, name: '등록기 IP', received: false },
				{ no: 3, name: '수신기 번호', received: false },
				{ no: 4, name: '설치정보', received: false },
				{ no: 5, name: '세대배치도', received: false },
				{ no: 6, name: '수량', received: false }
			]
		}
	};
	TableModel.updateMany({}, { $set: query }, function(err) {
		if (err) console.error(err);
		console.log('updated');
		res.redirect('/home');
	});
});

app.get('/update/sales', async function(req, res) {
	const value = await SalesModel.find();
	value.forEach(async function(val) {
		await SalesModel.update({ id: val.id }, { $set: { shipping: val.shipping } });
	});
	res.send('updated');
});

function getWeeks() {
	var now = new Date();
	var today = moment(now).startOf('day');
	var future = moment(today).add(14, 'days');
	return {
		today: moment(today).tz('Asia/Seoul').format('YYYY-MM-DD'),
		future: moment(future).tz('Asia/Seoul').format('YYYY-MM-DD')
	};
}

const createSearch = (queries) => {
	var findContent = {};
	if (queries.searchType && queries.searchText && queries.searchText.length >= 1) {
		var searchTypes = queries.searchType.toLowerCase().split(',');
		var postQueries = [];
		if (searchTypes.indexOf('name') >= 0) {
			postQueries.push({ name: { $regex: new RegExp(queries.searchText, 'i') } });
		}
		if (searchTypes.indexOf('attention') >= 0) {
			postQueries.push({ attention: { $regex: new RegExp(queries.searchText, 'i') } });
		}
		if (postQueries.length > 0) findContent = { $or: postQueries };
	}
	return { searchType: queries.searchType, searchText: queries.searchText, findContent: findContent };
};

app.listen(port, (err) => {
	if (err) console.error(err);
	console.log(`app is running at http://localhost:${port}`);
});
