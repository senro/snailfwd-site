require.config({
	 alias:
	  {
    "menu": "components/menu/menu.js",
    "reg": "components/reg/reg.js",
    "arale-cookie@1.1.0": "spm_modules/arale-cookie/1.1.0/index.js",
    "jquery@1.10.2": "spm_modules/jquery/1.10.2/jquery.js",
    "menu1@0.0.1": "spm_modules/menu1/0.0.1/menu1.js",
    "menu1@0.0.2": "spm_modules/menu1/0.0.2/menu1.js",
    "register@1.0.0": "spm_modules/register/1.0.0/register.js"
} 
});
var menu1=require('menu1@0.0.1');

console.log(menu1.name);




var reg=require('reg');
reg();


var cookie=require('arale-cookie@1.1.0');
cookie.set('a','8888888888888888888');
console.log(cookie.get('a'));