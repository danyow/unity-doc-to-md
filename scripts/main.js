/**
 * https://storage.googleapis.com/localized_docs/zh-cn/2022.1/UnityDocumentation.zip
 */

const VERSION = '2022.1'
const LANGUAGE = 'cn'
const BASEURL = 'https://docs.unity3d.com/' + LANGUAGE + '/' + VERSION
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const TService = require("turndown")
const TPlugin = require('turndown-plugin-gfm')
const fileToPath = require('./fileToPath')
const httpRequest = require('./httpRequest')
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

const BASE_PATH = path.resolve('../unity_doc/', LANGUAGE, VERSION)

//要遍历的文件夹所在的路径
const ROOT_PATH = path.join(BASE_PATH, 'root')
const ANCH_PATH = path.join(BASE_PATH, 'anchor')
const TEMP_PATH = path.join(BASE_PATH, 'temp')
const MARK_PATH = path.join(BASE_PATH, 'markdown')

// 专门测试某个文件
const debugFiles = [
  // "class-TextureImporter",
  // "AccelerationEvent",
  // "class-GUISkin"
  // "UnityAnalyticsTerminology"
];

const excludeFileNames = [
  "30_search"
];

const mdNameModifyList = {
  "CompilationPipeline.GetAssemblyDefinitionPlatforms": "Compilation.CompilationPipeline.GetAssemblyDefinitionPlatforms",
  // "UISystem" : "com.unity.modules.ui",
  // "UISystem" : "UI-system-compare",
  "UISystem": "UIElements",
  "class-PlayerSettingstvOS": "tvos-player-settings",
  "IL2CPP-BytecodeStripping": "ManagedCodeStripping",
  "class-PlayerSettingsStandalone": "404",
  "PostProcessing-ColorGrading": "404",
  "AssigningIcons": "404",
  "PresetLibraries": "404",
  "ParticleSystemJobs.ParticleSystemJobData": "404",
  "ExistingPlasticRepo": "404",
};

async function main() {
  let manualURL = BASEURL + '/Manual/docdata/toc.json'
  let scriptURL = BASEURL + '/ScriptReference/docdata/toc.json'
  let mResult = await httpRequest.sendHttpRequest(manualURL)
  let sResult = await httpRequest.sendHttpRequest(scriptURL)
  let manualData = JSON.parse(mResult.data)
  let scriptData = JSON.parse(sResult.data)

  let manualList = toList(manualData, 'Manual')
  let scriptList = toList(scriptData, 'ScriptReference')

  copyFiles(manualList, false)
  // copyFiles(scriptList, true)

  // 对拷贝过后的文件目录转md
}

main().then(_ => {
})


// 转换为锚点可读
function transformToAnchor(link) {
  // 拆分驼峰
  let anchor = link.replace(/([a-z])([A-Z])/g, '$1 $2')
  anchor = anchor.replaceAll(/\w+/g, function (rep) {
    return rep.toLocaleLowerCase()
  })
  // 把 # ( ) . / : " < > 换成 '空格'
  anchor = anchor.replaceAll(/[#().\/:"<>]+/g, function () {
    return ' '
  })
  // 把所有 '空格' 变成 -
  anchor = anchor.replaceAll(/\s+/g, function () {
    return '-'
  })
  return anchor
}


function checkAndWriteFile(file, content = '') {
  if (!fs.existsSync(path.dirname(file))) {
    fs.mkdirSync(path.dirname(file), {recursive: true})
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content)
  }
}

// 遍历 附带 前几次的数据 通过 callback 自定义
function each(configs, preObjects, callback) {
  let object = callback(configs, preObjects)
  if (configs.children && configs.children.length > 0) {
    for (let index = 0; index < configs.children.length; index++) {
      let objects = [...preObjects]
      objects.push(object)
      each(configs.children[index], objects, callback)
    }
  }
}

// 从数据里面得到关于某个键的值
function getValues(objs, action) {
  let values = []
  for (let index = 0; index < objs.length; index++) {
    values.push(action(objs[index]))
  }
  return values
}

// 把对应数据转为数组
function toList(database, root) {
  let dataList = []
  each(database, [], function (config, list) {
    const link = config.link
    const title = config.title
    const links = getValues(list, (obj) => obj.link)
    const titles = getValues(list, (obj) => obj.title)
    const anchor_link = transformToAnchor(config.link)
    const anchor_title = transformToAnchor(config.title)
    const anchor_links = getValues(list, (obj) => obj.anchor_link)
    const anchor_titles = getValues(list, (obj) => obj.anchor_title)
    let data = {
      link: link,
      title: title,
      links: links,
      titles: titles,
      anchor_link: anchor_link,
      anchor_title: anchor_title,
      anchor_links: anchor_links,
      anchor_titles: anchor_titles,
      source: path.join(ROOT_PATH, root, link + '.html'),
      temp: path.join(TEMP_PATH, root, ...anchor_links, anchor_link + '.html'),
      target: path.join(MARK_PATH, root, ...anchor_links, anchor_link + '.md'),
    }
    dataList.push(data)
    return data
  })
  return dataList
}

