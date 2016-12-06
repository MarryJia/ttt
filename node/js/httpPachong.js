/**
 * Created by jyj on 16/8/3.
 */
var http=require('http');
http.get('www.imooc.com',function(res){
    var html='';
    res.on('data',function(data){
        html += data;
    })
    res.on('end',function () {
        console.log(html)
    }).on('error',function () {
        console.log('出错了')
    })
})