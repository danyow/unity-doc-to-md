/**
 * https://storage.googleapis.com/localized_docs/zh-cn/2020.3/UnityDocumentation.zip
 *
 *
 *
 */


// const fq = require('filequeue');
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const TService = require("turndown")
const TPlugin = require('turndown-plugin-gfm')
const os = require("os");
const Bagpipe = require('bagpipe');

const tds = new TService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  linkStyle: "referenced",
  linkReferenceStyle: "full",
})
tds.use(TPlugin.gfm)
tds.use([TPlugin.tables, TPlugin.strikethrough])
// tds.addRule('pre2Code', {
//   filter: ['pre'],
//   replacement(content) {
//     const len = content.length
//     // 除了pre标签，里面是否还有code标签包裹，有的话去掉首尾的`（针对微信文章）
//     const isCode = content[0] === '`' && content[len - 1] === '`'
//     const result = isCode ? content.substr(1, len - 2) : content
//     return '```\n' + result + '\n```\n'
//   }
// })

//要遍历的文件夹所在的路径
let DIR_EN = path.resolve('../unity_doc/zh_2020/')
let DIR_AC = path.resolve('../unity_doc/zh_anchor/')
let TEMP = path.resolve('../unity_doc/html2md_temp/')
let DIR_MD = path.resolve('../unity_doc/docs/')

let fileNames = []

const anchors = {}

var bagpipe = new Bagpipe(100);

getAllAnchor(DIR_EN, DIR_AC)

/**
 * 把所有字母小写
 * @param title
 */
function toAnchor(title) {
  let anchor = title.replaceAll(/\w+/g, function (rep) {
    return rep.toLocaleLowerCase()
  })
  // 把所有空格变成-
  anchor = anchor.replaceAll(/\s+/g, function () {
    return '-'
  })
  // 把 # ( ) . / : 换成 空
  anchor = anchor.replaceAll(/[#().\/:]+/g, function () {
    return ''
  })
  return anchor
}

/**
 * 获取所有锚点
 * @param sourceDir
 * @param tempDir
 */
function getAllAnchor(sourceDir, tempDir) {

  let fileInfos = fs.readdirSync(sourceDir)
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }
  for (let index = 0; index < fileInfos.length; index++) {
    let fileInfo = fileInfos[index]
    // 获取绝对路径得到 states
    const filePath = path.join(sourceDir, fileInfo)
    const tempPath = path.join(tempDir, fileInfo)
    const fileName = path.basename(fileInfo, path.extname(fileInfo))
    let states = fs.statSync(filePath)
    if (states.isFile() && fileInfo.endsWith('.html')) {
      if (fileNames.length !== 0 && !fileNames.includes(fileName)) {
        continue
      }
      let content = fs.readFileSync(filePath, 'utf8')
      content = content.replaceAll(/<a href="#(.+)">(.+)<\/a>/g, function (rep, $1, $2) {
        if (!anchors[fileName]) {
          anchors[fileName] = {}
        }
        anchors[fileName][$1] = toAnchor($2)
        return rep
      })
      content = content.replaceAll(/<a name="(.+)">.+[\r\n]+<h\d>(.+)<\/h\d>/g, function (rep, $1, $2) {
        if (!anchors[fileName]) {
          anchors[fileName] = {}
        }
        anchors[fileName][$1] = toAnchor($2)
        return rep
      })
      fs.writeFileSync(tempPath, content)
    } else if (states.isDirectory()) {
      getAllAnchor(filePath, tempPath)
    }
  }
}


//调用文件遍历方法
readDirectory(DIR_AC, TEMP, DIR_MD)

/**
 * 文件遍历方法
 * @param sourceDir 需要遍历的文件路径
 * @param tempDir 放到哪个文件夹
 * @param destDir 放到哪个文件夹
 */
