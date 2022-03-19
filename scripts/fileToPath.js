const fs = require('fs')
const path = require('path')

// 转换为锚点可读
function transformToAnchor(title) {
  let anchor = title.replaceAll(/\w+/g, function (rep) {
    return rep.toLocaleLowerCase()
  })
  // 把所有空格变成-
  anchor = anchor.replaceAll(/\s+/g, function () {
    return '-'
  })
  // 把 # ( ) . / : " 换成 空
  anchor = anchor.replaceAll(/[#().\/:"]+/g, function () {
    return ''
  })
  return anchor
}

// 名字转路径数组
function fileNameToPaths(fileName, sourceDir) {
  // 直接对文件名路径以及 其内容 进行修改
  let paths = fileName.split('.')
  // 对最后一个路径进行分析
  let last = paths[paths.length - 1]
  if (last.includes('-')) {
    paths.pop()
    paths.push(...last.split('-'))
    paths[paths.length - 1] = '-' + paths[paths.length - 1]
  } else {
    // 如果前一个路径有文件 // 说明最后一个路径并不是所需要的
    let prePaths = paths.slice(0, paths.length - 1)
    if (prePaths.length >= 1) {
      let preFilePath = path.join(sourceDir, prePaths.join('.')) + '.html'
      if (fs.existsSync(preFilePath)) {
        paths[paths.length - 1] = '+' + paths[paths.length - 1]
      }
    }
  }
  return paths
}

// 把 + - 排除的全名
function findFullName(paths) {
  let fullName = paths.slice(0, paths.length).join('.')
  if (paths[paths.length - 1].startsWith('-') || paths[paths.length - 1].startsWith('+')){
    fullName = paths.slice(0, paths.length - 1).join('.')
  }
  return fullName
}

// 对部分前缀加入命名空间
function checkPrefix(sourceDir, nameCheckFunc, htmlCheckFunc) {
  let fileInfos = fs.readdirSync(sourceDir)
  let prefixes = {}
  for (let index = 0; index < fileInfos.length; index++) {
    const fileInfo = fileInfos[index]
    const filePath = path.join(sourceDir, fileInfo)
    const fileName = path.basename(fileInfo, path.extname(fileInfo))
    const state = fs.statSync(filePath)
    if (state.isFile() && fileInfo.endsWith('.html')) {
      if (!nameCheckFunc(fileName)) {
        continue
      }
      let html = fs.readFileSync(filePath, 'utf8')
      if (!htmlCheckFunc(html)) {
        continue
      }
      for (const outsideMatch of html.matchAll(/<p class="cl mb0 left mr10">\w+ in (.*?)<\/p>/g)) {
        let fullName = findFullName(fileNameToPaths(fileName, sourceDir))
        let namespace = outsideMatch[1]
        // 如果数组不包含的话
        if (!Object.keys(prefixes).includes(fullName)) {
          // 如果全名里面包括了命名空间最好
          if (fullName.startsWith(namespace)) {
            prefixes[fullName] = fullName
          } else {
            let namespaceList = namespace.split('.')
            let fullNameList = fullName.split('.')
            // 如果命名空间列表里面包括了第一个字段 那么就替换该字段用命名空间替代
            if (namespaceList.includes(fullNameList[0])) {
              fullNameList[0] = namespace
              prefixes[fullName] = fullNameList.join('.')
            } else {
              // 互补包含 那么拼接
              namespaceList.push(...fullNameList)
              prefixes[fullName] = namespaceList.join('.')
            }
          }
        }
      }
    }
  }
  return prefixes
}


exports.checkDirectory = function (sourceDir, tempDir, nameCheckFunc, htmlCheckFunc) {
  if (!fs.existsSync(sourceDir)) {
    return
  }
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, {recursive: true})
  }
  let fileInfos = fs.readdirSync(sourceDir)
  const isScript = sourceDir.includes("ScriptReference")

  let prefixes = {}
  // 提前对部分前缀加入命名空间
  if (isScript) {
    prefixes = checkPrefix(sourceDir, nameCheckFunc, htmlCheckFunc)
    for (const prefixesKey in prefixes) {
      console.log(prefixesKey, '->', prefixes[prefixesKey])
    }
  }

  for (let index = 0; index < fileInfos.length; index++) {
    const fileInfo = fileInfos[index]
    const filePath = path.join(sourceDir, fileInfo)
    const fileName = path.basename(fileInfo, path.extname(fileInfo))
    const tempPath = path.join(tempDir, fileInfo)
    const state = fs.statSync(filePath)
    if (state.isFile() && fileInfo.endsWith('.html')) {
      if (!nameCheckFunc(fileName)) {
        continue
      }
      // 对文件进行解析 找到起路径
      let html = fs.readFileSync(filePath, 'utf8')
      if (!htmlCheckFunc(html)) {
        continue
      }
      let paths = []
      if (isScript) {
        // 直接对文件名路径以及 其内容 进行修改
        paths = fileNameToPaths(fileName, sourceDir)
        let fullName = findFullName(paths)
        if (Object.keys(prefixes).includes(fullName)) {
          paths = paths.join('.').replaceAll(fullName, prefixes[fullName]).split('.')
        } else {
          console.log(fullName)
        }

      } else {
        console.log(fileName)
        // 找到块
        for (const blockMatch of html.matchAll(/<div class="breadcrumbs clear"><ul>\n((.|\n)+)<\/ul><\/div>/g)) {
          // 找到标题
          for (const match of blockMatch[1].matchAll(/<li>(.*?)<\/li>/g)) {
            if (match[1].endsWith('</a>')) {
              for (const href of match[1].matchAll(/<a href="\w+.html">(.*?)<\/a>/g)) {
                // 对该目录名修改为锚点可读
                paths.push(transformToAnchor(href[1]))
              }
            } else {
              // 对该文件名修改为锚点可读
              paths.push(transformToAnchor(match[1]))
            }
          }
        }
      }
      // 最后一个路径(实则文件) 加入 .html
      let newFilePath = path.join(tempDir, ...paths) + '.html'
      let newPath = path.dirname(newFilePath)
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath, {recursive: true})
      }
      fs.writeFileSync(newFilePath, html)
    } else if (state.isDirectory()) {
      exports.checkDirectory(filePath, tempPath, nameCheckFunc, htmlCheckFunc)
    }
  }
}
