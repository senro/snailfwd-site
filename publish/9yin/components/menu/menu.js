define('components/menu/menu.js', function(require, exports, module){ 
var $=require('jquery@1.10.2');
var menuItemLength=$('.menu').find('a').length;

module.exports={ length: menuItemLength, name:'menu' };


 
});