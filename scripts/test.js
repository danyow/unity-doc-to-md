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

const fs = require('fs')
const async = require("async");

// async function m() {
//
// }
let queue = async.queue(function (file, callback) {
  fs.readFile(file, 'utf-8', callback);
}, 10);
queue.drain(() => {
  console.log('Successfully processed all items');
})

fs.readdirSync('./scripts').forEach(function (file) {
  queue.push(file, function (err, data) {
    console.log(file)
  });
});


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
