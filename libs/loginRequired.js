module.exports = function(req, res, next) {
  if(!req.isAuthenticated()){
    res.send('<script>alert("로그인을 하셔야합니다");location.href="/"</script>');
  } else {
    return next();
  }
};
