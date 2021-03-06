var express = require('express');
var router = express.Router();
let md5 = require('blueimp-md5')
let models = require('../db/models')
let UserModel = models.getModel('user')
let _filter = {'pwd': 0, '__v': 0} // 查询时过滤掉
let sms_util = require('../util/sms_util')
let users = {}
let axios = require('axios')
var svgCaptcha = require('svg-captcha');

/*
密码登陆
 */
router.post('/login_pwd', function (req, res) {
  let name = req.body.name
  let pwd = md5(req.body.pwd)

  UserModel.findOne({name}, function (err, user) {
    if (user) {
      console.log('findUser',user)
      if (user.pwd !== pwd) {
        res.send({code: 1, msg: '用户名或密码不正确!'})
      } else {
        req.session.userid = user._id
        res.send({code: 0, data: {_id: user._id, name: user.name, phone: user.phone}})
      }
    } else {
      let userModel = new UserModel({name, pwd})
      userModel.save(function (err, user) {
        // 向浏览器端返回cookie(key=value)
        res.cookie('userid', user._id, {maxAge: 1000*60*60*24*7})
        req.session.userid = user._id
        let data = {_id: user._id, name: user.name};
        // 3.2. 返回数据(新的user)
        res.send({code: 0, data})
    })
    }
  })
})

/*
一次性图形验证码
 */
router.get('/captcha', function (req, res) {
  var captcha = svgCaptcha.create({
    ignoreChars: '0o1l',
    noise: 2,
    color: true
  });
  req.session.captcha = captcha.text.toLowerCase();
  console.log(req.session.captcha)
  /*res.type('svg');
  res.status(200).send(captcha.data);*/
  res.type('svg');
  res.send(captcha.data)
});

/*
发送验证码短信
*/
router.get('/sendcode', function (req, res, next) {
  //1. 获取请求参数数据
  var phone = req.query.phone;
  //2. 处理数据
  //生成验证码(6位随机数)
  var code = sms_util.randomCode(6);
  //发送给指定的手机号
  console.log(`向${phone}发送验证码短信: ${code}`);
  sms_util.sendCode(phone, code, function (success) {//success表示是否成功
    if (success) {
      users[phone] = code;
      console.log('保存验证码: ', phone, code)
      res.send({"code": 0})
    } else {
      //3. 返回响应数据
      res.send({"code": 1, msg: '短信验证码发送失败'})
    }
  })
})

router.post('/register',function(req,res){
    let name = req.body.name;
    let pwd = md5(req.body.pwd);
    var phone = req.body.phone;
    var code = req.body.code;
    var captcha = req.session.captcha;
    var usercaptcha = req.body.captcha.toLowerCase();
    if (users[phone] != code && usercaptcha != captcha) {
    res.send({code: 1, msg: '验证码不正确'});
        return;
    }
//删除保存的code
    delete users[phone];
    delete req.session.captcha
    let userModel = new UserModel({phone,name,pwd})
    userModel.save(function (err, user) {
    res.cookie('userid', user._id, {maxAge: 1000*60*60*24*7})
    req.session.userid = user._id;
    res.send({code: 0, data: user})
})}
)

/*
短信登陆
*/
router.post('/login_sms', function (req, res, next) {
  var phone = req.body.phone;
  var code = req.body.code;
  var captcha = req.session.captcha;
  var usercaptcha = req.body.captcha.toLowerCase();
  console.log('/login_sms', phone, code);
  if (users[phone] != code && usercaptcha != captcha) {
    res.send({code: 1, msg: '验证码不正确'});

    return;
  }
  //删除保存的code
    delete users[phone];
    delete req.session.captcha
  UserModel.findOne({phone}, function (err, user) {
    if (user) {
      req.session.userid = user._id;
      res.send({code: 0, data: user})
    } else {
      //存储数据
      let userModel = new UserModel({phone})
      userModel.save(function (err, user) {
        req.session.userid = user._id;
        res.send({code: 0, data: user})
      })
    }
  })

})

/*
根据sesion中的userid, 查询对应的user
 */
router.get('/userinfo', function (req, res) {
  // 取出userid
  let userid = req.session.userid
  // 查询
  UserModel.findOne({_id: userid}, _filter, function (err, user) {
    // 如果没有, 返回错误提示
    if (!user) {
      // 清除浏览器保存的userid的cookie
      delete req.session.userid;

      res.send({code: 1, msg: '请先登陆'})
    } else {
      // 如果有, 返回user
      res.send({code: 0, data: user})
    }
  })
});

/*
获取首页广告列表
 */
router.get('/index', function (req, res) {
  setTimeout(function () {
    let data = require('../data/index.json')
    res.send({code: 0, data})
  }, 300)
});
/*
获取分类列表
 */
router.get('/classify', function (req, res) {
  setTimeout(function () {
    let data = require('../data/classify.json');
    res.send({code: 0, data})
  }, 300)
});

/*
获取品牌列表
 */
router.get('/brand', function (req, res) {
  setTimeout(function () {
    let data = require('../data/brand.json');
    res.send({code: 0, data})
  }, 300)
});
/*
获取轮播广告和每日疯抢
 */
router.get('/carousel', function (req, res) {
  setTimeout(function () {
    let data = require('../data/carousel.json');
    res.send({code: 0, data})
  }, 300)
});


module.exports = router
