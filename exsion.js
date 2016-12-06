
var fs=require('fs');
var util=require('util');
var fs = require('fs')


//遍历文件夹，获取所有文件夹里面的文件信息
/*
 * @param path 路径
 *
 */

function geFileList(path)
{
    var filesList = [];
    readFile(path,filesList);
    return filesList;

}//写一个函数
function readFile(path,filesList) {
   var files=fs.readdirSync(path);
    files.forEach(walk);
    function walk(file) {
        filesList.push(file)
    }
}
var filesList = geFileList("../../Downloads/node");
console.log(filesList)