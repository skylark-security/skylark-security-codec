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
    var skylarkjs = require("skylark-langx/skylark");

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
	var tab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

	base64.encode=function(/* byte[] */ba){
		// summary:
		//		Encode an array of bytes as a base64-encoded string
		var s=[], l=ba.length;
		var rm=l%3;
		var x=l-rm;
		for (var i=0; i<x;){
			var t=ba[i++]<<16|ba[i++]<<8|ba[i++];
			s.push(tab.charAt((t>>>18)&0x3f));
			s.push(tab.charAt((t>>>12)&0x3f));
			s.push(tab.charAt((t>>>6)&0x3f));
			s.push(tab.charAt(t&0x3f));
		}
		//	deal with trailers, based on patch from Peter Wood.
		switch(rm){
			case 2:{
				var t=ba[i++]<<16|ba[i++]<<8;
				s.push(tab.charAt((t>>>18)&0x3f));
				s.push(tab.charAt((t>>>12)&0x3f));
				s.push(tab.charAt((t>>>6)&0x3f));
				s.push(p);
				break;
			}
			case 1:{
				var t=ba[i++]<<16;
				s.push(tab.charAt((t>>>18)&0x3f));
				s.push(tab.charAt((t>>>12)&0x3f));
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
			var t=tab.indexOf(s[i++])<<18;
			if(i<=l){ t|=tab.indexOf(s[i++])<<12 };
			if(i<=l){ t|=tab.indexOf(s[i++])<<6 };
			if(i<=l){ t|=tab.indexOf(s[i++]) };
			out.push((t>>>16)&0xff);
			out.push((t>>>8)&0xff);
			out.push(t&0xff);
		}
		//	strip off any null bytes
		while(out[out.length-1]==0){ out.pop(); }
		return out;	//	byte[]
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
