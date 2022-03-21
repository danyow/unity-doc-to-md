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
// const fs = require('fs')

// let html = fs.readFileSync('E:\\nodejs\\unity_doc\\cn\\2022.1\\temp\\Manual\\unity-manual\\platform-specific\\windows-store\\windowsstore-faq.html').toString()
//
// html = html.replaceAll('\r\n', '\n')
//
// html = html.replaceAll(/\<colgroup\>\n((.|\n)*?)\<tbody\>/g, function (rep, $1) {
//   if ($1.includes('<thead>')) {
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
//       } else {
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
// console.log(html)


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

// const fs = require('fs')
// const async = require("async");
//
// // async function m() {
// //
// // }
// let queue = async.queue(function (file, callback) {
//   fs.readFile(file, 'utf-8', callback);
// }, 10);
// queue.drain(() => {
//   console.log('Successfully processed all items');
// })
//
// fs.readdirSync('./scripts').forEach(function (file) {
//   queue.push(file, function (err, data) {
//     console.log(file)
//   });
// });


// // Importing the async module
// const async = require('async');
//
// // Creating a tasks array
// const tasks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
//
// // Defining the queue
// const queue = async.queue((task, completed) => {
//   console.log("Currently Busy Processing Task " + task);
//
//   // Simulating a Complex task
//   setTimeout(()=>{
//     // The number of tasks to be processed
//     const remaining = queue.length();
//     completed(null, {task, remaining});
//   }, 1000);
//
// }, 1); // The concurrency value is 1
//
//
// // The queue is idle as there are no elements
// // for the queue to process
// console.log(`Did the queue start ? ${queue.started}`)
//
// // Adding the each task to the queue
// tasks.forEach((task)=>{
//
//   // Adding the 5th task to the head of the
//   // queue as it is deemed important by us
//   if(task == 5){
//     queue.unshift(task, (error, {task, remaining})=>{
//       if(error){
//         console.log(`An error occurred while processing task ${task}`);
//       }else {
//         console.log(`Finished processing task ${task}. ${remaining} tasks remaining`);
//       }
//     })
//     // Adding the task to the tail in the order of their appearance
//   } else {
//     queue.push(task, (error, {task, remaining})=>{
//       if(error){
//         console.log(`An error occurred while processing task ${task}`);
//       }else {
//         console.log(`Finished processing task ${task}. ${remaining} tasks remaining`);
//       }
//     })
//   }
// });
//
//
// // Executes the callback when the queue is done processing all the tasks
// queue.drain(() => {
//   console.log('Successfully processed all items');
// })
//
// // The queue is not idle it is processing the tasks asynchronously
// console.log(`Did the queue start ? ${queue.started}`)


const Path = require('path')

