const Path = require("path");
const fs = require("fs");

// 转换为锚点可读
exports.transformToAnchor = function (link) {
  // 拆分驼峰
  let anchor = link.replace(/([a-z])([A-Z])/g, '$1 $2')
  anchor = anchor.replaceAll(/\w+/g, function (rep) {
    return rep.toLocaleLowerCase()
  })
  // 把 # ( ) （ ） . / : " < > [ ] , 换成 '空格'
  anchor = anchor.replaceAll(/[\#\(\)\（\）\.\/\:\"\<\>\[\]\,]+/g, function () {
    return ' '
  })
  // trim
  anchor = anchor.trim()
  // 把所有 '空格' 变成 -
  anchor = anchor.replaceAll(/\s+/g, function () {
    return '-'
  })
  return anchor
}

// 从数据里面得到关于某个键的值
exports.getValues = function (objs, action) {
  let values = []
  for (let index = 0; index < objs.length; index++) {
    values.push(action(objs[index]))
  }
  return values
}

// 遍历 附带 前几次的数据 通过 callback 自定义
exports.each = function (configs, index, preObjects, callback) {
  let object = callback(configs, index, preObjects)
  if (configs.children && configs.children.length > 0) {
    for (let index = 0; index < configs.children.length; index++) {
      let objects = [...preObjects]
      objects.push(object)
      exports.each(configs.children[index], index, objects, callback)
    }
  }
}


exports.writeFile = function (path, content = '', callback) {
  if (!fs.existsSync(Path.dirname(path))) {
    fs.mkdirSync(Path.dirname(path), {recursive: true})
  }
  if (content === '' || callback === undefined) {
    fs.writeFileSync(path, content, 'utf-8')
    if (callback) {
      callback()
    }
  } else {
    fs.writeFile(path, content, 'utf-8', callback)
  }
}


// to url
exports.baseURL = function (language, version, root = '', args = '') {
  return 'https://docs.unity3d.com/' + language + '/' + version + '/' + root + args
}

// to path
exports.basePath = function (language, version, root, ...args) {
  return Path.resolve('../unity_doc/', language, version, root, ...args)
}

// other path
exports.otherPath = function (other, language, version, root, ...args) {
  return Path.resolve('../unity_doc/', other, language, version, root, ...args)
}

exports.selfPath = function (other, language, version, root, ...args) {
  return Path.resolve('../doc-unity-manual/docs/', root, ...args)
}
