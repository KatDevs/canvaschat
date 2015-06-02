module.exports = {
	convertBase64ToBlob: function(dataURL){
			var base64Data = dataURL.substr(dataURL.indexOf(',')+ 1 , dataURL.length)
			// convert base64 to raw binary data held in a string
    		// doesn't handle URLEncoded DataURIs
    		// console.log(base64Data);
    		var byteString = window.atob(base64Data);

    		// separate out the mime component


		    // write the bytes of the string to an ArrayBuffer
		    //var ab = new ArrayBuffer(byteString.length);
		    var ia = new Uint8Array(byteString.length);
		    for (var i = 0; i < byteString.length; i++) {
		        ia[i] = byteString.charCodeAt(i);
		    }

		    // write the ArrayBuffer to a blob, and you're done
		    var blob = new Blob([ia], { type: 'image/png' });
		    return blob;
	},

	getFormData: function(blob, token, message) {
		var fd = new FormData();			
		fd.append("source", blob);
		fd.append("access_token", token);
		fd.append("message",message);
		return fd;
	}
}