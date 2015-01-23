//loadScript('a.js', function(){
//    alert(a.name);
//});
//1.识别amd规范的模块
//2.异步加载amd规范的模块
//3.别名配置
//4.自动分析依赖配置
//5.类似nodejs向上搜索机制，根据标识符自动去分析真实路径
//6.请求合并
//7.debug模式
var require,define;

(function(){
    var factoryMap={},
        modulesMap={},
        config,
        hasLoad={};
    Array.prototype.distinct = function(){
        var newArr=[],obj={};
        for(var i=0,len=this.length;i<len;i++){
            if(!obj[typeof(this[i]) + this[i]]){
                newArr.push(this[i]);
                obj[typeof(this[i])+this[i]]='new';
            }
        }
        return newArr;
    };

    define=function(id,factory){
        //id即可以找到该脚本的标识符，factory即该脚本对应的回调函数，同时该factory有（require,exports,module）三个参数返回，其中exports是module的一个属性
        factoryMap[id]=factory;
    };
    require=function(id){
        id=require.config.alias[id];
        var mod=modulesMap[id];
        if (mod) {
            return mod.exports;
        }
        //
        // init module
        //
        var factory = factoryMap[id];
        if (!factory) {
            //throw Error('Cannot find module `' + id + '`');
            //如果找不到模块的工厂函数，说明还没有被加载
//            console.log(require.config);
//            if(require.config.alias[id]&&!hasLoad[id]){
//                var deps= findDeps(require.config.alias[id]).distinct();//['a','c']
//                deps.splice(0, 0, id);
//                console.log(deps);
//                for(var i=0;i<deps.length;i++){
//                    var dep=deps[i];
//                    var depRealName=require.config.alias[dep];
//                    loadScript(require.config.base||''+depRealName, dep,function(dep){
//                        hasLoad[dep]=true;
//                        console.log(dep+' has loaded!');
//                        if(dep==id){
//                            console.log('dep==id!');
//                            require(id);
//                        }
//                    });
//                }
//            }else{
//                console.log('can\'t find '+id+' \' alias!');
//            }
        }

        mod = modulesMap[id] = {
            'exports': {}
        };

        var ret = (typeof factory == 'function')
            ? factory.apply(mod, [require, mod.exports, mod])
            : factory;

        if (ret) {
            mod.exports = ret;
        }

        return mod.exports;

    };
    require.config=function(obj){
        require.config=obj;
    };
    require.async=function(names,callbacks){
        if(typeof names =='string'){
            names=[names];
        }
        for(var i=0;i<names.length;i++){
            var name=names[i];
            if(require.config.alias[name]){
                name=require.config.alias[name];
            }
            loadScript(require.config.base+name, callbacks[i]);
        }
    };
    function findDeps(name){
        var deps=[];
        if(require.config.deps[name]){
            deps=deps.concat(require.config.deps[name]);

            for(var i=0;i<deps.length;i++){
                var depName=deps[i];
                if(require.config.alias[depName]){
                    deps=deps.concat(findDeps(require.config.alias[depName]));
                }else{
                    console.log('can\'t find '+depName+' \' alias!');
                }
            }
        }else{
            return deps;
        }
        return deps;
    }
    function loadScript(url,name,callback) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        if (script.readyState) { //IE
            script.onreadystatechange = function () {
                if (script.readyState == "loaded" ||
                    script.readyState == "complete") {
                    script.onreadystatechange = null;
                    callback(name);
                }
            };
        } else { //Others: Firefox, Safari, Chrome, and Opera
            script.onload = function () {
                callback&&callback(name);
            };
        }
        script.src = url;
        document.body.appendChild(script);
    }
})();
