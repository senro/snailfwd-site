var fs=require('fs');
fis.config.set('name', '9yin');
fis.config.set('version', '1.0.0');
//设置本地发布路径
fis.config.set('release', '/'+fis.config.get('name')+'/'+fis.config.get('version')+'/');
//设置内网inner 外网outer，发布路径
fis.config.set('releaseToInner', '/'+fis.config.get('name')+'/'+fis.config.get('version')+'/');
fis.config.set('releaseToOuter', '/'+fis.config.get('name')+'/'+fis.config.get('version')+'/');

//使用snailfwd-parser-component插件解析views目录下的**.tpl文件，解析<!--component('xxx')-->
// 或者<!--component("xxx@version")-->为一个组件的引用
fis.config.merge({
    roadmap : {
        ext : {
            md : 'html',
            tpl : 'html'
        }
    },
    modules : {
        parser : {
            md : 'marked',
            tpl : 'component',
            css:'component'
        }
    }
});
//设置发布配置
fis.config.set('roadmap.path', [
    {
        //md后缀的文件不发布
        reg : '**.md',
        release : false
    },
    {
        //txt后缀的文件不发布
        reg : '**.txt',
        release : false
    },
    {
        //publish-bak文件夹不发布
        reg : /^\/publish-bak\//i,
        release : false
    },
    {
        //test后缀的文件夹不发布
        reg : /^\/test\//i,
        release : false
    },
    {
        //component_modules目录下的文件发布到【项目名/version/c/】目录下
        reg : /^\/components_modules\/(.*)$/i,
        id : '$1',
        isComponentModules : true,
        useMap : true,
        release : fis.config.get('release')+'c/$1'
    },
    {
        // component目录下的文件发布到【项目名/version/c/】目录下
        reg : /^\/components\/(.*)$/i,
        id : '$1',
        isComponents : true,
        useMap : true,
        release : fis.config.get('release')+'c/$1'
    },
//    {
//        //项目模块化目录没有版本号结构，用全局版本号控制发布结构
//        reg : /^\/(components|components_modules)\/(.*)\.init\.js$/i,
//        isComponents : false
//    },
    {
        //views目录下的文件发布到【项目名/version/views/】目录下
        reg : /^\/views\/(.*)$/,
        release : fis.config.get('release')+'views/$1',
        isViews : true
    },
    {
        //static目录下的文件发布到【项目名/ version /static/】目录下
        reg : /^\/static\/(.*)$/,
        release : fis.config.get('release')+'static/$1',
        isComponents : false
    },
//    {
//        //md后缀的文件不发布
//        reg : '**.tpl',
//        useMap : true
//    },
    {
        //其他文件就不属于前端项目了，比如nodejs的后端代码
        //不处理这些文件的资源定位替换（useStandard: false）
        //也不用对这些资源进行压缩(useOptimizer: false)
        reg : '**',
        release:false,
        useStandard : false,
        useOptimizer : false
    }
]);
//运行js amd 包装插件
fis.config.merge({
    settings : {
        postprocessor : {
            jswrapper : {
                //wrap type. if omitted, it will wrap js file with '(function(){...})();'.
                type : 'amd'
                //you can use template also, ${content} means the file content
                //template : '!function(){${content}}();',
                //wrap all js file, default is false, wrap modular js file only.
                //wrapAll : true
            }
        }
    }
});
//运行打包插件，自动将页面中独立的资源引用替换为打包资源
//fis.config.set('modules.postpackager', 'simple');
//通过pack设置干预自动合并结果，将公用资源合并成一个文件，更加利于页面间的共用

//Step 2. 取消下面的注释开启pack人工干预
//fis.config.set('pack', {
//    'pkg/lib.js': [
//        '/components_modules/**.js'
//    ],
//    release:'/'+fis.config.get('name')+'/static/'
//});

