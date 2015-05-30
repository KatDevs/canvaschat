// config/auth.js

// NOTE: Since this file is cheked into public repository removing all the keys from config
module.exports = {
	development:{
	    'facebook' : {
            'consumerKey': '846767545359932',
            'consumerSecret': 'ff7e28149a5dcde3ca0b6dc4fa40ae47',
            'callbackUrl': 'http://socialauthenticator.com:8000/auth/facebook/callback'                                   
        }	
	}
}