require.config({
	alias:
	{
    "menu": "menu/menu.js",
    "reg": "reg/reg.js",
    "jquery@1.10.2": "jquery/1.10.2/jquery.js",
    "menu1@0.0.1": "menu1/0.0.1/menu1.js",
    "menu1@0.0.2": "menu1/0.0.2/menu1.js",
    "register@1.0.0": "register/1.0.0/register.js"
} 
});
var menu=require('menu');
var menu1=require('menu1@0.0.1');
console.log('menu name:'+menu.name);
console.log('menu length:'+menu.length);
console.log('menu1 name:'+menu1.name);



var reg=require('reg');
reg();


