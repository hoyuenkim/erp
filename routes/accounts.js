var express = require('express');
var router = express.Router();
var UserModel = require('../models/UserModel');
var mongoose = require('mongoose');
var multer = require('multer');
var path = require('path');
var mongoosePagination= require('mongoose-pagination');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var passwordHash = require('../libs/passwordHash');
var loginRequired = require('../libs/loginRequired');

passport.serializeUser(function (user, done){
    done(null, user);
  });

passport.deserializeUser(function (user, done) {
    done(null, user);
  });

  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField : 'password',
    passReqToCallback : true
  },
  function (req, username, password, done) {
    UserModel.findOne({ username : username, password : passwordHash(password)}, function (err, user) {
        if (!user){
            return done(null, false, {message : '아이디 혹은 비밀번호가 맞지 않습니다'});
        }else{
            return done(null, user);
        }
    });
  }
  ));

router.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/',
        failureFlash: true,
    }),
    function(req, res){
     res.redirect('/home')
    }
);

router.get('/regist', (req, res)=>{
  const token = req.query.token;
  const password = req.query.password;
  if(token === 'kysco'){
  const user = new UserModel({
    username : req.query.username,
    password : passwordHash(req.query.password),
    });
    UserModel.find((err, conf)=>{
      if(conf.length === 0){
        user.save(function(err){
          if(err) console.error(err);
          res.send('ok');
        });
      } else {
        res.send('이미 사용자가 있습니다.');
      }
    });
  } else {
    res.send('올바른 접근경로가 아닙니다.');
  }
});

router.get('/password/edit', loginRequired, function(req, res){
  res.render('accounts/password');
});

router.post('/password/edit', function(req, res){
  UserModel.update({user_id : req.user.user_id}, {$set : {password : passwordHash(req.body.password), status : 1}}, function(err){
    res.redirect('/admin');
  });
});

router.get('/logout', function(req, res){
  req.logout();
  res.send('<script>alert("로그아웃되었습니다.");location.href="/"</script>')
});

router.get('/join', (req, res)=>{
  res.render('accounts/join');
});

router.post('/join', (req, res)=>{
  const user = new UserModel({
    username : req.body.username,
    name : req.body.name,
    password : passwordHash(req.body.password),
    addr : req.body.addr,
    addr_detail : req.body.addr_detail,
    email : req.body.email,
    phone : req.body.phone
  });
  user.save( async (err)=>{
    if(err){
      console.error(err);
      throw err;
    } 
    req.login(user, async (err)=>{
      if(err){
        console.error(err);
        throw err;
      } else {
        res.redirect('/home');
      }
    })
  });
});



function createSearch(queries){
  var findContent = {};
  if(queries.searchType && queries.searchText && queries.searchText.length >= 1){
    var searchTypes = queries.searchType.toLowerCase().split(",");
    var postQueries = [];
    if(searchTypes.indexOf("name")>=0){
      postQueries.push({'profile.name' : {$regex : new RegExp(queries.searchText, "i")}});
    }
    if(searchTypes.indexOf("eval_name")>=0){
      postQueries.push({eval_name : {$regex : new RegExp(queries.searchText, "i")}});
    }
    if(postQueries.length>0) findContent = {$or:postQueries};
  }
  return { searchType : queries.searchType, searchText : queries.searchText, findContent : findContent}
}

module.exports = router;