let md = '# Sprite Editor：Custom Physics Shape\n' +
  '\n' +
  'Sprite Editor 的 [Custom Physics Shape][1] 模块用于编辑精灵的物理形状；物理形状定义了精灵 [2D 碰撞体][2]网格的初始形状。可以通过碰撞体的组件设置进一步细化物理形状。\n' +
  '\n' +
  '要打开 Custom Physics Shape 模块，请在 Project 窗口中选择要编辑的精灵。要在 Sprite Editor 窗口中打开该精灵，请在该精灵的 Inspector 窗口中选择 **Sprite Editor** 按钮。\n' +
  '\n' +
  '要打开 Custom Physics Shape 编辑器，请在 Sprite Editor 窗口中，打开左上角的下拉菜单并选择 Custom Physics Shape 模块。\n' +
  '\n' +
  '![从 Sprite Editor 下拉菜单中选择 Custom Physics Shape](../uploads/Main/2D-CustomPS-modulemenu.png)\n' +
  '\n' +
  '从 Sprite Editor 下拉菜单中选择 **Custom Physics Shape**\n' +
  '\n' +
  '## Custom Physics Shape 编辑器\n' +
  '\n' +
  '![在 Custom Physics Shape 编辑器中编辑精灵的物理性状。](../uploads/Main/2D-CustomPS-window.png)\n' +
  '\n' +
  '在 **Custom Physics Shape** 编辑器中编辑精灵的物理性状。\n' +
  '\n' +
  '## Custom Physics Shape 编辑器的属性\n' +
  '\n' +
  ' \n' +
  '| 属性 | 功能 |\n' +
  '| --- | --- |\n' +
  '| **Snap** | 将控制点贴靠到最近的像素。 |\n' +
  '| **Outline Tolerance** | 使用此滑动条可控制生成的轮廓贴合精灵纹理轮廓的紧密和精确程度。在最小值 (0) 时，Sprite Editor 会在精灵周围生成基本轮廓。在最大值 (1) 时，Sprite Editor 生成一个尽可能贴合精灵轮廓的轮廓。 |\n' +
  '| **Generate** | 当您单击此按钮时，Unity 会根据您设置的 **Outline Tolerance** 值自动创建一个物理形状轮廓。 |\n' +
  '| **Copy** | 生成或设置自定义物理形状后，单击此 **Copy** 按钮复制自定义物理形状。离开 Custom Physics Shape 模块或关闭 Sprite Editor 会从内存中删除复制的物理形状。 |\n' +
  '| **Paste** | 使用此按钮将复制的物理形状粘贴到当前选定的精灵。如果您尚未使用 **Copy** 功能复制一个物理形状的功能，此按钮不可用。**Paste** 将自定义物理形状复制到另一个精灵，在 Custom Physics Shape 编辑器窗口打开时，在 Project 窗口中选择该精灵。然后单击 **Paste** 按钮将复制的物理形状粘贴到新的精灵。当您粘贴物理形状时，如果物理形状中的某个点大于精灵的框架，Unity 会将该点限制到该精灵的框架内。 |\n' +
  '| **Paste All** | Use this button to paste a copied physics shape to all Sprites in the Sprite Editor window, regardless of selection. If you have not used the **Copy** function to copy a physics shape, this button is not available. Use this function to apply the same physics shape to multiple Sprites in the same Texture (such as when a Texture has its [Sprite Mode][3] set to ‘Multiple’). When you paste the physics shape, if a point in the physics shape exceeds the Sprite’s frame, Unity clamps the point to be inside that Sprite’s frame. |\n' +
  '| **Revert** | 撤消在编辑器窗口中所做的任何未保存的最近更改。要保存更改，请先单击 **Apply**。 |\n' +
  '| **Apply** | 选择此按钮可保存在编辑器窗口中所做的所有更改。 |\n' +
  '\n' +
  '## 使用 Custom Physics Shape 编辑器\n' +
  '\n' +
  'Custom Physics Shape 编辑器提供了各种功能，允许您创建或生成精灵的物理形状。有两种方法可以创建自定义物理形状：让 Unity 自动[生成][4]形状，或在编辑器窗口中[手动创建和编辑][5]形状。\n' +
  '\n' +
  '### 生成物理形状\n' +
  '\n' +
  '要让 Unity 自动生成物理形状，使其遵循原始精灵纹理的形状并考虑纹理中的透明区域，请单击 **Generate** 按钮。但是，您可以通过 \\*\\*Outline Tolerance \\*\\* 滑动条来调整生成的物理形状与精灵纹理的紧密程度。\n' +
  '\n' +
  '![Outline Tolerance 滑动条旁边的 Generate 按钮。](../uploads/Main/2D-CustomPS-generatebutton.png)\n' +
  '\n' +
  '**Outline Tolerance** 滑动条旁边的 **Generate** 按钮。\n' +
  '\n' +
  '调整 **Outline Tolerance** 滑动条可细化 Unity 生成的物理形状的轮廓。增加该值会增加轮廓与精灵纹理形状的紧密程度。将滑动条保留为 0 会生成一个更松散地遵循精灵纹理的物理形状。\n' +
  '\n' +
  '![使用 Outline Tolerance 滑动条细化生成的轮廓。](../uploads/Main/2D-CustomPS-outlineslider.png)\n' +
  '\n' +
  '使用 **Outline Tolerance** 滑动条细化生成的轮廓。\n' +
  '\n' +
  '调整 Outline Tolerance 值后，要让 Unity 根据滑动条设置自动生成物理形状，请单击 **Generate**。如果在生成轮廓后调整滑动条的值，以根据新的值重新生成轮廓，请再次单击 **Generate** 。\n' +
  '\n' +
  '![生成的轮廓和控制点。](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline.png)\n' +
  '\n' +
  '生成的轮廓和控制点。\n' +
  '\n' +
  '### 手动编辑物理形状\n' +
  '\n' +
  '您可以创建自己的自定义物理形状并通过两种方式对其进行编辑。第一种方式是自动[生成][6]一个轮廓，然后移动生成的轮廓的控制点以进一步细化它。或者，在 Custom Physics Shape 编辑器窗口中的任何空间上单击并拖动，以创建具有四个控制点的矩形轮廓，然后通过移动控制点或添加和删除控制点开始细化轮廓。\n' +
  '\n' +
  '#### 移动控制点\n' +
  '\n' +
  '要调整网格轮廓的形状，请单击并拖动控制点。将鼠标悬停在控制点上时，控制点会变为蓝色，表示可以选择它。单击控制点并将其拖动到不同位置以调整物理形状轮廓的形状。您可以通过单击并拖动光标经过某个区域，以选择该区域内的所有控制点，从而一次选择多个控制点。之后您可以重新定位或[移除][7]所有选定的控制点。\n' +
  '\n' +
  '![选中的控制点变为蓝色。](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline-selectedCP.png)\n' +
  '\n' +
  '选中的控制点变为蓝色。\n' +
  '\n' +
  '#### 添加/移除控制点\n' +
  '\n' +
  '要添加控制点，请将光标置于轮廓边缘。沿着轮廓的边缘会出现控制点的预览。单击即可在该位置添加新控制点。要移除一个控制点，可选择该并按 **Del/Command+Del 键**。\n' +
  '\n' +
  ' \n' +
  '| ![2D-CustomPS-generatedoutline-addremove1.png](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline-addremove1.png) | ![2D-CustomPS-generatedoutline-addremove2.png](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline-addremove2.png) |\n' +
  '| --- | --- |\n' +
  '| 图 1：透明控制点。 | 图 2：单击创建新控制点。 |\n' +
  '\n' +
  '#### 移动边缘\n' +
  '\n' +
  '要选择物理形状的边缘而不是其控制点，请按住 **Control/Ctrl** 键。单击并拖动突出显示的边缘将其移动到新的位置以改变物理形状。\n' +
  '\n' +
  ' \n' +
  '| ![2D-CustomPS-generatedoutline-edge1.png](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline-edge1.png) | ![2D-CustomPS-generatedoutline-edge2.png](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline-edge2.png) |\n' +
  '| --- | --- |\n' +
  '| 图 1：选择轮廓的边缘。 | 图 2：选择边缘后可以自由拖动和移动边缘。 |\n' +
  '\n' +
  '## 使用多个轮廓\n' +
  '\n' +
  '精灵的物理形状可以包含多个单独的轮廓。如果只有精灵的特定区域需要 2D 碰撞体网格 (Collider 2D Mesh) 进行碰撞，这将非常有用。例如，您可能希望角色仅响应其精灵特定区域上的碰撞以实现游戏的损坏机制。\n' +
  '\n' +
  '在 Sprite Editor 窗口中单击并拖动任何空白区域，可创建包含 4 个控制点的新矩形轮廓。重复此步骤可以创建更多轮廓。可使用与单个物理形状轮廓相同的方式优化每个轮廓。\n' +
  '\n' +
  ' \n' +
  '| ![2D-CustomPS-generatedoutline-multi1.png](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline-multi1.png) | ![2D-CustomPS-generatedoutline-multi2.png](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline-multi2.png) |\n' +
  '| --- | --- |\n' +
  '| 图 1：单击并拖动以创建包含 4 个点的框。 | 图 2：包含 4 个控制点的框形物理形状。 |\n' +
  '| ![2D-CustomPS-generatedoutline-multi3.png](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline-multi3.png) | ![2D-CustomPS-generatedoutline-multi4.png](https://docs.unity3d.com/cn/2022.1/uploads/Main/2D-CustomPS-generatedoutline-multi4.png) |\n' +
  '| 图 3：再次单击并拖动以创建另一个框。 | 图 4：重复以上步骤创建更多单独轮廓。 |\n' +
  '\n' +
  '## 更多提示\n' +
  '\n' +
  '如果编辑了现有游戏对象正在引用的精灵的轮廓，请右键单击 Collider 2D 组件的标题，然后选择 **Reset**。这将更新 2D 碰撞体网格的形状。\n' +
  '\n' +
  '![从组件的右键单击下拉菜单中选择 Refresh。](../uploads/Main/2D-CustomPS-componentmenu.png)\n' +
  '\n' +
  '从组件的右键单击下拉菜单中选择 **Refresh**。\n' +
  '\n' +
  '* * *\n' +
  '\n' +
  '\\*复制和粘贴编辑器窗口功能添加于 [2020.1][8] NewIn20201\n' +
  '\n' +
  '-   2018–05–24 页面已发布\n' +
  '\n' +
  '[1]: SpriteEditor.html\n' +
  '[2]: Collider2D.html\n' +
  '[3]: texture-type-sprite.html\n' +
  '[4]: #autogenerates\n' +
  '[5]: #manual\n' +
  '[6]: #autogenerates\n' +
  '[7]: #addremove\n' +
  '[8]: https://docs.unity3d.com/2020.1/Documentation/Manual/30_search.html?q=newin20201'

md = md.replaceAll(/!\[(.*?)\]\((.*?)\)/g, function (rep, $1, $2) {
  let name = Path.basename($2)
  if ($1.length == 0) {
    rep = rep.replace('![]', '![' + name + ']')
  }
  console.log($1, $2)
  // rep = rep.replace('../', Tools.baseURL(complex.language, complex.version))
  return rep
})

// console.log(md)
