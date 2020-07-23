/**
 * skylark-security-codec - The codec features enhancement for skylark utils.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx-ns");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-security-codec/codec',[
    "skylark-langx/skylark",
    "skylark-langx/langx"
], function(skylark, langx) {

	return skylark.attach("security.codec",{});
});
define('skylark-security-codec/base64',[
    "skylark-langx/langx",
    "./codec"
], function(langx,codec) {

    var base64 = function() {
        return base64;
    }

	var p="=";

	var codetab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

	base64.encode=function(/* byte[] */ba){
		// summary:
		//		Encode an array of bytes as a base64-encoded string
		var s=[], l=ba.length;
		var rm=l%3;
		var x=l-rm;
		for (var i=0; i<x;){
			var t=ba[i++]<<16|ba[i++]<<8|ba[i++];
			s.push(codetab.charAt((t>>>18)&0x3f));
			s.push(codetab.charAt((t>>>12)&0x3f));
			s.push(codetab.charAt((t>>>6)&0x3f));
			s.push(codetab.charAt(t&0x3f));
		}
		//	deal with trailers, based on patch from Peter Wood.
		switch(rm){
			case 2:{
				var t=ba[i++]<<16|ba[i++]<<8;
				s.push(codetab.charAt((t>>>18)&0x3f));
				s.push(codetab.charAt((t>>>12)&0x3f));
				s.push(codetab.charAt((t>>>6)&0x3f));
				s.push(p);
				break;
			}
			case 1:{
				var t=ba[i++]<<16;
				s.push(codetab.charAt((t>>>18)&0x3f));
				s.push(codetab.charAt((t>>>12)&0x3f));
				s.push(p);
				s.push(p);
				break;
			}
		}
		return s.join("");	//	string
	};

	base64.decode=function(/* string */str){
		// summary:
		//		Convert a base64-encoded string to an array of bytes
		var s=str.split(""), out=[];
		var l=s.length;
		while(s[--l]==p){ }	//	strip off trailing padding
		for (var i=0; i<l;){
			var t=codetab.indexOf(s[i++])<<18;
			if(i<=l){ t|=codetab.indexOf(s[i++])<<12 };
			if(i<=l){ t|=codetab.indexOf(s[i++])<<6 };
			if(i<=l){ t|=codetab.indexOf(s[i++]) };
			out.push((t>>>16)&0xff);
			out.push((t>>>8)&0xff);
			out.push(t&0xff);
		}
		//	strip off any null bytes
		while(out[out.length-1]==0){ out.pop(); }
		return out;	//	byte[]
	};


	/**
	 * Check if some data is encoded as base64.
	 *
	 * This is a fast test that picks some random position in the string to check if they are valid base64 characters.
	 *
	 * @method isBase64
	 * @param {Object} data Data to be tested.
	 * @return {Boolean} True if data is base64 encoded, false otherwise.
	 */
	base64.isBase64 = function(data) {
		if(typeof data !== "string") {
			return false;
		}

		//Check if it has a base64 header
		if(data.startsWith("data:")){
			return true;
		}

		//Check string data
		for(var i = 0; i < data.length; i++) {
			if(!codetab.includes(data.charAt(i)))
			{
				return false;
			}
		}

		return true;
	};

	/**
	 * Remove base64 header from data.
	 * 
	 * Usefull for removing the heander from image, audio, video, etc.
	 *
	 * @method removeHeader
	 * @param {String} base64
	 * @return {String} base64
	 */
	base64.removeHeader = function(data) {
		return data.slice(data.search(";base64,") + 8);
	};

	/**
	 * Get the file format present in the base64 string.
	 *
	 * @method getFileFormat
	 * @param  {String} data Base64 data.
	 * @return {String} File format present in the JSON data.
	 */
	base64.getFileFormat = function(data) 	{
		var start = data.indexOf("/") + 1;
		var end = data.indexOf(";");
		
		return data.substr(start, end - start);
	};

	/**
	 * Create base64 string from arraybuffer.
	 *
	 * @method fromArraybuffer
	 * @param {Arraybuffer} arraybuffer
	 * @return {String} base64
	 */
	base64.fromArraybuffer = function(arraybuffer) {
		var bstr = "";

		var view = new Uint8Array(arraybuffer);
		var remainder = view.byteLength % 3;
		var length = view.byteLength - remainder;

		var a, b, c, d;
		var chunk;

		//Chunks of 3 bytes for cycle
		for(var i = 0; i < length; i += 3)
		{
			chunk = (view[i] << 16) | (view[i + 1] << 8) | view[i + 2];

			a = (chunk & 16515072) >> 18;
			b = (chunk & 258048) >> 12;
			c = (chunk & 4032) >> 6;
			d = chunk & 63;

			bstr += codetab[a] + codetab[b] + codetab[c] + codetab[d]
		}

		//Remaining bytes
		if(remainder === 1)
		{
			chunk = view[length];

			a = (chunk & 252) >> 2;
			b = (chunk & 3) << 4;

			bstr += codetab[a] + codetab[b] + "==";
		}
		else if(remainder === 2)
		{
			chunk = (view[length] << 8) | view[length + 1];

			a = (chunk & 64512) >> 10;
			b = (chunk & 1008) >> 4;
			c = (chunk & 15) << 2;

			bstr += codetab[a] + codetab[b] + codetab[c] + "=";
		}

		return bstr;
	};

	/**
	 * Create base64 string from binary string.
	 *
	 * @method fromBinaryString
	 * @param {String} str
	 * @return {String} base64
	 */
	base64.fromBinaryString = function(str) {
		var bstr = "";
		var remainder = str.length % 3;
		var length = str.length - remainder;

		var a, b, c;

		for(var i = 0; i < length; i += 3)
		{
			a = str.charCodeAt(i) & 0xff;
			b = str.charCodeAt(i + 1);
			c = str.charCodeAt(i + 2);

			bstr += codetab.charAt(a >> 2);
			bstr += codetab.charAt(((a & 0x3) << 4) | ((b & 0xF0) >> 4));
			bstr += codetab.charAt(((b & 0xF) << 2) | ((c & 0xC0) >> 6));
			bstr += codetab.charAt(c & 0x3F);
		}
		
		if(remainder === 1)
		{
			a = str.charCodeAt(i) & 0xff;

			bstr += codetab.charAt(a >> 2);
			bstr += codetab.charAt((a & 0x3) << 4);
			bstr += "==";
		}
		else if(remainder === 2)
		{
			a = str.charCodeAt(i) & 0xff;
			b = str.charCodeAt(i + 1);

			bstr += codetab.charAt(a >> 2);
			bstr += codetab.charAt(((a & 0x3) << 4) | ((b & 0xF0) >> 4));
			bstr += codetab.charAt((b & 0xF) << 2);
			bstr += "=";
		}

		return bstr;
	};

    return codec.base64 = base64;
});

define('skylark-security-codec/main',[
    "./codec",
    "./base64"
], function(codec) {

	return codec;
});
define('skylark-security-codec', ['skylark-security-codec/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-security-codec.js.map
