// // let name = '![](https://docs.unity3d.com/cn/current/uploads/Main/MecanimAnimationLayers.png)'
// //
// // const path = require('path')
// // //
// // // let dir = path.dirname(name)
// // // let base = path.basename(name)
// // // let extname = path.extname(name)
// // // let toNamespacedPath = path.toNamespacedPath(name)
// // // let
// // // print(dir)
// //
// // name = name.replaceAll(/\!\[\]\(.*?\)/g, function (rep) {
// //   let url = rep.replaceAll('![](', '').replaceAll(')', '')
// //   let name = path.basename(url)
// //   rep = rep.replaceAll('![]', '![' + name + ']')
// //   return rep
// // })
// //
// // print(name)
//
//
const fs = require('fs')

let html = fs.readFileSync('E:\\nodejs\\unity_doc\\cn\\2022.1\\temp\\Manual\\unity-manual\\platform-specific\\windows-store\\windowsstore-faq.html').toString()

html = html.replaceAll('\r\n', '\n')

html = html.replaceAll(/\<colgroup\>\n((.|\n)*?)\<tbody\>/g, function (rep, $1) {
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

console.log(html)


// function resolveAfter2Seconds() {
//   return new Promise(resolve => {
//     setTimeout(() => {
//       resolve('resolved');
//     }, 2000);
//   });
// }
//
// async function asyncCall() {
//   console.log('calling');
//   const result = await resolveAfter2Seconds();
//   console.log(result);
//   // expected output: "resolved"
// }
//
// asyncCall();
