var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;

var TableSchema = new Schema({
	serial: String,
	subject: String,
	customer: String,
	manager: String,
	date: Date,
	files: [ { filename: String } ],
	onepass: [
		{
			product: { type: mongoose.Schema.Types.ObjectId, ref: 'storage' },
			unit: Number,
			unitPrice: Number,
			ship: {
				type: Boolean,
				default: false
			}
		}
	],
	server: [
		{
			product: { type: mongoose.Schema.Types.ObjectId, ref: 'storage' },
			unit: Number,
			unitPrice: Number,
			ship: {
				type: Boolean,
				default: false
			}
		}
	],
	type: Number,
	remarks: String,
	created_at: {
		type: Date,
		default: Date.now()
	},

	static: {
		use: {
			type: Boolean,
			default: true
		},
		files: {
			type: Array,
			default: [
				{ no: 1, name: '서버 IP', received: false },
				{ no: 2, name: 'UI IP', received: false },
				{ no: 3, name: '조감도', received: false }
			]
		}
	},

	parking: {
		use: {
			type: Boolean,
			default: false
		},
		files: {
			type: Array,
			default: [ { no: 1, name: '주차위치', received: false } ]
		}
	},
	ev: {
		use: {
			type: Boolean,
			default: false
		},
		files: {
			type: Array,
			default: [
				{ no: 1, name: '프로토콜', received: false },
				{ no: 2, name: '콜 IP', received: false },
				{ no: 3, name: '엘리베이터 ID', received: false }
			]
		}
	},
	cctv: {
		use: {
			type: Boolean,
			default: false
		},
		files: {
			type: Array,
			default: [
				{ no: 1, name: '프로토콜', received: false },
				{ no: 2, name: 'IP 채널', received: false },
				{ no: 3, name: 'CCTV 번호', received: false },
				{ no: 4, name: '매칭 비상벨번호', received: false },
				{ no: 5, name: '도면', received: false }
			]
		}
	},
	em: {
		use: {
			type: Boolean,
			default: false
		},
		files: {
			type: Array,
			default: [
				{ no: 1, name: '비상벨 IP', received: false },
				{ no: 2, name: '비상벨 번호', received: false },
				{ no: 3, name: '도면', received: false }
			]
		}
	},
	op: {
		use: {
			type: Boolean,
			default: false
		},
		files: {
			type: Array,
			default: [
				{ no: 1, name: '수신기 IP', received: false },
				{ no: 2, name: '등록기 IP', received: false },
				{ no: 3, name: '수신기 번호', received: false },
				{ no: 4, name: '설치정보', received: false },
				{ no: 5, name: '세대배치도', received: false },
				{ no: 6, name: '수량', received: false }
			]
		}
	},
	hn: {
		use: {
			type: Boolean,
			default: false
		},
		files: {
			type: Array,
			default: [ { no: 1, name: '프로토콜', received: false }, { no: 2, name: '홈넷 IP', received: false } ]
		}
	}
});

TableSchema.virtual('onepass_ship').get(function() {
	const entire = this.onepass.length;
	let count = 0;
	this.onepass.forEach(function(op) {
		if (op.ship === true) {
			count++;
		}
	});
	if (count == entire) {
		return '출고완료';
	} else {
		return '미출고';
	}
});

TableSchema.virtual('server_ship').get(function() {
	const entire = this.server.length;
	let count = 0;
	this.server.forEach(function(sv) {
		if (sv.ship === true) {
			count++;
		}
	});
	if (count == entire) {
		return '출고완료';
	} else {
		return '미출고';
	}
});

TableSchema.virtual('getDate').get(function() {
	if (!this.date) {
		return '출고일 미정';
	} else {
		let dateString = '';
		dateString = dateString + this.date.getFullYear();
		dateString = dateString + '-' + Number(this.date.getMonth() + 1);
		dateString = dateString + '-' + this.date.getDate();
		return dateString;
	}
});

TableSchema.virtual('static_conf').get(function() {
	const result = this.static.files.every(function(args) {
		return args.received === true;
	});
	return result;
});

TableSchema.virtual('op_conf').get(function() {
	const result = this.op.files.every(function(args) {
		return args.received === true;
	});
	return result;
});

TableSchema.virtual('hn_conf').get(function() {
	const result = this.hn.files.every(function(args) {
		return args.received == true;
	});
	return result;
});

TableSchema.virtual('ev_conf').get(function() {
	const result = this.ev.files.every(function(args) {
		return args.received == true;
	});
	return result;
});

TableSchema.virtual('cctv_conf').get(function() {
	const result = this.cctv.files.every(function(args) {
		return args.received == true;
	});
	return result;
});

TableSchema.virtual('em_conf').get(function() {
	const result = this.em.files.every(function(args) {
		return args.received == true;
	});
	return result;
});

TableSchema.virtual('parking_conf').get(function() {
	const result = this.parking.files.every(function(args) {
		return args.received == true;
	});
	return result;
});

TableSchema.plugin(autoIncrement.plugin, { model: 'table', field: 'id', startAt: 1 });
module.exports = mongoose.model('table', TableSchema);
