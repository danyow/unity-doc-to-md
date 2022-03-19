let https = require("https"); // 引入http模块

/**
 * http模块发送请求
 * @param host
 * @param port
 * @param route
 * @param headers
 * @param encoding 可选值： utf8 binary
 */
exports.sendHttpRequest = function(url, port, route, headers = {}, encoding = 'utf-8') {
  let data = '';
  return new Promise(function (resolve, reject) {
    let req = https.get(url, function(res) {
      res.setEncoding(encoding);
      res.on('data', function(chunk) {
        data += chunk;
      });

      res.on('end', function() {
        resolve({result: true, data: data});
      });
    });

    req.on('error', (e) => {
      resolve({result: false, errmsg: e.message});
    });
    req.end();
  });
}

// // 请求例子
// let res = co(function* () {
//   let req_res = yield sendHttpRequest('www.video.com', 80, '/mobile/Test/phpinfo');
//   console.log(req_res);
// });
// console.log(res);
// console.log('123');
