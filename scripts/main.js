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


function main() {
  request(function (linkConfigs) {
    toSimpleList(linkConfigs, function (simpleList) {
      toComplexList(simpleList, function (complexList) {
        handleHtml(complexList, function () {
          console.log('全部转换完成!!')
        })
      })
    })
  })
}

main()

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
    const temp = Tools.basePath('temp', language, version, root, ...anchor_links, anchor_link + '.html')
    // const target = Tools.basePath('mark', language, version, root, ...anchor_links, anchor_link + '.md')
    const target = Tools.selfPath('mark', language, version, root, ...anchor_links, anchor_link + '.md')


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
          temp: temp,
          target: target,
          anchors: anchors,
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
    console.log(complexList)
    callback(complexList)
  })
}


function handleHtml(complexList, handleCallback) {
  const handleQueue = Async.queue(function (complex, callback) {
    // 判断临时文件是否存在
    if (!FS.existsSync(complex.temp)) {
      FS.mkdirSync(Path.dirname(complex.temp), {recursive: true})
      FS.writeFileSync(complex.temp, '')
    }
    let writeStream = FS.createWriteStream(complex.temp)
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
      writeStream.close(function () {
        FS.readFile(complex.temp, 'utf-8', function (err, html) {
          // 有时候会莫名起码多个\r进去
          html = html.replaceAll('\r\n', '\n')
          // 有些引用是 ScriptRef 和 #ScriptRef
          html = html.replaceAll('#ScriptRef:', '../ScriptReference/')
          html = html.replaceAll('ScriptRef:', '../ScriptReference/')
          // 邮箱
          html = html.replaceAll('https://docs.unity3d.com/Manual/mailto:assetstore@unity3d.com.html', 'mailto:assetstore@unity3d.com')
          if (complex.version.includes('2022')) {
            // SpriteAtlas -> SpriteAtlasV2
            html = html.replaceAll('/SpriteAtlas.html', '/SpriteAtlasV2.html')
          }

          // #udp-distribution.html#languages
          html = html.replaceAll('#udp-distribution.html#languages', '../Manual/udp-distribution.html#languages')

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

          //////////////////////////////////////////////////////////////////////////////
          let md = gfm.turndown(html)
          // const baseURL = Tools.baseURL(complex.language, complex.version)
          // md = md.replaceAll('../StaticFilesManual/', baseURL + '/StaticFilesManual/')
          // md = md.replaceAll('../StaticFiles/', baseURL + '/StaticFiles/')
          // md = md.replaceAll('../uploads/', baseURL + '/uploads/')

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

          // 对 ![](http://xxx.xx) -> ![xxx.xx](http://xxx.xx)
          md = md.replaceAll(/\!\[\]\((.*?)\)/g, function (rep, $1) {
            let name = Path.basename($1)
            rep = rep.replaceAll('![]', '![' + name + ']')
            return rep
          })

          md = md.replaceAll('{{CODE-START}}', '```csharp')
          md = md.replaceAll('{{CODE-END}}', '```')
          // 对表格进行优化
          md = md.replaceAll('{{BR}}', '<br/>')
          // 对子属性的选项表格
          md = md.replaceAll('|  | ', '|  -> ')


          // 对链接优化
          // 首先对链接统一化
          // md = md.replaceAll(Too + '/StaticFilesManual/')

          // 针对锚点 有 # 号
          md = md.replaceAll(/(]: (.+\.html)?#)(.+)/g, function (rep, $1, targetFile, tag) {
            // 首先判断 targetFile 有没有值
            if (targetFile !== undefined) {
              if (targetFile.startsWith('http://') || targetFile.startsWith('https://')) {
                // 完整网站的不管
                return rep
              }
              let targetName = targetFile.replaceAll(Path.extname(targetFile), '')
              // 说明用的是别人的锚点
              let targetComplex = complexList[complex.language][complex.version][complex.root].find(function (t) {
                return t.link == targetName
              })
              if (targetComplex === undefined) {
                // 没有目标文件 返回在线地址
                return ']: ' + Tools.baseURL(complex.language, complex.version, complex.root, '/' + targetFile) + '#' + tag
              }
              if (targetComplex.anchors[tag] === undefined) {
                // 不存在这个锚点
                return ']: ' + targetComplex.url
              }
              return ']: ' + targetComplex.url + '#' + targetComplex.anchors[tag]
            }
            if (complex.anchors[tag] === undefined) {
              // 本文件都不存在这个锚点
              return ']: ' + complex.url
            }
            return ']: ' + '#' + complex.anchors[tag]
          })


          if (!FS.existsSync(complex.target)) {
            FS.mkdirSync(Path.dirname(complex.target), {recursive: true})
          }
          FS.writeFile(complex.target, md, 'utf-8', callback)
        })
      })
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
    console.log(complexList)
    handleCallback(complexList)
  })
}
