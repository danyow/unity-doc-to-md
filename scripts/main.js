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
const StreamZip = require('node-stream-zip')

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
  download(function (languages, versions) {
    readCompression(languages, versions, function (languages, versions, reader) {
      request(languages, versions, function (linkConfigs) {
        toSimpleList(linkConfigs, function (simpleList) {
          toComplexList(simpleList, reader, function (complexList) {
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
    })
  })
}

main()

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 下载文件
function download(downloadCallback) {

  // https://storage.googleapis.com/localized_docs/zh-cn/2022.1/UnityDocumentation.zip
  // https://storage.googleapis.com/docscloudstorage/2022.1/UnityDocumentation.zip

  const languages = ['cn']
  const versions = ['2022.1']

  // 处理网络请求队列
  const downloadQueue = Async.queue((params, callback) => {
    // 不存在开启下载
    if (!FS.existsSync(params.path)) {
      HttpRequest.sendHttpRequestAsync(params.url, function (isSuccess, data) {
        Tools.writeFile(params.path, data, callback, 'binary')
      }, 'binary')
    } else {
      callback()
    }
  }, 1)

  languages.forEach(language => {
    versions.forEach(version => {
      let url = Tools.downURL(language, version)
      downloadQueue.push({
        url: url,
        path: Tools.basePath(language, version, 'doc.zip'),
      }, function (isSuccess) {
        if (isSuccess) {
          console.log('下载成功')
        }
      })
    })
  })
  downloadQueue.drain(() => {
    downloadCallback(languages, versions)
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 解压
function readCompression(languages, versions, readCallback) {
  const decompressionQueue = Async.queue((params, callback) => {
    const zip = new StreamZip({
      file: params.file,
      storeEntries: true,
      // skipEntryNameValidation: true,
    });
    zip.on('ready', () => {
      callback(zip)
    });
  }, 1)
  let reader
  languages.forEach(language => {
    versions.forEach(version => {
      decompressionQueue.push({
        file: Tools.basePath(language, version, 'doc.zip'),// Path.resolve('./', language, version, 'doc.zip'),
        path: Tools.basePath(language, version),
      }, function (zip) {
        reader = zip
      })
    })
  })
  decompressionQueue.drain(() => {
    readCallback(languages, versions, reader)
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 准备网络请求
function request(languages, versions, callback) {
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
            // 预处理
            let config = JSON.parse(data)
            let sameIndex = config.children.findIndex(function (t) {
              return t.link == config.link
            })
            if (sameIndex !== -1) {
              // 删除了
              config.children.splice(sameIndex, 1)
            }
            linkConfigs[language][version][root] = config
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
        Tools.each(linkConfigs[language][version][root], 0, [], function (config, index, list) {
          let simple = {
            link: config.link === 'null' ? config.title : config.link,
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
function toComplexList(simpleList, reader, callback) {
  // 去找有没同名的目录
  function existsSameNameDir(simple, list) {
    let dir = Path.join(...simple.titles, simple.title)
    let index = list.findIndex(function (other) {
      let otherDir = Path.join(...other.titles)
      if (otherDir.includes(dir)) {
        return true
      }
      return false
    })
    return index !== -1
  }

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
    const anchor_links = links.slice(1, links.length).map(Tools.transformToAnchor)
    const anchor_titles = titles.slice(1, titles.length).map(Tools.transformToAnchor)
    // const anchor_links = links.map(Tools.transformToAnchor)
    // const anchor_titles = titles.map(Tools.transformToAnchor)

    const into = existsSameNameDir(simple, simpleList[language][version][root])
    const source = Tools.basePath(language, version, root, link + '.html')
    let url = Path.join(...anchor_links, anchor_link + '.md')
    let preHtml = Tools.basePath('html-pre', language, version, root, ...anchor_links, anchor_link + '.html')
    let postHtml = Tools.basePath('html-post', language, version, root, ...anchor_links, anchor_link + '.html')
    let preMark = Tools.basePath('mark-pre', language, version, root, ...anchor_links, anchor_link + '.md')
    // let postMark = Tools.basePath('mark-post', language, version, root, ...anchor_links, anchor_link + '.md')
    let postMark = Tools.selfPath('mark-post', language, version, root, ...anchor_links, anchor_link + '.md')
    if (into) {
      url = Path.join(...anchor_links, anchor_link, anchor_link + '.md')
      preHtml = Tools.basePath('html-pre', language, version, root, ...anchor_links, anchor_link, anchor_link + '.html')
      postHtml = Tools.basePath('html-post', language, version, root, ...anchor_links, anchor_link, anchor_link + '.html')
      preMark = Tools.basePath('mark-pre', language, version, root, ...anchor_links, anchor_link, anchor_link + '.md')
      // postMark = Tools.basePath('mark-post', language, version, root, ...anchor_links, anchor_link, anchor_link + '.md')
      postMark = Tools.selfPath('mark-post', language, version, root, ...anchor_links, anchor_link, anchor_link + '.md')
    }


    let anchors = []

    function checkKey(key, value) {
      value = Tools.transformToAnchor(value)
      if (anchors.includes(key) && anchors[key] !== value) {
        console.log('居然有不一样')
      }
      anchors[key] = value
    }

    function readFile() {
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
            into: into,
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
    }

    if (FS.existsSync(source)) {
      readFile()
    } else {
      let entryPath = Path.join(root, link + '.html').replaceAll('\\', '/')
      if (!FS.existsSync(Path.dirname(source))) {
        FS.mkdirSync(Path.dirname(source))
      }
      reader.extract(entryPath, source, readFile)
    }
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
    reader.close()
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
      html = html.replaceAll('Scriptref:', '../ScriptReference/')
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
      md = md.replaceAll(/\*\*(.*?)\*\*/gs, function (rep, $1) {
        // 前后剔除空格后 最后面补一个空格
        return ' **' + $1.trim() + '** '
      })

      md = md.replaceAll('{{CODE-START}}', '```csharp')
      md = md.replaceAll('{{CODE-END}}', '```')
      // 对表格进行优化
      md = md.replaceAll('{{BR}}', '<br/>')
      // 对子属性的选项表格
      md = md.replaceAll('|  | ', '|  -> ')


      // 图片类型链接 -> 改名和改链接
      // !\[(.*?)\]\((.*?)\)
      // \!\[(\V*?\S*?)\]\((.*?)\)
      md = md.replaceAll(/!\[(.*?)\]\((.*?)\)/g, function (rep, $1, $2) {
        let name = Path.basename($2)
        if ($1.length == 0) {
          rep = rep.replace('![]', '![' + name + ']')
        }
        rep = rep.replace('../', Tools.baseURL(complex.language, complex.version))
        rep = rep.replace('./', Tools.baseURL(complex.language, complex.version))
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
    let slug =
      '---\n' +
      'id: ' + complex.link + '\n' +
      'title: ' + complex.title.replaceAll(':', '') + '\n'
    if (complex.into) {
      // 自己就是目录的slug
      slug += 'slug: /' + complex.anchor_link + '\n'
    } else {
      if (complex.anchor_links.length > 0) {
        // 最后一个目录作为自身的路径
        let last = complex.anchor_links[complex.anchor_titles.length - 1]
        if (last === undefined) {
          console.log()
        }
        slug += 'slug: /' + last + '/' + complex.anchor_link + '\n'
      }
    }
    slug += '---\n\n'
    writeStream.write(slug)
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
              if (file === '' || file === undefined) {
                console.log()
              }
              let ref = toFileReference(file, complex, complexList)
              let anchor = toFileAnchor(tag, file, complex, complexList)
              if (anchor) {
                return ref + '#' + anchor
              }
              return ref
            })
          } else if (newReference.includes('30_search')) {
            newReference = newReference.replaceAll(/(.*.html)/g, function (rep) {
              return toFileReference(rep, complex, complexList)
            })
          } else if (newReference.match(/(.*.html|.*.md)/g)) {
            newReference = newReference.replaceAll(/(.*.html|.*.md)/g, function (rep) {
              return toFileReference(rep, complex, complexList)
            })
          } else if (newReference.match(/(^\.\/.*)/gm)) {
            // 多行模式匹配 ./
            newReference = newReference.replaceAll(/(^\.\/.*)/g, function (rep) {
              return toFileReference(rep, complex, complexList)
            })
          } else if (newReference.includes('mailto:')) {

          } else {
            // 只有名字  可能是锚点 也可能是 文件
            let anchor = toFileAnchor(newReference, '', complex, complexList)
            if (anchor) {
              newReference = '#' + anchor
            } else {
              let ref = toFileReference(newReference + '.html', complex, complexList)
              newReference = ref
            }
          }
          lineRep = lineRep.replaceAll(lineReference, newReference)
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
  let targetComplex = findListAndComplex(file, complex, complexList)
  if (targetComplex === undefined) {
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
    let name = getFileName(file, complex)
    let ext = getFileExtName(file)
    let root = getFileRoot(file, complex)
    let targetComplex = findListAndComplex(file, complex, complexList)
    if (targetComplex === undefined) {
      // 反正找不到 编
      if (name.includes('.') && !name.includes('-')) {
        // 大概率脚本
        return Tools.baseURL(complex.language, complex.version, 'ScriptReference', '/' + name + ext)
      }
      if (name.includes('-')) {
        return Tools.baseURL(complex.language, complex.version, 'Manual', '/' + name + ext)
      }
      // console.log('反正找不到', name, ext)
      return Tools.baseURL(complex.language, complex.version, root, '/' + name + ext)
    }
    return targetComplex.url
  } else {
    // 没有名字的就是以 自身 为文件路径寻找锚点
    return file
  }
}

// 找到匹配的复杂对象
function findListAndComplex(file, complex, complexList) {
  if (file.length === 0) {
    return complex
  }
  let name = checkName(getFileName(file, complex))
  let root = getFileRoot(file, complex)
  let list = complexList[complex.language][complex.version][root]
  if (list === undefined) {
    // console.log('root 找不到', name)
    return undefined
  }
  // 开始查找
  let targetComplex = list.find(function (t) {
    return t.link == name || t.anchor_link == name
  })
  if (targetComplex === undefined) {
    // console.log('link 找不到', name)
    return undefined
  }
  return targetComplex
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
function getFileName(file, complex) {
  let ext = Path.extname(file)
  if (ext.length === 0) {
    ext = '.html'
    if (file.endsWith('/')) {
      file = file + 'index' + ext
    } else {
      file = file + ext
    }
  }
  let name = Path.basename(file).replace(ext, '')
  name = checkName(name)
  if (name.length == 0) {
    return complex.link
  }
  return name
}

// 获取文件扩展名
function getFileExtName(file) {
  let ext = Path.extname(file)
  if (ext.length === 0) {
    ext = '.html'
  }
  if (ext === '.md') {
    ext = '.html'
  }
  if (!ext.match(/\.(zip|html|png|jpg|md)/g)) {
    ext = '.html'
  }
  return ext
}

const mdNameModifyList = {
  '': '',
  // 'Packages': 'released-packages',
  // 'UnityOverview': 'interface-overview',
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
