let name = '![](https://docs.unity3d.com/cn/current/uploads/Main/MecanimAnimationLayers.png)'

const path = require('path')
//
// let dir = path.dirname(name)
// let base = path.basename(name)
// let extname = path.extname(name)
// let toNamespacedPath = path.toNamespacedPath(name)
// let
// print(dir)

name = name.replaceAll(/\!\[\]\(.*?\)/g, function (rep) {
  let url = rep.replaceAll('![](', '').replaceAll(')', '')
  let name = path.basename(url)
  rep = rep.replaceAll('![]', '![' + name + ']')
  return rep
})

print(name)