// 依据数据数组 转换文件到对应目录里面去
function copyFiles(list, isScript = false) {
  let nonExistent = 0
  for (let index = 0; index < list.length; index++) {
    let listData = list[index]
    if (fs.existsSync(listData.source)) {
      writeTemp(listData, isScript, function () {
        let html = handleHtml(listData, isScript)
        if (html !== '') {
          let md = gfm.turndown(html)
          checkAndWriteFile(listData.target, md)
        }
      })
      // 直接转换
    } else {
      nonExistent++
      console.log('源文件不存在', listData)
    }
  }
  console.log('源文件不存在总计:' + nonExistent, '源文件总计:' + list.length)
}

// 写入临时文件
function writeTemp(listData, isScript, doneCallback) {


  checkAndWriteFile(listData.temp)
  let readStream = fs.createReadStream(listData.source, 'utf-8')
  let writeStream = fs.createWriteStream(listData.temp)
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
    writeStream.close(doneCallback)
  })
}


// 预处理 html

function handleHtml(listData, isScript) {
  let html = fs.readFileSync(listData.temp).toString()
  if (html === '') {
    console.log('预处理Html为空', listData)
    return html
  }
  if (isScript) {
    html = html.replaceAll('<a href="" class="switch-link gray-btn sbtn left hide">切换到手册</a>', '')
    html = html.replaceAll('<pre class="codeExampleCS">', '<pre class="codeExampleCS"> {{CODE-START}}')
    html = html.replaceAll('</pre>', '{{CODE-END}} </pre>')
  }
  // 有些引用是 ScriptRef 和 #ScriptRef
  html = html.replaceAll('#ScriptRef:', '../ScriptReference/')
  html = html.replaceAll('ScriptRef:', '../ScriptReference/')
  // 邮箱
  html = html.replaceAll('https://docs.unity3d.com/Manual/mailto:assetstore@unity3d.com.html', 'mailto:assetstore@unity3d.com')
  if (VERSION.includes('2022')) {
    // SpriteAtlas -> SpriteAtlasV2
    html = html.replaceAll('/SpriteAtlas.html', '/SpriteAtlasV2.html')
  }

  // #udp-distribution.html#languages
  html = html.replaceAll('#udp-distribution.html#languages', '../Manual/udp-distribution.html#languages')

  // %5Bhttps://www.google.com/url?q=https://help.apple.com/xcode/mac/11.4/index.html?localePath%3Den.lproj%23/devbc48d1bad&amp;sa=D&amp;source=docs&amp;ust=1636108271363000&amp;usg=AOvVaw2aFjxlOtLMPIBWV1qeXNRN%5D(https://help.apple.com/xcode/mac/11.4/index.html?localePath=en.lproj#/devbc48d1bad)
  // https://www.google.com/url?q=https://help.apple.com/xcode/mac/11.4/index.html?localePath%3Den.lproj%23/devbc48d1bad&amp;sa=D&amp;source=docs&amp;ust=1636108271363000&amp;usg=AOvVaw2aFjxlOtLMPIBWV1qeXNRN
  html = html.replaceAll('%5Bhttps://www.google.com/url?q=https://help.apple.com/xcode/mac/11.4/index.html?localePath%3Den.lproj%23/devbc48d1bad&amp;sa=D&amp;source=docs&amp;ust=1636108271363000&amp;usg=AOvVaw2aFjxlOtLMPIBWV1qeXNRN%5D(https://help.apple.com/xcode/mac/11.4/index.html?localePath=en.lproj#/devbc48d1bad)', 'https://www.google.com/url?q=https://help.apple.com/xcode/mac/11.4/index.html?localePath%3Den.lproj%23/devbc48d1bad&amp;sa=D&amp;source=docs&amp;ust=1636108271363000&amp;usg=AOvVaw2aFjxlOtLMPIBWV1qeXNRN')

  // 对表格优化 换行处理
  html = html.replaceAll('<br>', '{{BR}}')

  // <table>\n<colgroup>\n<col style="text-align:left;">\n<col style="text-align:left;">\n<\/colgroup>\n((.|\n)*?)<tbody>

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
  return html
}
