/**
 * https://storage.googleapis.com/localized_docs/zh-cn/2022.1/UnityDocumentation.zip
 */

const version = '2022.1'
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const TService = require("turndown")
const TPlugin = require('turndown-plugin-gfm')
const os = require("os");

const gfm = new TService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  linkStyle: "referenced",
  linkReferenceStyle: "full",
})
gfm.use(TPlugin.gfm)
gfm.use([TPlugin.tables, TPlugin.strikethrough])

const tds = new TService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  linkStyle: "referenced",
  linkReferenceStyle: "full",
})
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
let DIR_EN = path.resolve('../unity_doc/zh_' + version + '/')
let DIR_AC = path.resolve('../unity_doc/zh_anchor/')
let TEMP = path.resolve('../unity_doc/html2md_temp/')
let DIR_MD = path.resolve('../unity_doc/docs/')

// 专门测试某个文件
let fileNames = [
  // "class-TextureImporter",
  // "AccelerationEvent",
  // "Accessibility.VisionUtility.GetColorBlindSafePalette"
]

let excludeFileNames = [
  "30_search"
]

const anchors = {}

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
      if ((fileNames.length !== 0 && !fileNames.includes(fileName)) || (excludeFileNames.length > 0 && excludeFileNames.includes(fileName))) {
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
    let isScript = filePath.includes("ScriptReference")
    let states = fs.statSync(filePath)
    if (states.isFile() && fileInfo.endsWith('.html')) {
      if ((fileNames.length !== 0 && !fileNames.includes(fileName)) || (excludeFileNames.length > 0 && excludeFileNames.includes(fileName))) {
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
        if (isScript) {
          if (line.includes('<div class="footer-wrapper">')) {
            isStart = false
          }
          if (line.includes('<div id="content-wrap" class="content-wrap opened-sidebar">')) {
            isStart = true
          }
        } else {
          if (line.includes('<div class="nextprev clear">')) {
            isStart = false
          }
          if (line.includes('<h1>')) {
            isStart = true
          }
          // 如果是先检测到了 h2 说明 没有 h1
          if (!isStart && line.includes('<h2>') && !line.includes('<h2>手册</h2>')) {
            isStart = true
            line.replace('h2>', 'h1>')
          }
        }
        if (isStart) {
          writeStream.write(line + os.EOL)
        }
      })
      reader.on('close', function () {
        writeStream.close(function () {
          let html = fs.readFileSync(tempPath).toString()

          // 预先处理html
          if (isScript) {
            html = html.replaceAll('<a href="" class="switch-link gray-btn sbtn left hide">切换到手册</a>', '')
            html = html.replaceAll('<pre class="codeExampleCS">', '<pre class="codeExampleCS"> {{CODE-START}}')
            html = html.replaceAll('</pre>', '{{CODE-END}} </pre>')
          }
          // 对表格优化 换行处理
          html = html.replaceAll('<br>', '{{BR}}')

          let md = isScript ? tds.turndown(html) : gfm.turndown(html)

          // md = md.replaceAll('.html', '.md')
          md = md.replaceAll('../StaticFilesManual/', 'https://docs.unity3d.com/cn/' + version + '/StaticFilesManual/')
          md = md.replaceAll('../StaticFiles/', 'https://docs.unity3d.com/cn/' + version + '/StaticFiles/')
          md = md.replaceAll('../uploads/', 'https://docs.unity3d.com/cn/' + version + '/uploads/')

          // 对 源路径 不同替换
          if (isScript) {
            md = md.replaceAll('https://docs.unity3d.com/ScriptReference/', '')
            md = md.replaceAll('../ScriptReference/', '')
            md = md.replaceAll('https://docs.unity3d.com/Manual/', 'https://docs.unity3d.com/Manual/')
            md = md.replaceAll('../Manual/', 'https://docs.unity3d.com/Manual/')
          } else {
            md = md.replaceAll('https://docs.unity3d.com/ScriptReference/', 'https://docs.unity3d.com/ScriptReference/')
            md = md.replaceAll('../ScriptReference/', 'https://docs.unity3d.com/ScriptReference/')
            md = md.replaceAll('https://docs.unity3d.com/Manual/', '')
            md = md.replaceAll('../Manual/', '')
          }
          // md = md.replaceAll('../ScriptReference/', 'https://docs.unity3d.com/cn/' + version + '/ScriptReference/')
          // 把 `Manual` 引用带` html `转为 `md`
          md = md.replaceAll(/]: .+\.html/g, function (rep) {

            // 如果里面的url 包括了 Manual 或者 ScriptReference 就不能转换为 md
            // 以及 30_search
            if (rep.includes('/Manual/') || rep.includes('/ScriptReference/') || rep.includes('/30_search/')) {
              return rep
            }
            return rep.replaceAll('.html', '.md')
          })

          md = md.replaceAll('&amp;', '&')

          // 把 < > 转义
          if (!isScript) {
            md = md.replaceAll('<', '&lt;')
            md = md.replaceAll('>', '&gt;')
          }
          if (isScript) {
            md = md.replaceAll('\\[', '[')
            md = md.replaceAll('\\]', ']')
            // md = md.replaceAll('\\_', '_')
          }

          // \*\*(.*?)\*\*
          // 对多余 \# 删除
          md = md.replaceAll('\\# ', '')
          // 对双下滑线的进行 ** 处理
          md = md.replaceAll('\\_\\_', '**')
          md = md.replaceAll(/\*\*(.*?)\*\*/g, function (rep) {
            // 前后剔除空格后 最后面补一个空格
            return rep.trim() + ''
          })

          // 对 ![](http://xxx.xx) -> ![xxx.xx](http://xxx.xx)
          md = md.replaceAll(/\!\[\]\(.*?\)/g, function (rep) {
            let url = rep.replaceAll('![](', '').replaceAll(')', '')
            let name = path.basename(url)
            rep = rep.replaceAll('![]', '![' + name + ']')
            return rep
          })

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

          md = md.replaceAll('{{CODE-START}}', '```csharp')
          md = md.replaceAll('{{CODE-END}}', '```')
          // 对表格进行优化
          md = md.replaceAll('{{BR}}', '<br/>')
          // 对子属性的选项表格
          md = md.replaceAll('|  | ', '|  -> ')

          fs.writeFileSync(destPath, md)
        })
      })
    } else if (states.isDirectory()) {
      readDirectory(filePath, tempPath, destPath)
    }
  }
}
