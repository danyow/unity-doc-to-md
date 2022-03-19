/**
 * https://storage.googleapis.com/localized_docs/zh-cn/2022.1/UnityDocumentation.zip
 */

const VERSION = '2022.1'
const LANGUAGE = 'cn'
const BASEURL = 'https://docs.unity3d.com/' + LANGUAGE + '/' + VERSION
const fs = require('fs')
const path = require('path')
const TService = require("turndown")
const TPlugin = require('turndown-plugin-gfm')
const fileToPath = require('./fileToPath')
const httpRequest = require('./httpRequest')

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

  copyFiles(manualList, 'Manual')
  copyFiles(scriptList, 'ScriptReference')

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
  // 把所有空格变成-
  anchor = anchor.replaceAll(/\s+/g, function () {
    return '-'
  })
  // 把 # ( ) . / : " < > 换成 空
  anchor = anchor.replaceAll(/[#().\/:"<>]+/g, function () {
    return '-'
  })
  return anchor
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
    const anchor_link = transformToAnchor(config.link)
    const anchor_title = transformToAnchor(config.title)
    const links = getValues(list, (obj) => obj.link)
    const titles = getValues(list, (obj) => obj.title)
    const anchor_links = getValues(list, (obj) => obj.anchor_link)
    const anchor_titles = getValues(list, (obj) => obj.anchor_title)
    let data = {
      source: path.join(ROOT_PATH, root, config.link + '.html'),
      target: path.join(TEMP_PATH, root, ...anchor_titles, anchor_title + '.html'),
      link: link,
      title: title,
      links: links,
      titles: titles,
      anchor_link: anchor_link,
      anchor_title: anchor_title,
      anchor_links: anchor_links,
      anchor_titles: anchor_titles,
    }
    dataList.push(data)
    return data
  })
  return dataList
}

// 依据数据数组 转换文件到对应目录里面去
function copyFiles(list, root) {
  let nonExistent = 0
  for (let index = 0; index < list.length; index++) {
    let manual = list[index]
    // let sourcePath = path.join(ROOT_PATH, root, manual.link + '.html')
    // let manualPath = path.join(TEMP_PATH, root, ...manual.anchor_titles, manual.anchor_title + '.html')

    if (fs.existsSync(manual.source)) {
      if (!fs.existsSync(path.dirname(manual.target))) {
        fs.mkdirSync(path.dirname(manual.target), {recursive: true})
      }
      fs.copyFileSync(manual.source, manual.target)
    } else {
      nonExistent++
      console.log(manual)
    }
  }
  console.log('不存在:' + nonExistent, '总计:' + list.length)
}
