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
const ROOT_PATH = path.join(BASE_PATH, 'ROOT')
const ANCH_PATH = path.join(BASE_PATH, 'ANCH')
const TEMP_PATH = path.join(BASE_PATH, 'TEMP')
const MARK_PATH = path.join(BASE_PATH, 'MARK')

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
  let manualURL = BASEURL + '/Manual/docdata/toc.js'
  let scriptURL = BASEURL + '/ScriptReference/docdata/toc.js'
  let mResult = await httpRequest.sendHttpRequest(manualURL)
  let sResult = await httpRequest.sendHttpRequest(scriptURL)
  let mString = mResult.data.replaceAll('toc = ', '').replaceAll(';', '')
  let sString = sResult.data.replaceAll('var toc = ', '').replaceAll(';', '')
  let manualData = eval('(' + mString + ')')
  let scriptData = eval('(' + sString + ')')

  fileToPath.checkDirectory(ROOT_PATH, ANCH_PATH, function (fileName) {
    if ((debugFiles.length !== 0 && !debugFiles.includes(fileName)) || (excludeFileNames.length > 0 && excludeFileNames.includes(fileName))) {
      return false
    }
    return true
  }, function (html) {
    if (html.includes('<div class="message message-error mb20">')) {
      return false
    }
    return true
  })


}

main().then(_ => {
})

