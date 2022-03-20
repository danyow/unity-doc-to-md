// noinspection DuplicatedCode

/**
 * https://storage.googleapis.com/localized_docs/zh-cn/2022.1/UnityDocumentation.zip
 */

const FS = require('fs')
const OS = require("os");
const Path = require('path')

const Async = require('async')
const ReadLine = require('readline')

const TService = require("turndown")
const TPlugin = require('turndown-plugin-gfm')

const Tools = require('./tools')
const HttpRequest = require('./httpRequest')

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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function main() {
  request(function (linkConfigs) {
    toSimpleList(linkConfigs, function (simpleList) {
      toComplexList(simpleList, function (complexList) {
        writeHtml(complexList, function (complexList) {
          handleHtml(complexList, function (complexList) {
            writeMarkdown(complexList, function (complexList) {
              handleMarkdown(complexList, function (complexList) {
                console.log('全部转换完成!!')
              })
            })
          })
        })
      })
    })
  })
}

main()

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 准备网络请求
function request(callback) {
  const languages = ['cn']
  const versions = ['2022.1']
  const roots = [
    'Manual',
    // 'ScriptReference',
  ]

  // 处理网络请求队列
  const requestQueue = Async.queue((url, callback) => {
    HttpRequest.sendHttpRequestAsync(url, callback)
  }, 1)

  let linkConfigs = {}

  languages.forEach(language => {
    linkConfigs[language] = {}
    versions.forEach(version => {
      linkConfigs[language][version] = {}
      roots.forEach(root => {
        let url = Tools.baseURL(language, version, root, '/docdata/toc.json')
        requestQueue.push(url, function (isSuccess, data) {
          if (isSuccess) {
            linkConfigs[language][version][root] = JSON.parse(data)
          }
        })
      })
    })
  })
  requestQueue.drain(() => {
    callback(linkConfigs)
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function toSimpleList(linkConfigs, callback) {
  // 首先简单处理
  let simpleList = {}
  for (const language in linkConfigs) {
    simpleList[language] = {}
    for (const version in linkConfigs[language]) {
      simpleList[language][version] = {}
      for (const root in linkConfigs[language][version]) {
        simpleList[language][version][root] = []
        Tools.each(linkConfigs[language][version][root], [], function (config, list) {
          let simple = {
            link: config.link,
            title: config.title,
            links: Tools.getValues(list, (obj) => obj.link),
            titles: Tools.getValues(list, (obj) => obj.title),
          }
          simpleList[language][version][root].push(simple)
          return simple
        })
      }
    }
  }
  callback(simpleList)
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 准备转换成数组
function toComplexList(simpleList, callback) {
  // 然后复杂处理 因为有涉及到 锚点
  let complexList = {}
  const handleQueue = Async.queue((params, callback) => {
    const simple = params.simple
    const language = params.language
    const version = params.version
    const root = params.root
    const link = simple.link
    const title = simple.title
    const links = simple.links
    const titles = simple.titles
    const anchor_link = Tools.transformToAnchor(simple.link)
    const anchor_title = Tools.transformToAnchor(simple.title)
    const anchor_links = links.map(Tools.transformToAnchor)
    const anchor_titles = titles.map(Tools.transformToAnchor)
    const url = Path.join(...anchor_links, anchor_link + '.md')
    const source = Tools.basePath(language, version, root, link + '.html')
    const preHtml = Tools.basePath('html-pre', language, version, root, ...anchor_links, anchor_link + '.html')
    const postHtml = Tools.basePath('html-post', language, version, root, ...anchor_links, anchor_link + '.html')
    const preMark = Tools.basePath('mark-pre', language, version, root, ...anchor_links, anchor_link + '.md')
    // const postMark = Tools.basePath('mark-post', language, version, root, ...anchor_links, anchor_link + '.md')
    const postMark = Tools.selfPath('mark', language, version, root, ...anchor_links, anchor_link + '.md')


    let anchors = []

    function checkKey(key, value) {
      value = Tools.transformToAnchor(value)
      if (anchors.includes(key) && anchors[key] !== value) {
        console.log('居然有不一样')
      }
      anchors[key] = value
    }

    FS.readFile(source, 'utf-8', function (err, html) {
      if (err === null) {
        for (const match of html.matchAll(/<a href="#(.*?)">(.*?)<\/a>/g)) {
          checkKey(match[1], match[2])
        }

        for (const match of html.matchAll(/<a name="(.*?)">.+[\r\n]+<h\d>(.*?)<\/h\d>/g)) {
          checkKey(match[1], match[2])
        }
        // 直接返回一个复杂数据
        callback({
          anchors: anchors,
          language: language,
          version: version,
          root: root,
          link: link,
          title: title,
          links: links,
          titles: titles,
          anchor_link: anchor_link,
          anchor_title: anchor_title,
          anchor_links: anchor_links,
          anchor_titles: anchor_titles,
          url: url,
          source: source,
          preHtml: preHtml,
          postHtml: postHtml,
          preMark: preMark,
          postMark: postMark,
        })
      } else {
        console.log('文件不存在', source)
        callback()
      }
    })
  }, 1)

  for (const language in simpleList) {
    complexList[language] = {}
    for (const version in simpleList[language]) {
      complexList[language][version] = {}
      for (const root in simpleList[language][version]) {
        complexList[language][version][root] = []
        for (const index in simpleList[language][version][root]) {
          let simple = simpleList[language][version][root][index]
          handleQueue.push({
            simple: simple, language: language, version: version, root: root
          }, function (complex) {
            if (complex) {
              complexList[language][version][root].push(complex)
            }
          })
        }
      }
    }
  }

  handleQueue.drain(() => {
    callback(complexList)
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 预处理 html 文件
function writeHtml(complexList, writeCallback) {
  const handleQueue = Async.queue(function (complex, callback) {
    Tools.writeFile(complex.preHtml, '')
    let writeStream = FS.createWriteStream(complex.preHtml, 'utf-8')
    let readStream = FS.createReadStream(complex.source, 'utf-8')
    let reader = ReadLine.createInterface(readStream)
    let startFlag = false
    reader.on('line', function (line) {
      if (complex.root === 'Manual') {
        if (line.includes('<div class="nextprev clear">')) {
          startFlag = false
        }
        if (line.includes('<h1>')) {
          startFlag = true
        }
        // 如果是先检测到了 h2 说明 没有 h1
        if (!startFlag && line.includes('<h2>') && !line.includes('<h2>手册</h2>')) {
          startFlag = true
          line.replace('h2>', 'h1>')
        }
      } else if (complex.root === 'ScriptReference') {
        if (line.includes('<div class="footer-wrapper">')) {
          startFlag = false
        }
        if (line.includes('<div id="content-wrap" class="content-wrap opened-sidebar">')) {
          startFlag = true
        }
      }
      if (startFlag) {
        writeStream.write(line + OS.EOL)
      }
    })
    reader.on('close', function () {
      writeStream.close(callback)
    })
  }, 1)
  for (const language in complexList) {
    for (const version in complexList[language]) {
      for (const root in complexList[language][version]) {
        for (const index in complexList[language][version][root]) {
          handleQueue.push(complexList[language][version][root][index], function (err) {
            if (err) {
              console.log(err)
            }
          })
        }
      }
    }
  }

  handleQueue.drain(() => {
    writeCallback(complexList)
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 后处理 html
function handleHtml(complexList, handleCallback) {

  const handleQueue = Async.queue(function (complex, callback) {

    if (!FS.existsSync(complex.preHtml)) {
      console.log('')
    }

    FS.readFile(complex.preHtml, 'utf-8', function (err, html) {
      // 有时候会莫名起码多个\r进去
      html = html.replaceAll('\r\n', '\n')
      // 有些引用是 ScriptRef 和 #ScriptRef
      html = html.replaceAll('#ScriptRef:', '../ScriptReference/')
      html = html.replaceAll('ScriptRef:', '../ScriptReference/')
      html = html.replaceAll('SciptRef:', '../ScriptReference/')
      html = html.replaceAll('ScriptReference:', '../ScriptReference/')
      // 邮箱
      html = html.replaceAll('https://docs.unity3d.com/Manual/mailto:assetstore@unity3d.com.html', 'mailto:assetstore@unity3d.com')

      // SpriteAtlas升级
      if (complex.version.includes('2022')) {
        // SpriteAtlas -> SpriteAtlasV2
        html = html.replaceAll('/SpriteAtlas.html', '/SpriteAtlasV2.html')
      }

      // #udp-distribution.html#languages
      // html = html.replaceAll('#udp-distribution.html#languages', '../Manual/udp-distribution.html#languages')

      // 替换 url
      html = html.replaceAll(
        '%5Bhttps://www.google.com/url?q=https://help.apple.com/xcode/mac/11.4/index.html?localePath%3Den.lproj%23/devbc48d1bad&amp;sa=D&amp;source=docs&amp;ust=1636108271363000&amp;usg=AOvVaw2aFjxlOtLMPIBWV1qeXNRN%5D(https://help.apple.com/xcode/mac/11.4/index.html?localePath=en.lproj#/devbc48d1bad)',
        'https://www.google.com/url?q=https://help.apple.com/xcode/mac/11.4/index.html?localePath%3Den.lproj%23/devbc48d1bad&amp;sa=D&amp;source=docs&amp;ust=1636108271363000&amp;usg=AOvVaw2aFjxlOtLMPIBWV1qeXNRN'
      )

      // 对表格优化 换行处理
      html = html.replaceAll('<br>', '{{BR}}')

      // 如果 </colgroup> 和 <tbody> 之间有 <thead> 就是带 title 的表格
      html = html.replaceAll(/<colgroup>\n((.|\n)*?)<tbody>/g, function (rep, $1) {
        if ($1.includes('<thead>')) {
          return rep
        }
        // 判断有多少行

        let col_count = rep.match(/\n/g).length - 3
        if (col_count > 0) {
          let thead = '<thead>\n<tr>\n'
          for (let index = 0; index < col_count; index++) {
            if (index == 0) {
              thead += '\t<th style="text-align:left;"><strong>Topic</strong></th>\n'
            } else {
              thead += '\t<th style="text-align:left;"><strong>描述</strong></th>\n'
            }
          }
          thead += '</tr>\n</thead>\n\n\<tbody>\n'
          rep = rep.replaceAll('<tbody>', thead)
        }
        return rep
      })

      if (complex.root === 'ScriptReference') {
        html = html.replaceAll('<a href="" class="switch-link gray-btn sbtn left hide">切换到手册</a>', '')
        html = html.replaceAll('<pre class="codeExampleCS">', '<pre class="codeExampleCS"> {{CODE-START}}')
        html = html.replaceAll('</pre>', '{{CODE-END}} </pre>')
      }

      Tools.writeFile(complex.postHtml, html, callback)
    })
  }, 1)
  for (const language in complexList) {
    for (const version in complexList[language]) {
      for (const root in complexList[language][version]) {
        for (const index in complexList[language][version][root]) {
          handleQueue.push(complexList[language][version][root][index], function (err) {
            if (err) {
              console.log(err)
            }
          })
        }
      }
    }
  }

  handleQueue.drain(() => {
    handleCallback(complexList)
  })
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 后处理 html
function writeMarkdown(complexList, writeCallback) {

  const handleQueue = Async.queue(function (complex, callback) {
    FS.readFile(complex.postHtml, 'utf-8', function (err, html) {
      let md = gfm.turndown(html)

      // 转义 &
      md = md.replaceAll('&amp;', '&')

      // 把 < > 转义
      if (complex.root === 'Manual') {
        md = md.replaceAll('<', '&lt;')
        md = md.replaceAll('>', '&gt;')
      }
      if (complex.root === 'ScriptReference') {
        md = md.replaceAll('\\[', '[')
        md = md.replaceAll('\\]', ']')
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

      md = md.replaceAll('{{CODE-START}}', '```csharp')
      md = md.replaceAll('{{CODE-END}}', '```')
      // 对表格进行优化
      md = md.replaceAll('{{BR}}', '<br/>')
      // 对子属性的选项表格
      md = md.replaceAll('|  | ', '|  -> ')


      // 图片类型链接 -> 改名和改链接
      md = md.replaceAll(/\!\[(.*)\]\((.*?)\)/g, function (rep, $1, $2) {
        let name = Path.basename($2)
        if ($1.length == 0) {
          rep = rep.replace('![]', '![' + name + ']')
        }
        console.log($1)
        rep = rep.replace('../', Tools.baseURL(complex.language, complex.version))
        return rep
      })

      Tools.writeFile(complex.preMark, md, callback)
    })
  }, 1)
  for (const language in complexList) {
    for (const version in complexList[language]) {
      for (const root in complexList[language][version]) {
        for (const index in complexList[language][version][root]) {
          handleQueue.push(complexList[language][version][root][index], function (err) {
            if (err) {
              console.log(err)
            }
          })
        }
      }
    }
  }

  handleQueue.drain(() => {
    writeCallback(complexList)
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function handleMarkdown(complexList, handleCallback) {
  const handleQueue = Async.queue(function (complex, callback) {
    // 判断临时文件是否存在

    Tools.writeFile(complex.postMark, '')
    let writeStream = FS.createWriteStream(complex.postMark, 'utf-8')
    let readStream = FS.createReadStream(complex.preMark, 'utf-8')
    let reader = ReadLine.createInterface(readStream)

    reader.on('line', function (line) {
      line = line.replaceAll(/^\[\d*?\]: (.+)/g, function (lineRep, lineReference) {
        // 是 链接
        if (lineReference.match(/http(s)?:\/\/([\w-]+[\.|\:])+[\w-]+(\/[\w.\/?%&#=]*)?/g)) {
          // TODO: 对同类型的链接
          // if (ref.includes('docs.unity3d.com')) {
          //   if (ref.includes('ScriptReference')) {
          //     console.log('是脚本链接', ref)
          //   } else if (ref.includes('Manual')) {
          //     console.log('是手册链接', ref)
          //   } else {
          //     console.log('是其他链接', ref)
          //   }
          // } else {
          //   console.log('不是文档', ref)
          // }
          return lineRep
        } else {
          // 预先处理
          let newReference = lineReference
          newReference = newReference.replaceAll('%E2%80%8B%E2%80%8B', '')
          newReference = newReference.replaceAll('../', './')
          newReference = newReference.replaceAll('E./', './')
          newReference = newReference.replaceAll('UI./', './')


          if (newReference.match(/(.*?)#(.+)/g)) {
            // 必然 指代的是锚点
            newReference = newReference.replaceAll(/(.*?)#(.+)/g, function (rep, file, tag) {
              let ref = toFileReference(file, complex, complexList)
              let anchor = toFileAnchor(tag, file, complex, complexList)
              if (anchor) {
                return ref + '#' + anchor
              }
              return ref
            })
          } else if (newReference.match(/(.+).html/g)) {
            // 必定文件
            if (!newReference.endsWith('.html')) {
              console.log(newReference)
            } else {
              newReference = toFileReference(newReference, complex, complexList)
            }
          }
          lineRep = lineRep.replaceAll(lineReference, newReference)
          return lineRep
        }
        return lineRep
      })
      writeStream.write(line + OS.EOL)
    })
    reader.on('close', function () {
      writeStream.close(callback)
    })
  }, 1)
  for (const language in complexList) {
    for (const version in complexList[language]) {
      for (const root in complexList[language][version]) {
        for (const index in complexList[language][version][root]) {
          handleQueue.push(complexList[language][version][root][index], function (err) {
            if (err) {
              console.log(err)
            }
          })
        }
      }
    }
  }

  handleQueue.drain(() => {
    handleCallback(complexList)
  })
}


// 转化为锚点
function toFileAnchor(tag, file, complex, complexList) {
  let name
  if (file.length > 0) {
    name = checkName(getFileName(file))
  } else {
    name = complex.link
  }
  let root = getFileRoot(file, complex)
  let list = complexList[complex.language][complex.version][root]
  if (list === undefined) {
    console.log(name)
    return undefined
  }
  // 开始查找
  let targetComplex = list.find(function (t) {
    return t.link == name || t.anchor_link == name
  })
  if (targetComplex === undefined) {
    console.log(name)
    return undefined
  }
  if (targetComplex.anchors[tag]) {
    return targetComplex.anchors[tag]
  }

  return undefined
}

// 转化为文件路径
function toFileReference(file, complex, complexList) {
  if (file.length > 0) {
    let name = checkName(getFileName(file))
    let root = getFileRoot(file, complex)
    let list = complexList[complex.language][complex.version][root]
    if (list === undefined) {
      console.log(name)
      return Tools.baseURL(complex.language, complex.version, root, '/' + name)
    }
    // 开始查找
    let targetComplex = list.find(function (t) {
      return t.link == name || t.anchor_link == name
    })
    if (targetComplex === undefined) {
      console.log(name)
      return Tools.baseURL(complex.language, complex.version, root, '/' + name)
    }
    return targetComplex.url
  } else {
    // 没有名字的就是以 自身 为文件路径寻找锚点
    return file
  }
}


// 获取文件的 root
function getFileRoot(file, complex) {
  let ext = Path.extname(file)
  if (ext.length === 0) {
    ext = '.html'
    file = file + ext
  }
  let path = Path.dirname(file)
  let root = complex.root
  if (path !== '.') {
    if (path.includes('ScriptReference')) {
      root = 'ScriptReference'
    }
    if (path.includes('Manual')) {
      root = 'Manual'
    }
  }
  return root
}

// 获取文件名
function getFileName(file) {
  let ext = Path.extname(file)
  if (ext.length === 0) {
    ext = '.html'
    file = file + ext
  }
  let name = Path.basename(file).replace(ext, '')
  name = checkName(name)
  return name
}

const mdNameModifyList = {
  'parallelimport': 'parallel-import',
  'OnlineActivationGuide': 'manual-activation-guide',
  'class-PlayerSettingsStandalone': 'class-player-settings',
  'tvOS': 'tv-os-introducing',
  'search-expressions-functions-ref': 'search-expression-functions-ref',
  'UnityIAPXiaomi': 'unity-iap',
  'BuildOptions.CompressWithLz4': 'build-options',
};

// 检查文件名
function checkName(name) {
  if (mdNameModifyList[name]) {
    return mdNameModifyList[name]
  }
  return name
}


// 引用链接

// 换行读取

// md = md.replaceAll(/\[\d*?\]: (\S+)/g, function (rep, ref, $2) {
//   // 是 链接
//   if (ref.match(/http(s)?:\/\/([\w-]+[\.|\:])+[\w-]+(\/[\w.\/?%&#=]*)?/g)) {
//     // TODO: 对同类型的链接
//     // if (ref.includes('docs.unity3d.com')) {
//     //   if (ref.includes('ScriptReference')) {
//     //     console.log('是脚本链接', ref)
//     //   } else if (ref.includes('Manual')) {
//     //     console.log('是手册链接', ref)
//     //   } else {
//     //     console.log('是其他链接', ref)
//     //   }
//     // } else {
//     //   console.log('不是文档', ref)
//     // }
//     return ref
//   } else {
//     if (Path.extname(ref).length > 0) {
//
//     } else {
//       if (ref.startsWith('#')) {
//
//       } else {
//         console.log('引用', ref)
//       }
//     }
//   }
//   return rep
// })
// console.log('引用链接数:', urlCount)

// 对 ![](http://xxx.xx) -> ![xxx.xx](http://xxx.xx)
// 图片命名
// md = md.replaceAll(/\!\[\]\((.*?)\)/g, function (rep, $1) {
//   let name = Path.basename($1)
//   rep = rep.replaceAll('![]', '![' + name + ']')
//   return rep
// })

// 对链接优化
// 首先对链接统一化
// md = md.replaceAll(Too + '/StaticFilesManual/')

// 针对锚点 有 # 号
// md = md.replaceAll(/(]: (.+\.html)?#)(.+)/g, function (rep, $1, targetFile, tag) {
//   // 首先判断 targetFile 有没有值
//   if (targetFile !== undefined) {
//     if (targetFile.startsWith('http://') || targetFile.startsWith('https://')) {
//       // 完整网站的不管
//       return rep
//     }
//     let targetName = targetFile.replaceAll(Path.extname(targetFile), '')
//     // 说明用的是别人的锚点
//     let targetComplex = complexList[complex.language][complex.version][complex.root].find(function (t) {
//       return t.link == targetName
//     })
//     if (targetComplex === undefined) {
//       // 没有目标文件 返回在线地址
//       return ']: ' + Tools.baseURL(complex.language, complex.version, complex.root, '/' + targetFile) + '#' + tag
//     }
//     if (targetComplex.anchors[tag] === undefined) {
//       // 不存在这个锚点
//       return ']: ' + targetComplex.url
//     }
//     return ']: ' + targetComplex.url + '#' + targetComplex.anchors[tag]
//   }
//   if (complex.anchors[tag] === undefined) {
//     // 本文件都不存在这个锚点
//     return ']: ' + complex.url
//   }
//   return ']: ' + '#' + complex.anchors[tag]
// })
