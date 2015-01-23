var $=require('jquery@1.10.2');
var menuItemLength=$('.menu').find('a').length;

module.exports=function(){
   return { length: menuItemLength, name:'menu' };
};