function readDirectory(sourceDir, tempDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir)
  }
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }
  let fileInfos = fs.readdirSync(sourceDir)
  for (let index = 0; index < fileInfos.length; index++) {
    let fileInfo = fileInfos[index]
    // 获取绝对路径得到 states
    const filePath = path.join(sourceDir, fileInfo)
    const tempPath = path.join(tempDir, fileInfo)
    const destPath = path.join(destDir, fileInfo.replace(".html", ".md"))
    const fileName = path.basename(fileInfo, path.extname(fileInfo))
    let states = fs.statSync(filePath)
    if (states.isFile() && fileInfo.endsWith('.html')) {
      if (fileNames.length !== 0 && !fileNames.includes(fileName)) {
        continue
      }
      // 按行读取文件
      let readStream = fs.createReadStream(filePath, "utf8")
      if (!fs.existsSync(tempPath)) {
        fs.writeFileSync(tempPath, '')
      }
      let writeStream = fs.createWriteStream(tempPath)
      let reader = readline.createInterface(readStream)
      let isStart = false
      reader.on('line', function (line) {
        if (line.includes('<div class="nextprev clear">')) {
          isStart = false
        }
        if (line.includes('<h1>')) {
          isStart = true
        }
        if (isStart) {
          writeStream.write(line + os.EOL)
        }
      })
      reader.on('close', function () {
        writeStream.close(function () {
          let html = fs.readFileSync(tempPath).toString()
          let md = tds.turndown(html)

          // md = md.replaceAll('.html', '.md')
          md = md.replaceAll('../StaticFilesManual/', 'https://docs.unity3d.com/cn/current/StaticFilesManual/')
          md = md.replaceAll('../ScriptReference/', 'https://docs.unity3d.com/cn/current/ScriptReference/')
          md = md.replaceAll('../StaticFiles/', 'https://docs.unity3d.com/cn/current/StaticFiles/')
          md = md.replaceAll('../uploads/', 'https://docs.unity3d.com/cn/current/uploads/')
          md = md.replaceAll('https://docs.unity3d.com/Manual/', '')
          // 把 `Manual` 文件内的文件格式转为 `md`
          md = md.replaceAll(/]: .+\.html/g, function (rep) {
            return rep.replaceAll('.html', '.md')
          })
          // 把 < > 转义
          md = md.replaceAll('<', '&lt;')
          md = md.replaceAll('>', '&gt;')
          md = md.replaceAll(/(]: (.+\.md)?#)(.+)/g, function (rep, $1, $2, tag) {

            let name = fileName
            if (rep.includes('.md')) {
              name = rep.replaceAll(/]: (.+)\.md.+/g, function (_, $1) {
                return $1
              })
            }
            rep = rep.replaceAll(/#[\w\-]+/g, function (_) {
              // // 判断这个单词在不在不可分割的表里面
              // for (let key in anchors) {
              //   if (key.includes(tag)) {
              //     tag = tag.replaceAll(key, anchors[key])
              //   }
              // }
              //
              // // 首字母小写但后面全大写
              // tag = tag.replaceAll(/^[a-z][A-Z]+/g, function (rep) {
              //   return rep.toLocaleLowerCase()
              // })
              // // 首字母大写但后面小写
              // tag = tag.replaceAll(/[A-Z][a-z]+/g, function (rep) {
              //   return rep.toLocaleLowerCase() + '-'
              // })
              // // 首字母为数字或者大写且后面大写
              // tag = tag.replaceAll(/([0-9]|[A-Z])[A-Z]+/g, function (rep) {
              //   return rep.toLocaleLowerCase() + '-'
              // })
              // // 如果最后一个字母是 - 就删除
              // if (tag.endsWith('-')) {
              //   tag = tag.substr(0, tag.length - 1)
              // }
              // // 修复错误
              // if (tag.includes('--')) {
              //   tag = tag.replaceAll('--', '-')
              // }
              if (anchors[name] && anchors[name][tag]) {
                return '#' + anchors[name][tag]
              }
              return '#' + tag
            })
            return rep
          })
          fs.writeFileSync(destPath, md)
        })
      })
    } else if (states.isDirectory()) {
      readDirectory(filePath, tempPath, destPath)
    }
  }
}
