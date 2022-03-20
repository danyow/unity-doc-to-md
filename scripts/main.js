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
const fs = require("fs");

const VERSION = '2022.1'
const LANGUAGE = 'cn'
const BASEURL = 'https://docs.unity3d.com/' + LANGUAGE + '/' + VERSION
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

const BASE_PATH = Path.resolve('../unity_doc/', LANGUAGE, VERSION)

//要遍历的文件夹所在的路径
const ROOT_PATH = Path.join(BASE_PATH, 'root')
const TEMP_PATH = Path.join(BASE_PATH, 'temp')
// const MARK_PATH = path.join(BASE_PATH, 'markdown')
const MARK_PATH = Path.resolve('../doc-unity-manual/docs/')

function main() {
  request(function (linkConfigs) {
    toList(linkConfigs, function (complexList) {

    })
  })
}

main()

// 准备网络请求
function request(callback) {
  const languages = ['cn']
  const versions = ['2022.1']
  const roots = ['Manual', 'ScriptReference']

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

// 准备转换成数组
function toList(linkConfigs, callback) {

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
    const source = Tools.basePath(language, version, root, link + '.html')
    const temp = Tools.basePath('temp', language, version, root, ...anchor_links, anchor_link + '.html')
    const target = Tools.basePath('mark', language, version, root, ...anchor_links, anchor_link + '.md')


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
        for (const match of html.matchAll(/<a href="#(.+)">(.+)<\/a>/g)) {
          checkKey(match[1], match[2])
        }

        for (const match of html.matchAll(/<a name="(.+)">.+[\r\n]+<h\d>(.+)<\/h\d>/g)) {
          checkKey(match[1], match[2])
        }
        let complex = {
          link: link,
          title: title,
          links: links,
          titles: titles,
          anchor_link: anchor_link,
          anchor_title: anchor_title,
          anchor_links: anchor_links,
          anchor_titles: anchor_titles,
          source: source,
          temp: temp,
          target: target,
        }
        complex.anchors = anchors
        callback(complex)
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
