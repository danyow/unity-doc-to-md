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
// let html = '<table>\n' +
//   '<colgroup>\n' +
//   '<col style="text-align:left;">\n' +
//   '<col style="text-align:left;">\n' +
//   '</colgroup>\n' +
//   '\n' +
//   '<thead>\n' +
//   '<tr>\n' +
//   '\t<th style="text-align:left;"><strong>Topic</strong></th>\n' +
//   '\t<th style="text-align:left;"><strong>描述</strong></th>\n' +
//   '</tr>\n' +
//   '</thead>\n' +
//   '\n' +
//   '<tbody>\n' +
//   '\n' +
//   '\n' +
//   '\n' +
//   '<table>\n' +
//   '<colgroup>\n' +
//   '<col style="text-align:left;">\n' +
//   '<col style="text-align:left;">\n' +
//   '</colgroup>\n' +
//   '\n' +
//   '<tbody>\n' +
//   '<tr>\n' +
//   '\t<td style="text-align:left;"><strong>Set Active Scene</strong></td>\n' +
//   '\t<td style="text-align:left;">This allows you to specify which scene new Game Objects are created/instantiated in. There must always be one scene marked as the active scene</td>\n' +
//   '</tr>\n' +
//   '<tr>\n' +
//   '\n' +
//   '\n' +
//   '<table>\n' +
//   '<colgroup>\n' +
//   '<col style="text-align:center;">\n' +
//   '<col style="text-align:center;">\n' +
//   '<col style="text-align:center;">\n' +
//   '<col style="text-align:left;">\n' +
//   '<col style="text-align:left;">\n' +
//   '</colgroup>\n' +
//   '\n' +
//   '<thead>\n' +
//   '<tr>\n' +
//   '\t<th style="text-align:center;">情况</th>\n' +
//   '\t<th style="text-align:center;">生成根运动</th>\n' +
//   '\t<th style="text-align:center;">Animator.applyRootMotion</th>\n' +
//   '\t<th style="text-align:left;">2018.2</th>\n' +
//   '\t<th style="text-align:left;">2018.3 和 2018.4 (LTS)</th>\n' +
//   '</tr>\n' +
//   '</thead>\n' +
//   '\n' +
//   '<tbody>\n' +
//   '<tr>\n' +
//   '\t<td style="text-align:center;">A</td>\n' +
//   '\t<td style="text-align:center;">是</td>\n' +
//   '\t<td style="text-align:center;">是</td>\n' +
//   '\t<td style="text-align:left;">在根变换 (Root Transform) 上累计应用根运动。</td>\n' +
//   '\t<td style="text-align:left;">与 2018.2 相同</td>\n' +
//   '</tr>'
//
// html = html.replaceAll(/<colgroup>\n((.|\n)*?)<tbody>/g, function (rep, $1) {
//   if ($1.includes('<thead>')){
//     return rep
//   }
//   // 判断有多少行
//
//   let col_count = rep.match(/\n/g).length - 3
//   if (col_count > 0) {
//     let thead = '<thead>\n<tr>\n'
//     for (let index = 0; index < col_count; index++) {
//       if (index == 0) {
//         thead += '\t<th style="text-align:left;"><strong>Topic</strong></th>\n'
//       } else{
//         thead += '\t<th style="text-align:left;"><strong>描述</strong></th>\n'
//       }
//     }
//     thead += '</tr>\n</thead>\n\n\<tbody>\n'
//     rep = rep.replaceAll('<tbody>', thead)
//   }
//
//   return rep
// })
//
//
