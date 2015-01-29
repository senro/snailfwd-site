require.config({
	 alias:
	  __COMPONENTS_ALIAS__ 
});
__COMPONENTS_INIT__
var cookie=require('arale-cookie@1.1.0');
cookie.set('a','8888888888888888888');
console.log(cookie.get('a'));