//Step 3. 取消下面的注释可以开启simple对零散资源的自动合并
//fis.config.set('settings.postpackager.simple.autoCombine', true);

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
function stringObj(obj){
    return JSON.stringify(obj, null, 4);
}
//postpackager插件接受4个参数，
//ret包含了所有项目资源以及资源表、依赖树，其中包括：
//   ret.src: 所有项目文件对象
//   ret.pkg: 所有项目打包生成的额外文件
//   ret.map: 资源表结构化数据
//其他参数暂时不用管
var bulidSnailfwd = function(ret, conf, settings, opt){
    /*
     *1.建立一个别名表aliasMap对象，规则是该文件需在components或者component_modules目录下，
     *如果文件名和文件夹是否同名，则建立别名：模块名：模块完整路径,
     *如果有版本号，则建立一个别名：模块名@version：模块完整路径。
     * aliasMap={
         "a": "a/a.js",
         "b@1.0.0": "b/1.0.0/b.js"
     }
     建立一个components别名表componentsAliasMap对象，规则是该文件需在components或者component_modules目录下，
     每个目录对应一个组件（空目录除外），目录名即默认为组件名，没有版本号的建立别名： 组件名：组件完整路径,
     如果有版本号，则建立一个别名：组件名@version：组件完整路径。
     componentsAliasMap={
     "a": "a/",
     "b@1.0.0": "b/1.0.0/"
     }

     */
    var map = {};
    map.deps = {};
    //别名收集表
    map.alias = {};
    //组件别名收集表
    map.componentsAlias = {};
    //组件收集表
    map.components = {};
    //模板组件依赖表
    map.templateDeps = {};
    //模板组件包
    map.pkg={};

    fis.util.map(ret.src, function(subpath, file){
        //添加判断，只有components和component_modules目录下的文件才需要建立依赖树或别名
        if(file.isComponents || file.isComponentModules){
            //判断一下文件名和文件夹是否同名,包括有版本号的情况，如果同名则建立一个别名
            //var match = subpath.match(/^\/components\/(.*?([^\/]+))\/\2\.js$/i);
            var aliasName=getAliasName(subpath);
            var componentsAliasName=getComponentsAliasName(subpath);

            if(aliasName && !map.alias.hasOwnProperty(aliasName)){
                map.alias[aliasName] = file.id;
            }
            if(componentsAliasName && !map.componentsAlias.hasOwnProperty(componentsAliasName)){
                map.componentsAlias[componentsAliasName] = componentsAliasName.replace(/@/g,'/')+'/';
                //初始化组件对象
                map.components[componentsAliasName]={};
            }
            if(file.requires && file.requires.length){
                map.deps[file.id] = file.requires;
            }

        }
    });

    function getAliasName(path){
        //'/components/menu/0.0.0/menu.js';yes
        //'/components/menu/menu.js';yes
        //'/components/menu/0.0.0/menu.init.js';no
        //'/components/menu/menu.init.js';no
        if(!/\.init|\.html|\.css/g.test(path)){//只针对不带init的js
            var dir,fileName,version;
            if(/[0-9]*\.[0-9]*\.[0-9]*/g.test(path)){
                //有版本号
                //默认组件目录名为components、components_modules，如果有修改，则需修改此处，todo
                dir=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[0];
                version=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[1];
                fileName=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[2].split('.')[0];
                if(dir==fileName){
                    return fileName+'@'+version;
                }
            }else{
                //没有版本号
                dir=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[0];
                fileName=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[1].split('.')[0];
                if(dir==fileName){
                    return fileName;
                }
            }
        }else{
            return false;
        }
        return false;
    }
    function getComponentsAliasName(path){
        //'/components/menu/0.0.0/menu.js';yes
        //'/components/menu/menu.js';yes
        //'/components/menu/0.0.0/menu.init.js';no
        //'/components/menu/menu.init.js';no
        var dir,fileName,version;
        if(/[0-9]*\.[0-9]*\.[0-9]*/g.test(path)){
            //有版本号
            //默认组件目录名为components、components_modules，如果有修改，则需修改此处，todo
            dir=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[0];
            version=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[1];
            //fileName=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[2].split('.')[0];
            return dir+'@'+version;
        }else{
            //没有版本号
            dir=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[0];
            //fileName=path.replace(/^(\/|)(components|components_modules)\//g,'').split('\/')[1].split('.')[0];
            return dir;
        }

    }
    var stringify = JSON.stringify(map.alias, null, opt.optimize ? null : 4);
    var retStr = JSON.stringify(ret, null, opt.optimize ? null : 4);
    var confStr = JSON.stringify(conf, null, opt.optimize ? null : 4);
    var settingsStr = JSON.stringify(settings, null, opt.optimize ? null : 4);
    var fileStr='';
    /*
    * 2.建立一个组件结构表componentsMap对象，因为一个模块包含的资源类型不确定，可能是html、css、js，图片的随机组合，
    * 所以该表可以提供目前该项目用到的所有模块的资源信息，包每个模块拥有的资源类型，每种资源类型的信息，如资源地址，资源内容。
     componentsMap={
     'a':{
         html:'/a/a.html'
         css:'/a/a.css'
         js:'/a/a.js',
         init:'/a/a.init.js'
     },
     'b@version':{
         html:'/b/version/b.html'
         css:'/b/version/a.css'
         js:'/a/version/a.js',
         init:'/a/version/a.init.js'
     },
     'c':{
         html:'/c/c.html'
         css:'/c/c.css',
         js:'',
         init:''
     },
     'd@version':{
         html:' '
         css:''
         js:'/d/version/d.js',
         init:''
     }
     }

     * */
     fis.util.map(ret.src, function(subpath, file){
        if(file.isComponents || file.isComponentModules){
            var fileId=file.id;
            for(var componentsAliasName in map.componentsAlias){
                var componentsName=map.componentsAlias[componentsAliasName];
                var componentsNameReg=new RegExp(componentsName,'g');
                if(componentsNameReg.test(fileId)){
                    //说明该文件是这个组件的资源
                    if(/\.html/.test(fileId)){
                        map.components[componentsAliasName]['html']=file.id;
                    }else if(/\.css/.test(fileId)){
                        map.components[componentsAliasName]['css']=file.id;
                    }else if(/\.init\.js/.test(fileId)){
                        map.components[componentsAliasName]['init']=file.id;
                    }else if(/[^init]\.js$/.test(fileId)){
                        map.components[componentsAliasName]['js']=file.id;
                    }
                }
            }
        }
    });

    /*
    * 3.建立一个tpl模板模块依赖表templateDepsMap对象，记录每个tpl模板用到的所有不重复模块资源地址，和初始化调用的记录。
     templateDepsMap={
     'views/a.tpl':{
     deps:['a','b@version']
     }
     }

     * */
    fis.util.map(ret.src, function(subpath, file){
        fileStr+=JSON.stringify(file, null, opt.optimize ? null : 4);
        if(file.requireComponents){
            console.log(file.id+'  need:  '+file.requireComponents+'\n');
            map.templateDeps[file.id]={css:[],js:[],init:[],pkg:{css:{path:''},js:{path:''}}};
            map.templateDeps[file.id].deps=file.requireComponents.distinct();
            for(var i=0;i<map.templateDeps[file.id].deps.length;i++){
                map.templateDeps[file.id].deps=map.templateDeps[file.id].deps.concat(findDeps(map.templateDeps[file.id].deps[i]));
            }
            map.templateDeps[file.id].deps=delUseless(map.templateDeps[file.id].deps);
            if(file.mainJs){
                map.templateDeps[file.id].mainJs=file.mainJs;
            }
        }
    });

    /*
    * 4. 建立一个需打包的文件表pkgMap对象，记录每个tpl模板用到的组件的打包文件路径。
    * /
    /*pkg={
         "views/a.tpl": {
         "css": [
         "a/0.0.1/a.css",
         "b/b.css"
         ],
         "js": [
         "a/0.0.1/a.js",
         "b/1.10.2/b.js",
         "c/c.js",
         "d/1.0.0/d.js"
         ],
         "init": [
         "a/0.0.1/a.init.js",
         "b/b.init.js"
         ]
         }
     }
     * */
    for(var templateName in map.templateDeps){
        var deps=map.templateDeps[templateName].deps;
        for(var i=0;i<deps.length;i++){
            var componentAliasName=deps[i];
            if(map.components[componentAliasName].css){
                map.templateDeps[templateName].css.push(map.components[componentAliasName].css);
            }
            if(map.components[componentAliasName].js){
                map.templateDeps[templateName].js.push(map.components[componentAliasName].js);
            }
            if(map.components[componentAliasName].init){
                map.templateDeps[templateName].init.push(map.components[componentAliasName].init);
            }
        }
    }
    //console.log(stringObj(map));
    /*
    * 5.根据pkgMap找到每个模板对应的资源包，然后把所有引用样式写到/static/pkg/模板名_ components.css下，
    * 此处应留一个插件接口，可以对打包的组件css进行一些个性化处理和并校正样式里的相对路径资源引用为绝对路径，相对于tpl结构。
    * 所有模块写到/static/pkg/模板名_ components.js里，替换模板里的__COMPONENTS_CSS__为“/static/pkg/模板名_ components.css”
    * 的样式引用，替换__COMPONENTS_JS__为“/static/pkg/模板名_ components.js”的脚本引用，通过页面里带有data-main的脚本标签去
    * 寻找__COMPONENTS_INIT__标签，然后将其替换为所有模块的初始化代码，寻找__COMPONENTS_ALIAS__标签，然后将其替换为所有模块的别名对象。
    * */
    for(var templateName in map.templateDeps){
        var template=map.templateDeps[templateName],
            templateFileName=templateName.split('/')[1].split('.')[0];
        //设置js和css打包文件路径
        template.pkg.css.path=fis.config.get('release')+'static/pkg/'+templateFileName+'_components.css';
        template.pkg.js.path=fis.config.get('release')+'static/pkg/'+templateFileName+'_components.js';
        //写入打包文件到设置地址
        fis.util.write(opt.dest+template.pkg.css.path, getFilesContents(template.css,[translateCssRelativePathToAbsolute]));
        fis.util.write(opt.dest+template.pkg.js.path, getFilesContents(template.js));
        //替换模板里的组件标签为对应的html结构
        for(var i=0;i<template.deps.length;i++){
            var component=template.deps[i];
            if(ret.src['/'+templateName].ext=='.tpl'){
                //如果该文件是tpl文件，则要替换组件名称为组件的html
                ret.src['/'+templateName]._content=ret.src['/'+templateName]._content.replace(componentsReg(component),getFilesContents(map.components[component].html||[]));
            }else if(ret.src['/'+templateName].rExt=='.css'){
                //如果该文件渲染后缀是css文件，则要替换组件名称为组件的css
                ret.src['/'+templateName]._content=ret.src['/'+templateName]._content.replace(componentsReg(component),getFilesContents(map.components[component].css||[]));
            }

        }
        if(ret.src['/'+templateName].ext=='.tpl'){
            //只替换后缀是.tpl文件的__COMPONENTS_CSS__、__COMPONENTS_JS__、__COMPONENTS_INIT__、__COMPONENTS_ALIAS__为各自的引用和代码
            ret.src['/'+templateName]._content=ret.src['/'+templateName]._content.replace(/__COMPONENTS_CSS__/g,'<link rel="stylesheet" type="text/css" href="'+template.pkg.css.path+'"/>');
            ret.src['/'+templateName]._content=ret.src['/'+templateName]._content.replace(/__COMPONENTS_JS__/g,'<script type="text/javascript" src="'+template.pkg.js.path+'"></script>');
            if(template.mainJs){
                if(template.mainJs!='self'){
                    ret.src[template.mainJs]._content=ret.src[template.mainJs]._content.replace(/__COMPONENTS_INIT__/g,getFilesContents(template.init));
                    ret.src[template.mainJs]._content=ret.src[template.mainJs]._content.replace(/__COMPONENTS_ALIAS__/g,stringObj(map.alias));
                }else{
                    ret.src['/'+templateName]._content=ret.src[template.mainJs]._content.replace(/__COMPONENTS_INIT__/g,getFilesContents(template.init));
                    ret.src['/'+templateName]._content=ret.src[template.mainJs]._content.replace(/__COMPONENTS_ALIAS__/g,stringObj(map.alias));
                }
            }else{
                console.log('请设置该模板的mainJS，在入口script标签里加入data-main="true"属性即可！');
            }

        }

    }

    function componentsReg(name){
        switch (name){
            case '**':
                name='(.)*';
                break;
        }
        return new RegExp('<!--component\\(("|\')('+name+')("|\')\\)-->','g');
    }
    function delUseless(arr){
        //去掉数组中的非组件名字的元素，并且去掉重复
        var arr=arr.distinct(),
            array=[];

        for(var i=0;i<arr.length;i++){
            var component=arr[i];
            if(map.componentsAlias[component]){
                array.push(component);
            }
        }
        return array;
    }

    function findDeps(name){
        //根据组件标识符去deps表里寻找该组件的所有依赖，返回一个依赖数组
        /*
        *  "deps": {
             "menu/menu.html": [
             "menu/menu.js",
             "menu/menu.css"
             ],
             "menu/menu.init.js": [
             "menu"
             ],
             "menu/menu.js": [
             "jquery@1.10.2",
             "menu/menu.css"
             ],
             "reg/reg.html": [
             "reg/reg.js",
             "reg/reg.css"
             ],
             "reg/reg.init.js": [
             "reg"
             ],
             "reg/reg.js": [
             "jquery@1.10.2",
             "register@1.0.0",
             "reg/reg.css"
             ],
             "menu1/0.0.1/menu1.html": [
             "menu1/0.0.1/menu1.js",
             "menu1/0.0.1/menu1.css"
             ],
             "menu1/0.0.1/menu1.init.js": [
             "menu1"
             ],
             "menu1/0.0.1/menu1.js": [
             "jquery@1.10.2",
             "menu1/0.0.1/menu1.css"
             ],
             "menu1/0.0.2/menu1.html": [
             "menu1/0.0.2/menu1.js",
             "menu1/0.0.2/menu1.css"
             ],
             "menu1/0.0.2/menu1.init.js": [
             "menu1"
             ],
             "menu1/0.0.2/menu1.js": [
             "jquery@1.10.2",
             "menu1/0.0.2/menu1.css"
             ],
             "menu2/0.0.1/menu2.html": [
             "menu2/0.0.1/menu2.css"
             ],
             "register/1.0.0/register.js": [
             "jquery@1.10.2"
             ]
         },
        * */
        var deps=[];
        var realName=map.alias[name];

        if(map.deps[realName]){
//            for(var j=0;j<map.deps[realName].length;j++){
//                if(map.alias[map.deps[realName][j]]){
//                    deps.push(map.deps[realName][j]);
//                }
//            }
            deps=deps.concat(map.deps[realName]);
            for(var i=0;i<deps.length;i++){
                var depName=deps[i];
                if(map.alias[depName]){
                    deps=deps.concat(findDeps(map.alias[depName]));
                }else{
                    console.log('can\'t find '+depName+' \' alias!');
                }
            }
        }else{
            return deps;
        }

        return deps;
    }
    function wrapStrHtmlLabel(str,type){
        //根据type给str加上html调用标签，返回加完标签后的str
        if(type=='css'){
            return '<style type="text/css">\r\n'+str+'\r\n</style>';
        }else if(type=='js'){
            return '<script type="text/javascript">\r\n'+str+'\r\n</script>';
        }
        return false;
    }
    function getTypeRequire(requireArray,type){
        //根据type取出依赖路径数组的该类型的uri，并返回该类型uri数组
        var typeRequireUris=[],
            typeReg=new RegExp(type,'g');
        for(var i=0;i<requireArray.length;i++){
            var requireUri=requireArray[i];
            if(typeReg.test(requireUri)){
                typeRequireUris.push(requireUri);
            }
        }
        return typeRequireUris;
    }
    function getFilesContents(uriArray,compileArray){
        //返回该路径数组的所有内容字符串

        if(typeof uriArray == 'string'){
            uriArray=[uriArray];
        }

        var str='',
            compiledStr='';
        for(var i=0;i<uriArray.length;i++){
            var uri=uriArray[i];
            if(ret.ids[uri]){
                if(compileArray){
                    if(typeof compileArray == 'function'){
                        compileArray=[compileArray];
                    }
                    for(var j=0;j<compileArray.length;j++){
                        var compile=compileArray[j];
                        compiledStr=compile(ret.ids[uri]._content,uri);
                    }
                    str+=compiledStr+'\r\n';
                }else{
                    str+=ret.ids[uri]._content+'\r\n';
                }

            }else{
                console.log('can\'t find :'+uri+' object in ret.ids!');
            }

        }

        return str;
    }
    function translateCssRelativePathToAbsolute(content,uri){
        //var absolutePath=uri.replace(//g,'');
        var uriObj=parsePath(uri);
        //console.log('content:'+content);
        return content.replace(/\.\//g,fis.config.get('release')+'c/'+uriObj.dir);
    }
    function parsePath(path){
        var path=normalizePath(path),
            pathArr=path.split('/'),
            pathObj={dir:'',fileName:'',extName:''};

        for(var i= 0,L=pathArr.length;i<L;i++){
            if(i<L-1){
                pathObj.dir+=pathArr[i]+'/';
            }else{
                pathObj.fileName=pathArr[i].split('.')[0];
                pathObj.extName=pathArr[i].split('.')[1];
            }
        }
        function normalizePath(path){
            return path.replace(/\\/g,'/');
        }
        return pathObj;
    }

    //获取依赖数组，根据文件类型分成css和js，然后根据引用模板名进行分别打包，把css包插入到__COMPONENT_CSS__，把js包插入到__COMPONENT_JS__

//    fs.writeFile(fis.project.getProjectPath()+'/test/files.txt', fileStr, function (err) {
//        console.log('fileStr导出成功！');
//    });
//    fs.writeFile(fis.project.getProjectPath()+'/test/retStr.txt', retStr, function (err) {
//        console.log('retStr导出成功！');
//    });
//    fs.writeFile(fis.project.getProjectPath()+'/test/confStr.txt', confStr, function (err) {
//        console.log('confStr导出成功！');
//    });
//    fs.writeFile(fis.project.getProjectPath()+'/test/settingsStr.txt', settingsStr, function (err) {
//        console.log('settingsStr导出成功！');
//    });
//    fs.writeFile('D:/senro/senro/git/company/snailfwd-site/test/optStr.txt', optStr, function (err) {
//        console.log('optStr导出成功！');
//    });
};
//在modules.postpackager阶段处理依赖树，调用插件函数
fis.config.set('modules.postpackager', [bulidSnailfwd]);

