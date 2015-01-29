
var $=require('jquery@1.10.2');
var register=require('register@1.0.0');


module.exports=function(){
	console.log('reg need :'+register.name+'!');
	console.log('register config version :'+register.config.version+'!');
	if(typeof $ =='object'){
		console.log('jquery already!');
	}
    
};