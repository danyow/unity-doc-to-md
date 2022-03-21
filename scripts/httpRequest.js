let https = require("https"); // 引入http模块

/**
 * http模块发送请求
 * @param host
 * @param port
 * @param route
 * @param headers
 * @param encoding 可选值： utf8 binary
 */
exports.sendHttpRequest = function (url, port, route, headers = {}, encoding = 'utf-8') {
  let data = '';
  return new Promise(function (resolve, reject) {
    let req = https.get(url, function (res) {
      res.setEncoding(encoding);
      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', function () {
        resolve({result: true, data: data});
      });
    });

    req.on('error', (e) => {
      resolve({result: false, errmsg: e.message});
    });
    req.end();
  });
}

/**
 * http模块发送请求
 * @param url
 * @param callback
 * @param encoding 可选值： utf8 binary
 */
exports.sendHttpRequestAsync = function (url, callback, encoding = 'utf-8') {
  let data = '';
  let req = https.get(url, function (res) {
    res.setEncoding(encoding);
    res.on('data', function (chunk) {
      data += chunk;
    });

    res.on('end', function () {
      callback(true, data)
    });
  });

  req.on('error', (e) => {
    callback(false, e.message)
  });
  req.end();
}
