/*
 本文件包含3个功能

 1.bridge
 2.域名拼接
 3.查询参数获取

 */
(function(window) {
    var DEBUG = !!~window.location.href.indexOf('bridge-debug=true');
    var callbacks = {};
    var guid = 0;
    var ua = navigator.userAgent.toLowerCase();
    var ANDROID = /android/.test(ua);
    var IOS = /iphone|ipad/.test(ua);
    var WP = /windows phone/.test(ua);


    /*添加对IOS10的兼容处理 by qp*/
    /*
     * IOS的UA规则如: zbj/9.3.2/zbj_ios_5.1.6_buyer
     * 9.3.2表示IOS系统版本  5.1.6表示APP版本
     *
     * Android的UA规则如: zbj_android_4.1.8_seller
     *                      4.1.8表示APP版本
     *
     * UA最后添加的关键字buyer(买家版) seller(钉耙)
     *
     * 买家版5.1.7版本才添加关键字buyer 并同时支持IOS10新协议
     * 钉耙4.1.8版本才添加关键字seller 并同时支持IOS10新协议
     */
    var BUYER = /buyer/.test(ua); // 是否为支持IOS10新协议的买家版
    var SELLER = /seller/.test(ua); // 是否为支持IOS10新协议的钉耙

    // IOS10以下以及旧版本的客户端走oldRule
    function isOldRule(IOS_SYSTEM_VERSION){
        // 添加了客户端区分字段才支持IOS10
        var isOldVersion = !BUYER && !SELLER ;
        return (IOS_SYSTEM_VERSION < 10) && isOldVersion;
    }


    /**
     * 方便在各个平台中看到完整的 log
     */
    function log() {
        if (DEBUG) {
            console.log.call(console, Array.prototype.join.call(arguments, ' '));
        }
    }


    /**
     * 平台相关的 Web 与 Native 单向通信方法
     */
    function invoke(cmd) {
        log('invoke', cmd);

        if (ANDROID) {
            prompt(cmd);
        }
        else if (IOS) {
            var IOS_SYSTEM_VERSION = /zbj\/(\d+)/.exec(ua) ? /zbj\/(\d+)/.exec(ua)[1] : 0;
            var bridgeRFC = isOldRule(IOS_SYSTEM_VERSION) ? 'bridge://' : 'bridge://MobileNative?query=';

            var iframe = document.createElement('IFRAME');
            iframe.setAttribute('src',  bridgeRFC + cmd);
            document.documentElement.appendChild(iframe);
            iframe.parentNode.removeChild(iframe);
            iframe = null;
        }
        else if (WP) {
            // ...
        }
    }

    var Bridge = {
        callByJS: function(opt) {
            log('callByJS', JSON.stringify(opt));

            var input = {};
            input.name = opt.name;
            input.token = ++guid;
            input.param = opt.param || {};
            callbacks[input.token] = opt.callback;

            invoke(JSON.stringify(input));
        },
        callByNative: function(opt) {
            log('callByNative', JSON.stringify(opt));

            var callback = callbacks[opt.token];
            var ret = opt.ret || {};
            var script = opt.script || '';

            // Native 主动调用 Web
            if (script) {
                log('callByNative script', script);
                try {
                    invoke(JSON.stringify({
                        token: opt.token,
                        ret: eval(script)
                    }));
                } catch (e) {
                    console.error(e);
                }
            }
            // Web 主动调用 Native，Native 被动的响应
            else if (callback) {
                callback(ret);
                try {
                    delete callback;
                    log(callbacks);
                } catch (e) {
                    console.error(e);
                }
            }
        },
        /*
         callbyjs方法二次封装
         options:参数对象
         {
         platform:代表需要发送本次bridge的平台，0：安卓与IOS，1：安卓，2：ios，可为空，默认0
         bridgeData:代表要发送的bridgeData，与callByJs方法的参数相同，非空
         successCallback：匹配平台成功执行的回调函数，可为空
         normalCallback：匹配平台失败执行的回调函数，可为空
         }
         */
        branch:function(options){
            var platform=options.platform || 0;
            var result=false;
            var m_ANDROID=ua.toLowerCase().match('zbj_android');
            var m_IOS=ua.toLowerCase().match('zbj_ios');
            switch(platform){
                case 0:
                    result=m_ANDROID || m_IOS;
                    break;
                case 1:
                    result=m_ANDROID;
                    break;
                case 2:
                    result=m_IOS;
                    break;
            }
            if(result){
                this.callByJS(options.bridgeData);
                (typeof options.successCallback=="function") && options.successCallback();
            }
            else{
                (typeof options.normalCallback=="function") && options.normalCallback();
            }
        }
    };


    //返回当前环境
    var getCurrentHost = function(){
        var host=location.host;
        var reg=/app.(\w*).zbjdev.com/;
        if(host.match(reg)){
            return host.match(reg)[1];
        }else if(host=='app.zbj.com'){
            return '';
        }else{
            return 'dev';
        }
    };
    //拼接不同的环境
    function getUrl(host,env){
        var obj={};
        var domain=(env?'.zbjdev.com':'zbj.com');
        host=(host.match('http')&&!env)?host.replace('http','https'):host;
        obj[env]=host+env+domain;
        return obj;
    }

    //获取链接后的参数par，返回string
    function getPar(par){
        //获取当前URL
        var local_url = document.location.href;
        //获取要取得的get参数位置
        var get = local_url.indexOf(par +'=');
        if(get == -1){
            return false;
        }
        //截取字符串
        var get_par = local_url.slice(par.length + get + 1);
        //判断截取后的字符串是否还有其他get参数
        var nextPar = get_par.indexOf('&');
        if(nextPar != -1){
            get_par = get_par.slice(0, nextPar);
        }
        return get_par;
    }
    //获取链接后的参数，返回object
    var getQueryStringArgs = function(){
        var qs=location.search.length>0?location.search.substring(1):"",
            args={},
            items=qs.split("&"),
            len=items.length,
            name=null,
            value=null;
        if(qs.length==0)
            return;
        var item;
        for(var i=0;i<len;i++){
            item=items[i].split("=");
            name=decodeURI(item[0]);
            value=decodeURI(item[1]);
            args[name]=value;
        }
        return args;
    };

    var currentHost=getCurrentHost();
    window.mobileHost = getUrl('m.',currentHost);
    window.javaHost = getUrl('wxapi.',currentHost);//match(/(freeorder)|(lottery)
    if (location.href.match(/(dingpa_web)/)) {
        window.javaHost = getUrl('http://wxfws.',currentHost);
    }
    window.wxapiHost = getUrl('wxapi.',currentHost);
    window.buyerHost = getUrl('buyer.',currentHost);
    window.phpHost = getUrl('i.api.',currentHost);
    window.frontEndHost = getUrl('app.',currentHost);
    window.mHost= getUrl('m.',currentHost);
    window.topicHost= getUrl('topicHost.',currentHost);
    window.topic=getUrl('topic.',currentHost);
    window.fwsHost= getUrl('http://wxfws.',currentHost);
    window.wapEndHost=getUrl('wapactivity.',currentHost);
    window.mStaticHost=getUrl('m.zbjimg.',currentHost);
    window.rmsHost={
        't4':'zbjrms.t10.zbjdev.com',
        't18':'zbjrms.t10.zbjdev.com',
        'e1':'zbjrms.t10.zbjdev.com',
        'dev':'zbjrms.t10.zbjdev.com',
        'stage':'zbjrms.stage.zbjdev.com',
        '':'rms.zbj.com'
    };
    window.getCurrentHost = getCurrentHost;

    window.getPar = getPar;
    window.getQueryStringArgs = getQueryStringArgs;

    window.Bridge = Bridge;
    window.__log = log;

})(window);