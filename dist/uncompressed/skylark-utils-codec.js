/**
 * skylark-utils-codec - The codec features enhancement for skylark utils.
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
                exports: null
            };
            require(id);
        } else {
            map[id] = factory;
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.exports) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args);
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

define('skylark-utils-codec/codec',[
    "skylark-langx/skylark",
    "skylark-langx/langx"
], function(skylark, langx) {
	var codec = skylark.codec = {

	};

	return codec;
});
define('skylark-utils-codec/base64',[
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

define('skylark-utils-codec/jbig2',[
  "skylark-langx/langx",
  "skylark-utils-stream/DecodeStream",
  "./codec"
],function(langx,DecodeStream,codec){
  'use strict';

   //The module code is based from mozilla/pdf.js/
   // original : https://github.com/mozilla/pdf.js/blob/master/src/core/jbig2.js
   // license  : Apache 2

  // Annex E. Arithmetic Coding

    var QeTable = [
      {qe: 0x5601, nmps: 1, nlps: 1, switchFlag: 1},
      {qe: 0x3401, nmps: 2, nlps: 6, switchFlag: 0},
      {qe: 0x1801, nmps: 3, nlps: 9, switchFlag: 0},
      {qe: 0x0AC1, nmps: 4, nlps: 12, switchFlag: 0},
      {qe: 0x0521, nmps: 5, nlps: 29, switchFlag: 0},
      {qe: 0x0221, nmps: 38, nlps: 33, switchFlag: 0},
      {qe: 0x5601, nmps: 7, nlps: 6, switchFlag: 1},
      {qe: 0x5401, nmps: 8, nlps: 14, switchFlag: 0},
      {qe: 0x4801, nmps: 9, nlps: 14, switchFlag: 0},
      {qe: 0x3801, nmps: 10, nlps: 14, switchFlag: 0},
      {qe: 0x3001, nmps: 11, nlps: 17, switchFlag: 0},
      {qe: 0x2401, nmps: 12, nlps: 18, switchFlag: 0},
      {qe: 0x1C01, nmps: 13, nlps: 20, switchFlag: 0},
      {qe: 0x1601, nmps: 29, nlps: 21, switchFlag: 0},
      {qe: 0x5601, nmps: 15, nlps: 14, switchFlag: 1},
      {qe: 0x5401, nmps: 16, nlps: 14, switchFlag: 0},
      {qe: 0x5101, nmps: 17, nlps: 15, switchFlag: 0},
      {qe: 0x4801, nmps: 18, nlps: 16, switchFlag: 0},
      {qe: 0x3801, nmps: 19, nlps: 17, switchFlag: 0},
      {qe: 0x3401, nmps: 20, nlps: 18, switchFlag: 0},
      {qe: 0x3001, nmps: 21, nlps: 19, switchFlag: 0},
      {qe: 0x2801, nmps: 22, nlps: 19, switchFlag: 0},
      {qe: 0x2401, nmps: 23, nlps: 20, switchFlag: 0},
      {qe: 0x2201, nmps: 24, nlps: 21, switchFlag: 0},
      {qe: 0x1C01, nmps: 25, nlps: 22, switchFlag: 0},
      {qe: 0x1801, nmps: 26, nlps: 23, switchFlag: 0},
      {qe: 0x1601, nmps: 27, nlps: 24, switchFlag: 0},
      {qe: 0x1401, nmps: 28, nlps: 25, switchFlag: 0},
      {qe: 0x1201, nmps: 29, nlps: 26, switchFlag: 0},
      {qe: 0x1101, nmps: 30, nlps: 27, switchFlag: 0},
      {qe: 0x0AC1, nmps: 31, nlps: 28, switchFlag: 0},
      {qe: 0x09C1, nmps: 32, nlps: 29, switchFlag: 0},
      {qe: 0x08A1, nmps: 33, nlps: 30, switchFlag: 0},
      {qe: 0x0521, nmps: 34, nlps: 31, switchFlag: 0},
      {qe: 0x0441, nmps: 35, nlps: 32, switchFlag: 0},
      {qe: 0x02A1, nmps: 36, nlps: 33, switchFlag: 0},
      {qe: 0x0221, nmps: 37, nlps: 34, switchFlag: 0},
      {qe: 0x0141, nmps: 38, nlps: 35, switchFlag: 0},
      {qe: 0x0111, nmps: 39, nlps: 36, switchFlag: 0},
      {qe: 0x0085, nmps: 40, nlps: 37, switchFlag: 0},
      {qe: 0x0049, nmps: 41, nlps: 38, switchFlag: 0},
      {qe: 0x0025, nmps: 42, nlps: 39, switchFlag: 0},
      {qe: 0x0015, nmps: 43, nlps: 40, switchFlag: 0},
      {qe: 0x0009, nmps: 44, nlps: 41, switchFlag: 0},
      {qe: 0x0005, nmps: 45, nlps: 42, switchFlag: 0},
      {qe: 0x0001, nmps: 45, nlps: 43, switchFlag: 0},
      {qe: 0x5601, nmps: 46, nlps: 46, switchFlag: 0}
    ];

  var ArithmeticDecoder = langx.klass({
      "klassName" : "ArithmeticDecoder",

      byteIn: function ArithmeticDecoder_byteIn() {
        var data = this.data;
        var bp = this.bp;
        if (data[bp] == 0xFF) {
          var b1 = data[bp + 1];
          if (b1 > 0x8F) {
            this.clow += 0xFF00;
            this.ct = 8;
          } else {
            bp++;
            this.clow += (data[bp] << 9);
            this.ct = 7;
            this.bp = bp;
          }
        } else {
          bp++;
          this.clow += bp < this.dataEnd ? (data[bp] << 8) : 0xFF00;
          this.ct = 8;
          this.bp = bp;
        }
        if (this.clow > 0xFFFF) {
          this.chigh += (this.clow >> 16);
          this.clow &= 0xFFFF;
        }
      },
      readBit: function ArithmeticDecoder_readBit(contexts, pos) {
        // contexts are packed into 1 byte: 
        // highest 7 bits carry cx.index, lowest bit carries cx.mps
        var cx_index = contexts[pos] >> 1, cx_mps = contexts[pos] & 1;
        var qeTableIcx = QeTable[cx_index];
        var qeIcx = qeTableIcx.qe;
        var nmpsIcx = qeTableIcx.nmps;
        var nlpsIcx = qeTableIcx.nlps;
        var switchIcx = qeTableIcx.switchFlag;
        var d;
        this.a -= qeIcx;

        if (this.chigh < qeIcx) {
          // exchangeLps
          if (this.a < qeIcx) {
            this.a = qeIcx;
            d = cx_mps;
            cx_index = nmpsIcx;
          } else {
            this.a = qeIcx;
            d = 1 - cx_mps;
            if (switchIcx) {
              cx_mps = d;
            }
            cx_index = nlpsIcx;
          }
        } else {
          this.chigh -= qeIcx;
          if ((this.a & 0x8000) !== 0) {
            return cx_mps;
          }
          // exchangeMps
          if (this.a < qeIcx) {
            d = 1 - cx_mps;
            if (switchIcx) {
              cx_mps = d;
            }
            cx_index = nlpsIcx;
          } else {
            d = cx_mps;
            cx_index = nmpsIcx;
          }
        }
        // renormD;
        do {
          if (this.ct === 0)
            this.byteIn();

          this.a <<= 1;
          this.chigh = ((this.chigh << 1) & 0xFFFF) | ((this.clow >> 15) & 1);
          this.clow = (this.clow << 1) & 0xFFFF;
          this.ct--;
        } while ((this.a & 0x8000) === 0);

        contexts[pos] = cx_index << 1 | cx_mps;
        return d;
      },
  
      "init" : function (data, start, end) {
        this.data = data;
        this.bp = start;
        this.dataEnd = end;

        this.chigh = data[start];
        this.clow = 0;

        this.byteIn();

        this.chigh = ((this.chigh << 7) & 0xFFFF) | ((this.clow >> 9) & 0x7F);
        this.clow = (this.clow << 7) & 0xFFFF;
        this.ct -= 7;
        this.a = 0x8000;
    }

  });


   // Utility data structures
  var ContextCache = langx.klass({
    getContexts: function(id) {
      if (id in this)
        return this[id];
      return (this[id] = new Int8Array(1<<16));
    }
  });

  var DecodingContext = langx.klass({
    "decoder" : {
      get : function() {
        var decoder = new ArithmeticDecoder(this.data, this.start, this.end);
        return shadow(this, 'decoder', decoder);
      }
    },
    "contextCache" : {
      get : function() {
        var cache = new ContextCache();
        return shadow(this, 'contextCache', cache);
      }
    },
    "init" : function (data, start, end) {
      this.data = data;
      this.start = start;
      this.end = end;
    }


  });

  // Annex A. Arithmetic Integer Decoding Procedure
  // A.2 Procedure for decoding values
  function decodeInteger(contextCache, procedure, decoder) {
    var contexts = contextCache.getContexts(procedure);

    var prev = 1;
    var state = 1, v = 0, s;
    var toRead = 32, offset = 4436; // defaults for state 7
    while (state) {
      var bit = decoder.readBit(contexts, prev);
      prev = prev < 256 ? (prev << 1) | bit :
        (((prev << 1) | bit) & 511) | 256;
      switch (state) {
        case 1:
          s = !!bit;
          break;
        case 2:
          if (bit) break;
          state = 7;
          toRead = 2;
          offset = 0;
          break;
        case 3:
          if (bit) break;
          state = 7;
          toRead = 4;
          offset = 4;
          break;
        case 4:
          if (bit) break;
          state = 7;
          toRead = 6;
          offset = 20;
          break;
        case 5:
          if (bit) break;
          state = 7;
          toRead = 8;
          offset = 84;
          break;
        case 6:
          if (bit) break;
          state = 7;
          toRead = 12;
          offset = 340;
          break;
        default:
          v = v * 2 + bit;
          if (--toRead === 0)
            state = 0;
          continue;
      }
      state++;
    }
    v += offset;
    return !s ? v : v > 0 ? -v : null;
  }

  // A.3 The IAID decoding procedure
  function decodeIAID(contextCache, decoder, codeLength) {
    var contexts = contextCache.getContexts('IAID');

    var prev = 1;
    for (var i = 0; i < codeLength; i++) {
      var bit = decoder.readBit(contexts, prev);
      prev = (prev * 2) + bit;
    }
    if (codeLength < 31)
      return prev & ((1 << codeLength) - 1);
    else
      return prev - Math.pow(2, codeLength);
  }

  // 7.3 Segment types
  var SegmentTypes = [
    'SymbolDictionary', null, null, null, 'IntermediateTextRegion', null,
    'ImmediateTextRegion', 'ImmediateLosslessTextRegion', null, null, null,
    null, null, null, null, null, 'patternDictionary', null, null, null,
    'IntermediateHalftoneRegion', null, 'ImmediateHalftoneRegion',
    'ImmediateLosslessHalftoneRegion', null, null, null, null, null, null, null,
    null, null, null, null, null, 'IntermediateGenericRegion', null,
    'ImmediateGenericRegion', 'ImmediateLosslessGenericRegion',
    'IntermediateGenericRefinementRegion', null,
    'ImmediateGenericRefinementRegion',
    'ImmediateLosslessGenericRefinementRegion', null, null, null, null,
    'PageInformation', 'EndOfPage', 'EndOfStripe', 'EndOfFile', 'Profiles',
    'Tables', null, null, null, null, null, null, null, null,
    'Extension'
  ];

  var CodingTemplates = [
    [{x: -1, y: -2}, {x: 0, y: -2}, {x: 1, y: -2}, {x: -2, y: -1},
     {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}, {x: 2, y: -1},
     {x: -4, y: 0}, {x: -3, y: 0}, {x: -2, y: 0}, {x: -1, y: 0}],
    [{x: -1, y: -2}, {x: 0, y: -2}, {x: 1, y: -2}, {x: 2, y: -2},
     {x: -2, y: -1}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1},
     {x: 2, y: -1}, {x: -3, y: 0}, {x: -2, y: 0}, {x: -1, y: 0}],
    [{x: -1, y: -2}, {x: 0, y: -2}, {x: 1, y: -2}, {x: -2, y: -1},
     {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}, {x: -2, y: 0},
     {x: -1, y: 0}],
    [{x: -3, y: -1}, {x: -2, y: -1}, {x: -1, y: -1}, {x: 0, y: -1},
     {x: 1, y: -1}, {x: -4, y: 0}, {x: -3, y: 0}, {x: -2, y: 0}, {x: -1, y: 0}]
  ];

  var RefinementTemplates = [
    {
      coding: [{x: 0, y: -1}, {x: 1, y: -1}, {x: -1, y: 0}],
      reference: [{x: 0, y: -1}, {x: 1, y: -1}, {x: -1, y: 0}, {x: 0, y: 0},
                  {x: 1, y: 0}, {x: -1, y: 1}, {x: 0, y: 1}, {x: 1, y: 1}]
    },
    {
      coding: [{x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}, {x: -1, y: 0}],
      reference: [{x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0},
                  {x: 0, y: 1}, {x: 1, y: 1}]
    }
  ];

  var ReusedContexts = [
    0x1CD3, // '00111001101' (template) + '0011' (at),
    0x079A, // '001111001101' + '0',
    0x00E3, // '001110001' + '1',
    0x018B  // '011000101' + '1'
  ];

  var RefinementReusedContexts = [
    0x0020, // '000' + '0' (coding) + '00010000' + '0' (reference)
    0x0008  // '0000' + '001000'
  ];

  function log2(x) {
    var n = 1, i = 0;
    while (x > n) {
      n <<= 1;
      i++;
    }
    return i;
  }

  function readInt32(data, start) {
    return (data[start] << 24) | (data[start + 1] << 16) |
           (data[start + 2] << 8) | data[start + 3];
  }

  function readUint32(data, start) {
    var value = readInt32(data, start);
    return value & 0x80000000 ? (value + 4294967296) : value;
  }

  function readUint16(data, start) {
    return (data[start] << 8) | data[start + 1];
  }

  function readInt8(data, start) {
    return (data[start] << 24) >> 24;
  }

  // 6.2 Generic Region Decoding Procedure
  function decodeBitmap(mmr, width, height, templateIndex, prediction, skip, at,
                        decodingContext) {
    if (mmr)
      error('JBIG2 error: MMR encoding is not supported');

    var useskip = !!skip;
    var template = CodingTemplates[templateIndex].concat(at);
    var templateLength = template.length;
    var templateX = new Int32Array(templateLength);
    var templateY = new Int32Array(templateLength);
    for (var k = 0; k < templateLength; k++) {
      templateX[k] = template[k].x;
      templateY[k] = template[k].y;
    }

    var pseudoPixelContext = ReusedContexts[templateIndex];
    var bitmap = [];

    var decoder = decodingContext.decoder;
    var contexts = decodingContext.contextCache.getContexts('GB');

    var ltp = 0;
    for (var i = 0; i < height; i++) {
      if (prediction) {
        var sltp = decoder.readBit(contexts, pseudoPixelContext);
        ltp ^= sltp;
      }
      if (ltp) {
        bitmap.push(bitmap[bitmap.length - 1]); // duplicate previous row
        continue;
      }
      var row = new Uint8Array(width);
      bitmap.push(row);
      for (var j = 0; j < width; j++) {
        if (useskip && skip[i][j]) {
          row[j] = 0;
          continue;
        }
        var contextLabel = 0;
        for (var k = 0; k < templateLength; k++) {
          var i0 = i + templateY[k], j0 = j + templateX[k];
          if (i0 < 0 || j0 < 0 || j0 >= width)
            contextLabel <<= 1; // out of bound pixel
          else
            contextLabel = (contextLabel << 1) | bitmap[i0][j0];
        }
        var pixel = decoder.readBit(contexts, contextLabel);
        row[j] = pixel;
      }
    }
    return bitmap;
  }

  // 6.3.2 Generic Refinement Region Decoding Procedure
  function decodeRefinement(width, height, templateIndex, referenceBitmap,
                            offsetX, offsetY, prediction, at,
                            decodingContext) {
    var codingTemplate = RefinementTemplates[templateIndex].coding;
    if (templateIndex === 0)
      codingTemplate = codingTemplate.concat([at[0]]);
    var codingTemplateLength = codingTemplate.length;
    var codingTemplateX = new Int32Array(codingTemplateLength);
    var codingTemplateY = new Int32Array(codingTemplateLength);
    for (var k = 0; k < codingTemplateLength; k++) {
      codingTemplateX[k] = codingTemplate[k].x;
      codingTemplateY[k] = codingTemplate[k].y;
    }
    var referenceTemplate = RefinementTemplates[templateIndex].reference;
    if (templateIndex === 0)
      referenceTemplate = referenceTemplate.concat([at[1]]);
    var referenceTemplateLength = referenceTemplate.length;
    var referenceTemplateX = new Int32Array(referenceTemplateLength);
    var referenceTemplateY = new Int32Array(referenceTemplateLength);
    for (var k = 0; k < referenceTemplateLength; k++) {
      referenceTemplateX[k] = referenceTemplate[k].x;
      referenceTemplateY[k] = referenceTemplate[k].y;
    }
    var referenceWidth = referenceBitmap[0].length;
    var referenceHeight = referenceBitmap.length;

    var pseudoPixelContext = RefinementReusedContexts[templateIndex];
    var bitmap = [];

    var decoder = decodingContext.decoder;
    var contexts = decodingContext.contextCache.getContexts('GR');

    var ltp = 0;
    for (var i = 0; i < height; i++) {
      if (prediction) {
        var sltp = decoder.readBit(contexts, pseudoPixelContext);
        ltp ^= sltp;
      }
      var row = new Uint8Array(width);
      bitmap.push(row);
      for (var j = 0; j < width; j++) {
        if (ltp)
          error('JBIG2 error: prediction is not supported');

        var contextLabel = 0;
        for (var k = 0; k < codingTemplateLength; k++) {
          var i0 = i + codingTemplateY[k], j0 = j + codingTemplateX[k];
          if (i0 < 0 || j0 < 0 || j0 >= width)
            contextLabel <<= 1; // out of bound pixel
          else
            contextLabel = (contextLabel << 1) | bitmap[i0][j0];
        }
        for (var k = 0; k < referenceTemplateLength; k++) {
          var i0 = i + referenceTemplateY[k] + offsetY;
          var j0 = j + referenceTemplateX[k] + offsetX;
          if (i0 < 0 || i0 >= referenceHeight || j0 < 0 || j0 >= referenceWidth)
            contextLabel <<= 1; // out of bound pixel
          else
            contextLabel = (contextLabel << 1) | referenceBitmap[i0][j0];
        }
        var pixel = decoder.readBit(contexts, contextLabel);
        row[j] = pixel;
      }
    }

    return bitmap;
  }

  // 6.5.5 Decoding the symbol dictionary
  function decodeSymbolDictionary(huffman, refinement, symbols,
                                  numberOfNewSymbols, numberOfExportedSymbols,
                                  huffmanTables, templateIndex, at,
                                  refinementTemplateIndex, refinementAt,
                                  decodingContext) {
    if (huffman)
      error('JBIG2 error: huffman is not supported');

    var newSymbols = [];
    var currentHeight = 0;
    var symbolCodeLength = log2(symbols.length + numberOfNewSymbols);

    var decoder = decodingContext.decoder;
    var contextCache = decodingContext.contextCache;

    while (newSymbols.length < numberOfNewSymbols) {
      var deltaHeight = decodeInteger(contextCache, 'IADH', decoder); // 6.5.6
      currentHeight += deltaHeight;
      var currentWidth = 0;
      var totalWidth = 0;
      while (true) {
        var deltaWidth = decodeInteger(contextCache, 'IADW', decoder); // 6.5.7
        if (deltaWidth === null)
          break; // OOB
        currentWidth += deltaWidth;
        totalWidth += currentWidth;
        var bitmap;
        if (refinement) {
          // 6.5.8.2 Refinement/aggregate-coded symbol bitmap
          var numberOfInstances = decodeInteger(contextCache, 'IAAI', decoder);
          if (numberOfInstances > 1)
            error('JBIG2 error: number of instances > 1 is not supported');
          var symbolId = decodeIAID(contextCache, decoder, symbolCodeLength);
          var rdx = decodeInteger(contextCache, 'IARDX', decoder); // 6.4.11.3
          var rdy = decodeInteger(contextCache, 'IARDY', decoder); // 6.4.11.4
          var symbol = symbolId < symbols.length ? symbols[symbolId] :
            newSymbols[symbolId - symbols.length];
          bitmap = decodeRefinement(currentWidth, currentHeight,
            refinementTemplateIndex, symbol, rdx, rdy, false, refinementAt,
            decodingContext);
        } else {
          // 6.5.8.1 Direct-coded symbol bitmap
          bitmap = decodeBitmap(false, currentWidth, currentHeight,
            templateIndex, false, null, at, decodingContext);
        }
        newSymbols.push(bitmap);
      }
    }
    // 6.5.10 Exported symbols
    var exportedSymbols = [];
    var flags = [], currentFlag = false;
    var totalSymbolsLength = symbols.length + numberOfNewSymbols;
    while (flags.length < totalSymbolsLength) {
      var runLength = decodeInteger(contextCache, 'IAEX', decoder);
      while (runLength--)
        flags.push(currentFlag);
      currentFlag = !currentFlag;
    }
    for (var i = 0, ii = symbols.length; i < ii; i++)
      if (flags[i]) exportedSymbols.push(symbols[i]);
    for (var j = 0; j < numberOfNewSymbols; i++, j++)
      if (flags[i]) exportedSymbols.push(newSymbols[j]);
    return exportedSymbols;
  }

  function decodeTextRegion(huffman, refinement, width, height,
                            defaultPixelValue, numberOfSymbolInstances,
                            stripSize, inputSymbols, symbolCodeLength,
                            transposed, dsOffset, referenceCorner,
                            combinationOperator, huffmanTables,
                            refinementTemplateIndex, refinementAt,
                            decodingContext) {
    if (huffman)
      error('JBIG2 error: huffman is not supported');

    // Prepare bitmap
    var bitmap = [];
    for (var i = 0; i < height; i++) {
      var row = new Uint8Array(width);
      if (defaultPixelValue) {
        for (var j = 0; j < width; j++)
          row[j] = defaultPixelValue;
      }
      bitmap.push(row);
    }

    var decoder = decodingContext.decoder;
    var contextCache = decodingContext.contextCache;
    var stripT = -decodeInteger(contextCache, 'IADT', decoder); // 6.4.6
    var firstS = 0;
    var i = 0;
    while (i < numberOfSymbolInstances) {
      var deltaT = decodeInteger(contextCache, 'IADT', decoder); // 6.4.6
      stripT += deltaT;

      var deltaFirstS = decodeInteger(contextCache, 'IAFS', decoder); // 6.4.7
      firstS += deltaFirstS;
      var currentS = firstS;
      do {
        var currentT = stripSize == 1 ? 0 :
          decodeInteger(contextCache, 'IAIT', decoder); // 6.4.9
        var t = stripSize * stripT + currentT;
        var symbolId = decodeIAID(contextCache, decoder, symbolCodeLength);
        var applyRefinement = refinement &&
          decodeInteger(contextCache, 'IARI', decoder);
        var symbolBitmap = inputSymbols[symbolId];
        var symbolWidth = symbolBitmap[0].length;
        var symbolHeight = symbolBitmap.length;
        if (applyRefinement) {
          var rdw = decodeInteger(contextCache, 'IARDW', decoder); // 6.4.11.1
          var rdh = decodeInteger(contextCache, 'IARDH', decoder); // 6.4.11.2
          var rdx = decodeInteger(contextCache, 'IARDX', decoder); // 6.4.11.3
          var rdy = decodeInteger(contextCache, 'IARDY', decoder); // 6.4.11.4
          symbolWidth += rdw;
          symbolHeight += rdh;
          symbolBitmap = decodeRefinement(symbolWidth, symbolHeight,
            refinementTemplateIndex, symbolBitmap, (rdw >> 1) + rdx,
            (rdh >> 1) + rdy, false, refinementAt,
            decodingContext);
        }
        var offsetT = t - ((referenceCorner & 1) ? 0 : symbolHeight);
        var offsetS = currentS - ((referenceCorner & 2) ? symbolWidth : 0);
        if (transposed) {
          // Place Symbol Bitmap from T1,S1  
          for (var s2 = 0; s2 < symbolHeight; s2++) {
            var row = bitmap[offsetS + s2];
            if (!row) {
              continue;
            }
            var symbolRow = symbolBitmap[s2];
            // To ignore Parts of Symbol bitmap which goes
            // outside bitmap region
            var maxWidth = Math.min(width - offsetT, symbolWidth);
            switch (combinationOperator) {
              case 0: // OR
                for (var t2 = 0; t2 < maxWidth; t2++) {
                  row[offsetT + t2] |= symbolRow[t2];
                }
                break;
              case 2: // XOR
                for (var t2 = 0; t2 < maxWidth; t2++) {
                  row[offsetT + t2] ^= symbolRow[t2];
                }
                break;
              default:
                error('JBIG2 error: operator ' + combinationOperator +
                      ' is not supported');
            }
          }
          currentS += symbolHeight - 1;
        } else {
          for (var t2 = 0; t2 < symbolHeight; t2++) {
            var row = bitmap[offsetT + t2];
            if (!row) {
              continue;
            }
            var symbolRow = symbolBitmap[t2];
            switch (combinationOperator) {
              case 0: // OR
                for (var s2 = 0; s2 < symbolWidth; s2++) {
                  row[offsetS + s2] |= symbolRow[s2];
                }
                break;
              case 2: // XOR
                for (var s2 = 0; s2 < symbolWidth; s2++) {
                  row[offsetS + s2] ^= symbolRow[s2];
                }
                break;
              default:
                error('JBIG2 error: operator ' + combinationOperator +
                      ' is not supported');
            }
          }
          currentS += symbolWidth - 1;
        }
        i++;
        var deltaS = decodeInteger(contextCache, 'IADS', decoder); // 6.4.8
        if (deltaS === null)
          break; // OOB
        currentS += deltaS + dsOffset;
      } while (true);
    }
    return bitmap;
  }

  function readSegmentHeader(data, start) {
    var segmentHeader = {};
    segmentHeader.number = readUint32(data, start);
    var flags = data[start + 4];
    var segmentType = flags & 0x3F;
    if (!SegmentTypes[segmentType])
      error('JBIG2 error: invalid segment type: ' + segmentType);
    segmentHeader.type = segmentType;
    segmentHeader.typeName = SegmentTypes[segmentType];
    segmentHeader.deferredNonRetain = !!(flags & 0x80);
    var pageAssociationFieldSize = !!(flags & 0x40);
    var referredFlags = data[start + 5];
    var referredToCount = (referredFlags >> 5) & 7;
    var retainBits = [referredFlags & 31];
    var position = start + 6;
    if (referredFlags == 7) {
      referredToCount = readInt32(data, position - 1) & 0x1FFFFFFF;
      position += 3;
      var bytes = (referredToCount + 7) >> 3;
      retainBits[0] = data[position++];
      while (--bytes > 0) {
        retainBits.push(data[position++]);
      }
    } else if (referredFlags == 5 || referredFlags == 6)
      error('JBIG2 error: invalid referred-to flags');
    segmentHeader.retainBits = retainBits;
    var referredToSegmentNumberSize = segmentHeader.number <= 256 ? 1 :
      segmentHeader.number <= 65536 ? 2 : 4;
    var referredTo = [];
    for (var i = 0; i < referredToCount; i++) {
      var number = referredToSegmentNumberSize == 1 ? data[position] :
        referredToSegmentNumberSize == 2 ? readUint16(data, position) :
        readUint32(data, position);
      referredTo.push(number);
      position += referredToSegmentNumberSize;
    }
    segmentHeader.referredTo = referredTo;
    if (!pageAssociationFieldSize)
      segmentHeader.pageAssociation = data[position++];
    else {
      segmentHeader.pageAssociation = readUint32(data, position);
      position += 4;
    }
    segmentHeader.length = readUint32(data, position);
    position += 4;
    if (segmentHeader.length == 0xFFFFFFFF) {
      // 7.2.7 Segment data length, unknown segment length
      if (segmentType === 38) { // ImmediateGenericRegion
        var genericRegionInfo = readRegionSegmentInformation(data, position);
        var genericRegionSegmentFlags = data[position +
          RegionSegmentInformationFieldLength];
        var genericRegionMmr = !!(genericRegionSegmentFlags & 1);
        // searching for the segment end
        var searchPatternLength = 6;
        var searchPattern = new Uint8Array(searchPatternLength);
        if (!genericRegionMmr) {
          searchPattern[0] = 0xFF;
          searchPattern[1] = 0xAC;
        }
        searchPattern[2] = (genericRegionInfo.height >>> 24) & 0xFF;
        searchPattern[3] = (genericRegionInfo.height >> 16) & 0xFF;
        searchPattern[4] = (genericRegionInfo.height >> 8) & 0xFF;
        searchPattern[5] = genericRegionInfo.height & 0xFF;
        for (var i = position, ii = data.length; i < ii; i++) {
          var j = 0;
          while (j < searchPatternLength && searchPattern[j] === data[i + j]) {
            j++;
          }
          if (j == searchPatternLength) {
            segmentHeader.length = i + searchPatternLength;
            break;
          }
        }
        if (segmentHeader.length == 0xFFFFFFFF) {
          error('JBIG2 error: segment end was not found');
        }
      } else {
        error('JBIG2 error: invalid unknown segment length');
      }
    }
    segmentHeader.headerEnd = position;
    return segmentHeader;
  }

  function readSegments(header, data, start, end) {
    var segments = [];
    var position = start;
    while (position < end) {
      var segmentHeader = readSegmentHeader(data, position);
      position = segmentHeader.headerEnd;
      var segment = {
        header: segmentHeader,
        data: data
      };
      if (!header.randomAccess) {
        segment.start = position;
        position += segmentHeader.length;
        segment.end = position;
      }
      segments.push(segment);
      if (segmentHeader.type == 51)
        break; // end of file is found
    }
    if (header.randomAccess) {
      for (var i = 0, ii = segments.length; i < ii; i++) {
        segments[i].start = position;
        position += segments[i].header.length;
        segments[i].end = position;
      }
    }
    return segments;
  }

  // 7.4.1 Region segment information field
  function readRegionSegmentInformation(data, start) {
    return {
      width: readUint32(data, start),
      height: readUint32(data, start + 4),
      x: readUint32(data, start + 8),
      y: readUint32(data, start + 12),
      combinationOperator: data[start + 16] & 7
    };
  }
  var RegionSegmentInformationFieldLength = 17;

  function processSegment(segment, visitor) {
    var header = segment.header;

    var data = segment.data, position = segment.start, end = segment.end;
    var args;
    switch (header.type) {
      case 0: // SymbolDictionary
        // 7.4.2 Symbol dictionary segment syntax
        var dictionary = {};
        var dictionaryFlags = readUint16(data, position); // 7.4.2.1.1
        dictionary.huffman = !!(dictionaryFlags & 1);
        dictionary.refinement = !!(dictionaryFlags & 2);
        dictionary.huffmanDHSelector = (dictionaryFlags >> 2) & 3;
        dictionary.huffmanDWSelector = (dictionaryFlags >> 4) & 3;
        dictionary.bitmapSizeSelector = (dictionaryFlags >> 6) & 1;
        dictionary.aggregationInstancesSelector = (dictionaryFlags >> 7) & 1;
        dictionary.bitmapCodingContextUsed = !!(dictionaryFlags & 256);
        dictionary.bitmapCodingContextRetained = !!(dictionaryFlags & 512);
        dictionary.template = (dictionaryFlags >> 10) & 3;
        dictionary.refinementTemplate = (dictionaryFlags >> 12) & 1;
        position += 2;
        if (!dictionary.huffman) {
          var atLength = dictionary.template === 0 ? 4 : 1;
          var at = [];
          for (var i = 0; i < atLength; i++) {
            at.push({
              x: readInt8(data, position),
              y: readInt8(data, position + 1)
            });
            position += 2;
          }
          dictionary.at = at;
        }
        if (dictionary.refinement && !dictionary.refinementTemplate) {
          var at = [];
          for (var i = 0; i < 2; i++) {
            at.push({
              x: readInt8(data, position),
              y: readInt8(data, position + 1)
            });
            position += 2;
          }
          dictionary.refinementAt = at;
        }
        dictionary.numberOfExportedSymbols = readUint32(data, position);
        position += 4;
        dictionary.numberOfNewSymbols = readUint32(data, position);
        position += 4;
        args = [dictionary, header.number, header.referredTo,
                data, position, end];
        break;
      case 6: // ImmediateTextRegion
      case 7: // ImmediateLosslessTextRegion
        var textRegion = {};
        textRegion.info = readRegionSegmentInformation(data, position);
        position += RegionSegmentInformationFieldLength;
        var textRegionSegmentFlags = readUint16(data, position);
        position += 2;
        textRegion.huffman = !!(textRegionSegmentFlags & 1);
        textRegion.refinement = !!(textRegionSegmentFlags & 2);
        textRegion.stripSize = 1 << ((textRegionSegmentFlags >> 2) & 3);
        textRegion.referenceCorner = (textRegionSegmentFlags >> 4) & 3;
        textRegion.transposed = !!(textRegionSegmentFlags & 64);
        textRegion.combinationOperator = (textRegionSegmentFlags >> 7) & 3;
        textRegion.defaultPixelValue = (textRegionSegmentFlags >> 9) & 1;
        textRegion.dsOffset = (textRegionSegmentFlags << 17) >> 27;
        textRegion.refinementTemplate = (textRegionSegmentFlags >> 15) & 1;
        if (textRegion.huffman) {
          var textRegionHuffmanFlags = readUint16(data, position);
          position += 2;
          textRegion.huffmanFS = (textRegionHuffmanFlags) & 3;
          textRegion.huffmanDS = (textRegionHuffmanFlags >> 2) & 3;
          textRegion.huffmanDT = (textRegionHuffmanFlags >> 4) & 3;
          textRegion.huffmanRefinementDW = (textRegionHuffmanFlags >> 6) & 3;
          textRegion.huffmanRefinementDH = (textRegionHuffmanFlags >> 8) & 3;
          textRegion.huffmanRefinementDX = (textRegionHuffmanFlags >> 10) & 3;
          textRegion.huffmanRefinementDY = (textRegionHuffmanFlags >> 12) & 3;
          textRegion.huffmanRefinementSizeSelector =
            !!(textRegionHuffmanFlags & 14);
        }
        if (textRegion.refinement && !textRegion.refinementTemplate) {
          var at = [];
          for (var i = 0; i < 2; i++) {
            at.push({
              x: readInt8(data, position),
              y: readInt8(data, position + 1)
            });
            position += 2;
          }
          textRegion.refinementAt = at;
        }
        textRegion.numberOfSymbolInstances = readUint32(data, position);
        position += 4;
        // TODO 7.4.3.1.7 Symbol ID Huffman table decoding
        if (textRegion.huffman)
          error('JBIG2 error: huffman is not supported');
        args = [textRegion, header.referredTo, data, position, end];
        break;
      case 38: // ImmediateGenericRegion
      case 39: // ImmediateLosslessGenericRegion
        var genericRegion = {};
        genericRegion.info = readRegionSegmentInformation(data, position);
        position += RegionSegmentInformationFieldLength;
        var genericRegionSegmentFlags = data[position++];
        genericRegion.mmr = !!(genericRegionSegmentFlags & 1);
        genericRegion.template = (genericRegionSegmentFlags >> 1) & 3;
        genericRegion.prediction = !!(genericRegionSegmentFlags & 8);
        if (!genericRegion.mmr) {
          var atLength = genericRegion.template === 0 ? 4 : 1;
          var at = [];
          for (var i = 0; i < atLength; i++) {
            at.push({
              x: readInt8(data, position),
              y: readInt8(data, position + 1)
            });
            position += 2;
          }
          genericRegion.at = at;
        }
        args = [genericRegion, data, position, end];
        break;
      case 48: // PageInformation
        var pageInfo = {
          width: readUint32(data, position),
          height: readUint32(data, position + 4),
          resolutionX: readUint32(data, position + 8),
          resolutionY: readUint32(data, position + 12)
        };
        if (pageInfo.height == 0xFFFFFFFF)
          delete pageInfo.height;
        var pageSegmentFlags = data[position + 16];
        var pageStripingInformatiom = readUint16(data, position + 17);
        pageInfo.lossless = !!(pageSegmentFlags & 1);
        pageInfo.refinement = !!(pageSegmentFlags & 2);
        pageInfo.defaultPixelValue = (pageSegmentFlags >> 2) & 1;
        pageInfo.combinationOperator = (pageSegmentFlags >> 3) & 3;
        pageInfo.requiresBuffer = !!(pageSegmentFlags & 32);
        pageInfo.combinationOperatorOverride = !!(pageSegmentFlags & 64);
        args = [pageInfo];
        break;
      case 49: // EndOfPage
        break;
      case 50: // EndOfStripe
        break;
      case 51: // EndOfFile
        break;
      case 62: // 7.4.15 defines 2 extension types which
               // are comments and can be ignored.
        break;
      default:
        error('JBIG2 error: segment type ' + header.typeName + '(' +
              header.type + ') is not implemented');
    }
    var callbackName = 'on' + header.typeName;
    if (callbackName in visitor)
      visitor[callbackName].apply(visitor, args);
  }

  function processSegments(segments, visitor) {
    for (var i = 0, ii = segments.length; i < ii; i++)
      processSegment(segments[i], visitor);
  }

  function parseJbig2(data, start, end) {
    var position = start;
    if (data[position] != 0x97 || data[position + 1] != 0x4A ||
        data[position + 2] != 0x42 || data[position + 3] != 0x32 ||
        data[position + 4] != 0x0D || data[position + 5] != 0x0A ||
        data[position + 6] != 0x1A || data[position + 7] != 0x0A)
      error('JBIG2 error: invalid header');
    var header = {};
    position += 8;
    var flags = data[position++];
    header.randomAccess = !(flags & 1);
    if (!(flags & 2)) {
      header.numberOfPages = readUint32(data, position);
      position += 4;
    }
    var segments = readSegments(header, data, position, end);
    error('Not implemented');
    // processSegments(segments, new SimpleSegmentVisitor());
  }

  function parseJbig2Chunks(chunks) {
    var visitor = new SimpleSegmentVisitor();
    for (var i = 0, ii = chunks.length; i < ii; i++) {
      var chunk = chunks[i];
      var segments = readSegments({}, chunk.data, chunk.start, chunk.end);
      processSegments(segments, visitor);
    }
    return visitor.buffer;
  }

  var SimpleSegmentVisitor = langx.klass({
    onPageInformation: function SimpleSegmentVisitor_onPageInformation(info) {
      this.currentPageInfo = info;
      var rowSize = (info.width + 7) >> 3;
      var buffer = new Uint8Array(rowSize * info.height);
      var fill = info.defaultPixelValue ? 0xFF : 0;
      for (var i = 0, ii = buffer.length; i < ii; i++)
        buffer[i] = fill;
      this.buffer = buffer;
    },
    drawBitmap: function SimpleSegmentVisitor_drawBitmap(regionInfo, bitmap) {
      var pageInfo = this.currentPageInfo;
      var width = regionInfo.width, height = regionInfo.height;
      var rowSize = (pageInfo.width + 7) >> 3;
      var combinationOperator = pageInfo.combinationOperatorOverride ?
        regionInfo.combinationOperator : pageInfo.combinationOperator;
      var buffer = this.buffer;
      for (var i = 0; i < height; i++) {
        var mask = 128 >> (regionInfo.x & 7);
        var offset = (i + regionInfo.y) * rowSize + (regionInfo.x >> 3);
        switch (combinationOperator) {
          case 0: // OR
            for (var j = 0; j < width; j++) {
              buffer[offset] |= bitmap[i][j] ? mask : 0;
              mask >>= 1;
              if (!mask) {
                mask = 128;
                offset++;
              }
            }
            break;
          case 2: // XOR
            for (var j = 0; j < width; j++) {
              buffer[offset] ^= bitmap[i][j] ? mask : 0;
              mask >>= 1;
              if (!mask) {
                mask = 128;
                offset++;
              }
            }
            break;
          default:
            error('JBIG2 error: operator ' + combinationOperator +
                  ' is not supported');
        }
      }
    },
    onImmediateGenericRegion:
      function SimpleSegmentVisitor_onImmediateGenericRegion(region, data,
                                                             start, end) {
      var regionInfo = region.info;
      var decodingContext = new DecodingContext(data, start, end);
      var bitmap = decodeBitmap(region.mmr, regionInfo.width, regionInfo.height,
                                region.template, region.prediction, null,
                                region.at, decodingContext);
      this.drawBitmap(regionInfo, bitmap);
    },
    onImmediateLosslessGenericRegion:
      function SimpleSegmentVisitor_onImmediateLosslessGenericRegion() {
      this.onImmediateGenericRegion.apply(this, arguments);
    },
    onSymbolDictionary:
      function SimpleSegmentVisitor_onSymbolDictionary(dictionary,
                                                       currentSegment,
                                                       referredSegments,
                                                       data, start, end) {
      var huffmanTables;
      if (dictionary.huffman)
        error('JBIG2 error: huffman is not supported');

      // Combines exported symbols from all referred segments
      var symbols = this.symbols;
      if (!symbols)
        this.symbols = symbols = {};

      var inputSymbols = [];
      for (var i = 0, ii = referredSegments.length; i < ii; i++)
        inputSymbols = inputSymbols.concat(symbols[referredSegments[i]]);

      var decodingContext = new DecodingContext(data, start, end);
      symbols[currentSegment] = decodeSymbolDictionary(dictionary.huffman,
        dictionary.refinement, inputSymbols, dictionary.numberOfNewSymbols,
        dictionary.numberOfExportedSymbols, huffmanTables,
        dictionary.template, dictionary.at,
        dictionary.refinementTemplate, dictionary.refinementAt,
        decodingContext);
    },
    onImmediateTextRegion:
      function SimpleSegmentVisitor_onImmediateTextRegion(region,
                                                          referredSegments,
                                                          data, start, end) {
      var regionInfo = region.info;
      var huffmanTables;

      // Combines exported symbols from all referred segments
      var symbols = this.symbols;
      var inputSymbols = [];
      for (var i = 0, ii = referredSegments.length; i < ii; i++)
        inputSymbols = inputSymbols.concat(symbols[referredSegments[i]]);
      var symbolCodeLength = log2(inputSymbols.length);

      var decodingContext = new DecodingContext(data, start, end);
      var bitmap = decodeTextRegion(region.huffman, region.refinement,
        regionInfo.width, regionInfo.height, region.defaultPixelValue,
        region.numberOfSymbolInstances, region.stripSize, inputSymbols,
        symbolCodeLength, region.transposed, region.dsOffset,
        region.referenceCorner, region.combinationOperator, huffmanTables,
        region.refinementTemplate, region.refinementAt, decodingContext);
      this.drawBitmap(regionInfo, bitmap);
    },
    onImmediateLosslessTextRegion:
      function SimpleSegmentVisitor_onImmediateLosslessTextRegion() {
        this.onImmediateTextRegion.apply(this, arguments);
    }
  });

  var Jbig2Image = langx.klass({
    parseChunks: function Jbig2Image_parseChunks(chunks) {
      return parseJbig2Chunks(chunks);
    }
  });

  /**
   * For JBIG2's we use a library to decode these images and
   * the stream behaves like all the other DecodeStreams.
   */
  var Jbig2Stream = DecodeStream.inherit({
      klassName : "Jbig2Stream",

      init : function(bytes, dict) {
        this.dict = dict;
        this.bytes = bytes;

          this.overrided();          
      },

    ensureBuffer : function(req) {
        if (this.bufferLength)
            return;

        var jbig2Image = new Jbig2Image();

        var chunks = [],
            decodeParams = this.dict.get('DecodeParms');
        if (decodeParams && decodeParams.has('JBIG2Globals')) {
            var globalsStream = decodeParams.get('JBIG2Globals');
            var globals = globalsStream.getBytes();
            chunks.push({
                data: globals,
                start: 0,
                end: globals.length
            });
        }
        chunks.push({
            data: this.bytes,
            start: 0,
            end: this.bytes.length
        });
        var data = jbig2Image.parseChunks(chunks);
        var dataLength = data.length;

        // JBIG2 had black as 1 and white as 0, inverting the colors
        for (var i = 0; i < dataLength; i++)
            data[i] ^= 0xFF;

        this.buffer = data;
        this.bufferLength = dataLength;
    },
    getChar : function() {
        error('internal error: getChar is not valid on Jbig2Stream');
    }
  });


  return codec.jbig2 = {
    "Jbig2Image" : Jbig2Image,
    "Jbig2Stream" : Jbig2Stream
  };
});

define('skylark-utils-codec/jpeg',[
  "skylark-langx/langx",
  "skylark-utils-stream/DecodeStream",
  "./codec"
],function(langx,DecodeStream,codec){
  'use strict';

   //The module code is based from mozilla/pdf.js/
   // original : https://github.com/mozilla/pdf.js/blob/master/src/core/jpeg.js
   // license  : Apache 2

  var dctZigZag = new Uint8Array([
     0,
     1,  8,
    16,  9,  2,
     3, 10, 17, 24,
    32, 25, 18, 11, 4,
     5, 12, 19, 26, 33, 40,
    48, 41, 34, 27, 20, 13,  6,
     7, 14, 21, 28, 35, 42, 49, 56,
    57, 50, 43, 36, 29, 22, 15,
    23, 30, 37, 44, 51, 58,
    59, 52, 45, 38, 31,
    39, 46, 53, 60,
    61, 54, 47,
    55, 62,
    63
  ]);

  var dctCos1  =  4017;   // cos(pi/16)
  var dctSin1  =   799;   // sin(pi/16)
  var dctCos3  =  3406;   // cos(3*pi/16)
  var dctSin3  =  2276;   // sin(3*pi/16)
  var dctCos6  =  1567;   // cos(6*pi/16)
  var dctSin6  =  3784;   // sin(6*pi/16)
  var dctSqrt2 =  5793;   // sqrt(2)
  var dctSqrt1d2 = 2896;  // sqrt(2) / 2

  function buildHuffmanTable(codeLengths, values) {
    var k = 0, code = [], i, j, length = 16;
    while (length > 0 && !codeLengths[length - 1]) {
      length--;
    }
    code.push({children: [], index: 0});
    var p = code[0], q;
    for (i = 0; i < length; i++) {
      for (j = 0; j < codeLengths[i]; j++) {
        p = code.pop();
        p.children[p.index] = values[k];
        while (p.index > 0) {
          p = code.pop();
        }
        p.index++;
        code.push(p);
        while (code.length <= i) {
          code.push(q = {children: [], index: 0});
          p.children[p.index] = q.children;
          p = q;
        }
        k++;
      }
      if (i + 1 < length) {
        // p here points to last code
        code.push(q = {children: [], index: 0});
        p.children[p.index] = q.children;
        p = q;
      }
    }
    return code[0].children;
  }

  function getBlockBufferOffset(component, row, col) {
    return 64 * ((component.blocksPerLine + 1) * row + col);
  }

  function decodeScan(data, offset, frame, components, resetInterval,
                      spectralStart, spectralEnd, successivePrev, successive) {
    var precision = frame.precision;
    var samplesPerLine = frame.samplesPerLine;
    var scanLines = frame.scanLines;
    var mcusPerLine = frame.mcusPerLine;
    var progressive = frame.progressive;
    var maxH = frame.maxH, maxV = frame.maxV;

    var startOffset = offset, bitsData = 0, bitsCount = 0;

    function readBit() {
      if (bitsCount > 0) {
        bitsCount--;
        return (bitsData >> bitsCount) & 1;
      }
      bitsData = data[offset++];
      if (bitsData === 0xFF) {
        var nextByte = data[offset++];
        if (nextByte) {
          throw 'unexpected marker: ' +
            ((bitsData << 8) | nextByte).toString(16);
        }
        // unstuff 0
      }
      bitsCount = 7;
      return bitsData >>> 7;
    }

    function decodeHuffman(tree) {
      var node = tree;
      while (true) {
        node = node[readBit()];
        if (typeof node === 'number') {
          return node;
        }
        if (typeof node !== 'object') {
          throw 'invalid huffman sequence';
        }
      }
    }

    function receive(length) {
      var n = 0;
      while (length > 0) {
        n = (n << 1) | readBit();
        length--;
      }
      return n;
    }

    function receiveAndExtend(length) {
      if (length === 1) {
        return readBit() === 1 ? 1 : -1;
      }
      var n = receive(length);
      if (n >= 1 << (length - 1)) {
        return n;
      }
      return n + (-1 << length) + 1;
    }

    function decodeBaseline(component, offset) {
      var t = decodeHuffman(component.huffmanTableDC);
      var diff = t === 0 ? 0 : receiveAndExtend(t);
      component.blockData[offset] = (component.pred += diff);
      var k = 1;
      while (k < 64) {
        var rs = decodeHuffman(component.huffmanTableAC);
        var s = rs & 15, r = rs >> 4;
        if (s === 0) {
          if (r < 15) {
            break;
          }
          k += 16;
          continue;
        }
        k += r;
        var z = dctZigZag[k];
        component.blockData[offset + z] = receiveAndExtend(s);
        k++;
      }
    }

    function decodeDCFirst(component, offset) {
      var t = decodeHuffman(component.huffmanTableDC);
      var diff = t === 0 ? 0 : (receiveAndExtend(t) << successive);
      component.blockData[offset] = (component.pred += diff);
    }

    function decodeDCSuccessive(component, offset) {
      component.blockData[offset] |= readBit() << successive;
    }

    var eobrun = 0;
    function decodeACFirst(component, offset) {
      if (eobrun > 0) {
        eobrun--;
        return;
      }
      var k = spectralStart, e = spectralEnd;
      while (k <= e) {
        var rs = decodeHuffman(component.huffmanTableAC);
        var s = rs & 15, r = rs >> 4;
        if (s === 0) {
          if (r < 15) {
            eobrun = receive(r) + (1 << r) - 1;
            break;
          }
          k += 16;
          continue;
        }
        k += r;
        var z = dctZigZag[k];
        component.blockData[offset + z] =
          receiveAndExtend(s) * (1 << successive);
        k++;
      }
    }

    var successiveACState = 0, successiveACNextValue;
    function decodeACSuccessive(component, offset) {
      var k = spectralStart;
      var e = spectralEnd;
      var r = 0;
      var s;
      var rs;
      while (k <= e) {
        var z = dctZigZag[k];
        switch (successiveACState) {
        case 0: // initial state
          rs = decodeHuffman(component.huffmanTableAC);
          s = rs & 15;
          r = rs >> 4;
          if (s === 0) {
            if (r < 15) {
              eobrun = receive(r) + (1 << r);
              successiveACState = 4;
            } else {
              r = 16;
              successiveACState = 1;
            }
          } else {
            if (s !== 1) {
              throw 'invalid ACn encoding';
            }
            successiveACNextValue = receiveAndExtend(s);
            successiveACState = r ? 2 : 3;
          }
          continue;
        case 1: // skipping r zero items
        case 2:
          if (component.blockData[offset + z]) {
            component.blockData[offset + z] += (readBit() << successive);
          } else {
            r--;
            if (r === 0) {
              successiveACState = successiveACState === 2 ? 3 : 0;
            }
          }
          break;
        case 3: // set value for a zero item
          if (component.blockData[offset + z]) {
            component.blockData[offset + z] += (readBit() << successive);
          } else {
            component.blockData[offset + z] =
              successiveACNextValue << successive;
            successiveACState = 0;
          }
          break;
        case 4: // eob
          if (component.blockData[offset + z]) {
            component.blockData[offset + z] += (readBit() << successive);
          }
          break;
        }
        k++;
      }
      if (successiveACState === 4) {
        eobrun--;
        if (eobrun === 0) {
          successiveACState = 0;
        }
      }
    }

    function decodeMcu(component, decode, mcu, row, col) {
      var mcuRow = (mcu / mcusPerLine) | 0;
      var mcuCol = mcu % mcusPerLine;
      var blockRow = mcuRow * component.v + row;
      var blockCol = mcuCol * component.h + col;
      var offset = getBlockBufferOffset(component, blockRow, blockCol);
      decode(component, offset);
    }

    function decodeBlock(component, decode, mcu) {
      var blockRow = (mcu / component.blocksPerLine) | 0;
      var blockCol = mcu % component.blocksPerLine;
      var offset = getBlockBufferOffset(component, blockRow, blockCol);
      decode(component, offset);
    }

    var componentsLength = components.length;
    var component, i, j, k, n;
    var decodeFn;
    if (progressive) {
      if (spectralStart === 0) {
        decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
      } else {
        decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
      }
    } else {
      decodeFn = decodeBaseline;
    }

    var mcu = 0, marker;
    var mcuExpected;
    if (componentsLength === 1) {
      mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
    } else {
      mcuExpected = mcusPerLine * frame.mcusPerColumn;
    }
    if (!resetInterval) {
      resetInterval = mcuExpected;
    }

    var h, v;
    while (mcu < mcuExpected) {
      // reset interval stuff
      for (i = 0; i < componentsLength; i++) {
        components[i].pred = 0;
      }
      eobrun = 0;

      if (componentsLength === 1) {
        component = components[0];
        for (n = 0; n < resetInterval; n++) {
          decodeBlock(component, decodeFn, mcu);
          mcu++;
        }
      } else {
        for (n = 0; n < resetInterval; n++) {
          for (i = 0; i < componentsLength; i++) {
            component = components[i];
            h = component.h;
            v = component.v;
            for (j = 0; j < v; j++) {
              for (k = 0; k < h; k++) {
                decodeMcu(component, decodeFn, mcu, j, k);
              }
            }
          }
          mcu++;
        }
      }

      // find marker
      bitsCount = 0;
      marker = (data[offset] << 8) | data[offset + 1];
      if (marker <= 0xFF00) {
        throw 'marker was not found';
      }

      if (marker >= 0xFFD0 && marker <= 0xFFD7) { // RSTx
        offset += 2;
      } else {
        break;
      }
    }

    return offset - startOffset;
  }

  // A port of poppler's IDCT method which in turn is taken from:
  //   Christoph Loeffler, Adriaan Ligtenberg, George S. Moschytz,
  //   'Practical Fast 1-D DCT Algorithms with 11 Multiplications',
  //   IEEE Intl. Conf. on Acoustics, Speech & Signal Processing, 1989,
  //   988-991.
  function quantizeAndInverse(component, blockBufferOffset, p) {
    var qt = component.quantizationTable, blockData = component.blockData;
    var v0, v1, v2, v3, v4, v5, v6, v7;
    var p0, p1, p2, p3, p4, p5, p6, p7;
    var t;

    // inverse DCT on rows
    for (var row = 0; row < 64; row += 8) {
      // gather block data
      p0 = blockData[blockBufferOffset + row];
      p1 = blockData[blockBufferOffset + row + 1];
      p2 = blockData[blockBufferOffset + row + 2];
      p3 = blockData[blockBufferOffset + row + 3];
      p4 = blockData[blockBufferOffset + row + 4];
      p5 = blockData[blockBufferOffset + row + 5];
      p6 = blockData[blockBufferOffset + row + 6];
      p7 = blockData[blockBufferOffset + row + 7];

      // dequant p0
      p0 *= qt[row];

      // check for all-zero AC coefficients
      if ((p1 | p2 | p3 | p4 | p5 | p6 | p7) === 0) {
        t = (dctSqrt2 * p0 + 512) >> 10;
        p[row] = t;
        p[row + 1] = t;
        p[row + 2] = t;
        p[row + 3] = t;
        p[row + 4] = t;
        p[row + 5] = t;
        p[row + 6] = t;
        p[row + 7] = t;
        continue;
      }
      // dequant p1 ... p7
      p1 *= qt[row + 1];
      p2 *= qt[row + 2];
      p3 *= qt[row + 3];
      p4 *= qt[row + 4];
      p5 *= qt[row + 5];
      p6 *= qt[row + 6];
      p7 *= qt[row + 7];

      // stage 4
      v0 = (dctSqrt2 * p0 + 128) >> 8;
      v1 = (dctSqrt2 * p4 + 128) >> 8;
      v2 = p2;
      v3 = p6;
      v4 = (dctSqrt1d2 * (p1 - p7) + 128) >> 8;
      v7 = (dctSqrt1d2 * (p1 + p7) + 128) >> 8;
      v5 = p3 << 4;
      v6 = p5 << 4;

      // stage 3
      v0 = (v0 + v1 + 1) >> 1;
      v1 = v0 - v1;
      t  = (v2 * dctSin6 + v3 * dctCos6 + 128) >> 8;
      v2 = (v2 * dctCos6 - v3 * dctSin6 + 128) >> 8;
      v3 = t;
      v4 = (v4 + v6 + 1) >> 1;
      v6 = v4 - v6;
      v7 = (v7 + v5 + 1) >> 1;
      v5 = v7 - v5;

      // stage 2
      v0 = (v0 + v3 + 1) >> 1;
      v3 = v0 - v3;
      v1 = (v1 + v2 + 1) >> 1;
      v2 = v1 - v2;
      t  = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
      v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
      v7 = t;
      t  = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
      v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
      v6 = t;

      // stage 1
      p[row] = v0 + v7;
      p[row + 7] = v0 - v7;
      p[row + 1] = v1 + v6;
      p[row + 6] = v1 - v6;
      p[row + 2] = v2 + v5;
      p[row + 5] = v2 - v5;
      p[row + 3] = v3 + v4;
      p[row + 4] = v3 - v4;
    }

    // inverse DCT on columns
    for (var col = 0; col < 8; ++col) {
      p0 = p[col];
      p1 = p[col +  8];
      p2 = p[col + 16];
      p3 = p[col + 24];
      p4 = p[col + 32];
      p5 = p[col + 40];
      p6 = p[col + 48];
      p7 = p[col + 56];

      // check for all-zero AC coefficients
      if ((p1 | p2 | p3 | p4 | p5 | p6 | p7) === 0) {
        t = (dctSqrt2 * p0 + 8192) >> 14;
        // convert to 8 bit
        t = (t < -2040) ? 0 : (t >= 2024) ? 255 : (t + 2056) >> 4;
        blockData[blockBufferOffset + col] = t;
        blockData[blockBufferOffset + col +  8] = t;
        blockData[blockBufferOffset + col + 16] = t;
        blockData[blockBufferOffset + col + 24] = t;
        blockData[blockBufferOffset + col + 32] = t;
        blockData[blockBufferOffset + col + 40] = t;
        blockData[blockBufferOffset + col + 48] = t;
        blockData[blockBufferOffset + col + 56] = t;
        continue;
      }

      // stage 4
      v0 = (dctSqrt2 * p0 + 2048) >> 12;
      v1 = (dctSqrt2 * p4 + 2048) >> 12;
      v2 = p2;
      v3 = p6;
      v4 = (dctSqrt1d2 * (p1 - p7) + 2048) >> 12;
      v7 = (dctSqrt1d2 * (p1 + p7) + 2048) >> 12;
      v5 = p3;
      v6 = p5;

      // stage 3
      // Shift v0 by 128.5 << 5 here, so we don't need to shift p0...p7 when
      // converting to UInt8 range later.
      v0 = ((v0 + v1 + 1) >> 1) + 4112;
      v1 = v0 - v1;
      t  = (v2 * dctSin6 + v3 * dctCos6 + 2048) >> 12;
      v2 = (v2 * dctCos6 - v3 * dctSin6 + 2048) >> 12;
      v3 = t;
      v4 = (v4 + v6 + 1) >> 1;
      v6 = v4 - v6;
      v7 = (v7 + v5 + 1) >> 1;
      v5 = v7 - v5;

      // stage 2
      v0 = (v0 + v3 + 1) >> 1;
      v3 = v0 - v3;
      v1 = (v1 + v2 + 1) >> 1;
      v2 = v1 - v2;
      t  = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
      v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
      v7 = t;
      t  = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
      v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
      v6 = t;

      // stage 1
      p0 = v0 + v7;
      p7 = v0 - v7;
      p1 = v1 + v6;
      p6 = v1 - v6;
      p2 = v2 + v5;
      p5 = v2 - v5;
      p3 = v3 + v4;
      p4 = v3 - v4;

      // convert to 8-bit integers
      p0 = (p0 < 16) ? 0 : (p0 >= 4080) ? 255 : p0 >> 4;
      p1 = (p1 < 16) ? 0 : (p1 >= 4080) ? 255 : p1 >> 4;
      p2 = (p2 < 16) ? 0 : (p2 >= 4080) ? 255 : p2 >> 4;
      p3 = (p3 < 16) ? 0 : (p3 >= 4080) ? 255 : p3 >> 4;
      p4 = (p4 < 16) ? 0 : (p4 >= 4080) ? 255 : p4 >> 4;
      p5 = (p5 < 16) ? 0 : (p5 >= 4080) ? 255 : p5 >> 4;
      p6 = (p6 < 16) ? 0 : (p6 >= 4080) ? 255 : p6 >> 4;
      p7 = (p7 < 16) ? 0 : (p7 >= 4080) ? 255 : p7 >> 4;

      // store block data
      blockData[blockBufferOffset + col] = p0;
      blockData[blockBufferOffset + col +  8] = p1;
      blockData[blockBufferOffset + col + 16] = p2;
      blockData[blockBufferOffset + col + 24] = p3;
      blockData[blockBufferOffset + col + 32] = p4;
      blockData[blockBufferOffset + col + 40] = p5;
      blockData[blockBufferOffset + col + 48] = p6;
      blockData[blockBufferOffset + col + 56] = p7;
    }
  }

  function buildComponentData(frame, component) {
    var blocksPerLine = component.blocksPerLine;
    var blocksPerColumn = component.blocksPerColumn;
    var computationBuffer = new Int16Array(64);

    for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
      for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
        var offset = getBlockBufferOffset(component, blockRow, blockCol);
        quantizeAndInverse(component, offset, computationBuffer);
      }
    }
    return component.blockData;
  }

  function clamp0to255(a) {
    return a <= 0 ? 0 : a >= 255 ? 255 : a;
  }


  var JpegImage = langx.klass({
    parse: function parse(data) {

      function readUint16() {
        var value = (data[offset] << 8) | data[offset + 1];
        offset += 2;
        return value;
      }

      function readDataBlock() {
        var length = readUint16();
        var array = data.subarray(offset, offset + length - 2);
        offset += array.length;
        return array;
      }

      function prepareComponents(frame) {
        var mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / frame.maxH);
        var mcusPerColumn = Math.ceil(frame.scanLines / 8 / frame.maxV);
        for (var i = 0; i < frame.components.length; i++) {
          component = frame.components[i];
          var blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) *
                                        component.h / frame.maxH);
          var blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines  / 8) *
                                          component.v / frame.maxV);
          var blocksPerLineForMcu = mcusPerLine * component.h;
          var blocksPerColumnForMcu = mcusPerColumn * component.v;

          var blocksBufferSize = 64 * blocksPerColumnForMcu *
                                      (blocksPerLineForMcu + 1);
          component.blockData = new Int16Array(blocksBufferSize);
          component.blocksPerLine = blocksPerLine;
          component.blocksPerColumn = blocksPerColumn;
        }
        frame.mcusPerLine = mcusPerLine;
        frame.mcusPerColumn = mcusPerColumn;
      }

      var offset = 0, length = data.length;
      var jfif = null;
      var adobe = null;
      var pixels = null;
      var frame, resetInterval;
      var quantizationTables = [];
      var huffmanTablesAC = [], huffmanTablesDC = [];
      var fileMarker = readUint16();
      if (fileMarker !== 0xFFD8) { // SOI (Start of Image)
        throw 'SOI not found';
      }

      fileMarker = readUint16();
      while (fileMarker !== 0xFFD9) { // EOI (End of image)
        var i, j, l;
        switch(fileMarker) {
          case 0xFFE0: // APP0 (Application Specific)
          case 0xFFE1: // APP1
          case 0xFFE2: // APP2
          case 0xFFE3: // APP3
          case 0xFFE4: // APP4
          case 0xFFE5: // APP5
          case 0xFFE6: // APP6
          case 0xFFE7: // APP7
          case 0xFFE8: // APP8
          case 0xFFE9: // APP9
          case 0xFFEA: // APP10
          case 0xFFEB: // APP11
          case 0xFFEC: // APP12
          case 0xFFED: // APP13
          case 0xFFEE: // APP14
          case 0xFFEF: // APP15
          case 0xFFFE: // COM (Comment)
            var appData = readDataBlock();

            if (fileMarker === 0xFFE0) {
              if (appData[0] === 0x4A && appData[1] === 0x46 &&
                  appData[2] === 0x49 && appData[3] === 0x46 &&
                  appData[4] === 0) { // 'JFIF\x00'
                jfif = {
                  version: { major: appData[5], minor: appData[6] },
                  densityUnits: appData[7],
                  xDensity: (appData[8] << 8) | appData[9],
                  yDensity: (appData[10] << 8) | appData[11],
                  thumbWidth: appData[12],
                  thumbHeight: appData[13],
                  thumbData: appData.subarray(14, 14 +
                                              3 * appData[12] * appData[13])
                };
              }
            }
            // TODO APP1 - Exif
            if (fileMarker === 0xFFEE) {
              if (appData[0] === 0x41 && appData[1] === 0x64 &&
                  appData[2] === 0x6F && appData[3] === 0x62 &&
                  appData[4] === 0x65) { // 'Adobe'
                adobe = {
                  version: (appData[5] << 8) | appData[6],
                  flags0: (appData[7] << 8) | appData[8],
                  flags1: (appData[9] << 8) | appData[10],
                  transformCode: appData[11]
                };
              }
            }
            break;

          case 0xFFDB: // DQT (Define Quantization Tables)
            var quantizationTablesLength = readUint16();
            var quantizationTablesEnd = quantizationTablesLength + offset - 2;
            var z;
            while (offset < quantizationTablesEnd) {
              var quantizationTableSpec = data[offset++];
              var tableData = new Uint16Array(64);
              if ((quantizationTableSpec >> 4) === 0) { // 8 bit values
                for (j = 0; j < 64; j++) {
                  z = dctZigZag[j];
                  tableData[z] = data[offset++];
                }
              } else if ((quantizationTableSpec >> 4) === 1) { //16 bit
                for (j = 0; j < 64; j++) {
                  z = dctZigZag[j];
                  tableData[z] = readUint16();
                }
              } else {
                throw 'DQT: invalid table spec';
              }
              quantizationTables[quantizationTableSpec & 15] = tableData;
            }
            break;

          case 0xFFC0: // SOF0 (Start of Frame, Baseline DCT)
          case 0xFFC1: // SOF1 (Start of Frame, Extended DCT)
          case 0xFFC2: // SOF2 (Start of Frame, Progressive DCT)
            if (frame) {
              throw 'Only single frame JPEGs supported';
            }
            readUint16(); // skip data length
            frame = {};
            frame.extended = (fileMarker === 0xFFC1);
            frame.progressive = (fileMarker === 0xFFC2);
            frame.precision = data[offset++];
            frame.scanLines = readUint16();
            frame.samplesPerLine = readUint16();
            frame.components = [];
            frame.componentIds = {};
            var componentsCount = data[offset++], componentId;
            var maxH = 0, maxV = 0;
            for (i = 0; i < componentsCount; i++) {
              componentId = data[offset];
              var h = data[offset + 1] >> 4;
              var v = data[offset + 1] & 15;
              if (maxH < h) {
                maxH = h;
              }
              if (maxV < v) {
                maxV = v;
              }
              var qId = data[offset + 2];
              l = frame.components.push({
                h: h,
                v: v,
                quantizationTable: quantizationTables[qId]
              });
              frame.componentIds[componentId] = l - 1;
              offset += 3;
            }
            frame.maxH = maxH;
            frame.maxV = maxV;
            prepareComponents(frame);
            break;

          case 0xFFC4: // DHT (Define Huffman Tables)
            var huffmanLength = readUint16();
            for (i = 2; i < huffmanLength;) {
              var huffmanTableSpec = data[offset++];
              var codeLengths = new Uint8Array(16);
              var codeLengthSum = 0;
              for (j = 0; j < 16; j++, offset++) {
                codeLengthSum += (codeLengths[j] = data[offset]);
              }
              var huffmanValues = new Uint8Array(codeLengthSum);
              for (j = 0; j < codeLengthSum; j++, offset++) {
                huffmanValues[j] = data[offset];
              }
              i += 17 + codeLengthSum;

              ((huffmanTableSpec >> 4) === 0 ?
                huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] =
                buildHuffmanTable(codeLengths, huffmanValues);
            }
            break;

          case 0xFFDD: // DRI (Define Restart Interval)
            readUint16(); // skip data length
            resetInterval = readUint16();
            break;

          case 0xFFDA: // SOS (Start of Scan)
            var scanLength = readUint16();
            var selectorsCount = data[offset++];
            var components = [], component;
            for (i = 0; i < selectorsCount; i++) {
              var componentIndex = frame.componentIds[data[offset++]];
              component = frame.components[componentIndex];
              var tableSpec = data[offset++];
              component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
              component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
              components.push(component);
            }
            var spectralStart = data[offset++];
            var spectralEnd = data[offset++];
            var successiveApproximation = data[offset++];
            var processed = decodeScan(data, offset,
              frame, components, resetInterval,
              spectralStart, spectralEnd,
              successiveApproximation >> 4, successiveApproximation & 15);
            offset += processed;
            break;

          case 0xFFFF: // Fill bytes
            if (data[offset] !== 0xFF) { // Avoid skipping a valid marker.
              offset--;
            }
            break;

          default:
            if (data[offset - 3] === 0xFF &&
                data[offset - 2] >= 0xC0 && data[offset - 2] <= 0xFE) {
              // could be incorrect encoding -- last 0xFF byte of the previous
              // block was eaten by the encoder
              offset -= 3;
              break;
            }
            throw 'unknown JPEG marker ' + fileMarker.toString(16);
        }
        fileMarker = readUint16();
      }

      this.width = frame.samplesPerLine;
      this.height = frame.scanLines;
      this.jfif = jfif;
      this.adobe = adobe;
      this.components = [];
      for (i = 0; i < frame.components.length; i++) {
        component = frame.components[i];
        this.components.push({
          output: buildComponentData(frame, component),
          scaleX: component.h / frame.maxH,
          scaleY: component.v / frame.maxV,
          blocksPerLine: component.blocksPerLine,
          blocksPerColumn: component.blocksPerColumn
        });
      }
      this.numComponents = this.components.length;
    },

    _getLinearizedBlockData: function getLinearizedBlockData(width, height) {
      var scaleX = this.width / width, scaleY = this.height / height;

      var component, componentScaleX, componentScaleY, blocksPerScanline;
      var x, y, i, j, k;
      var index;
      var offset = 0;
      var output;
      var numComponents = this.components.length;
      var dataLength = width * height * numComponents;
      var data = new Uint8Array(dataLength);
      var xScaleBlockOffset = new Uint32Array(width);
      var mask3LSB = 0xfffffff8; // used to clear the 3 LSBs

      for (i = 0; i < numComponents; i++) {
        component = this.components[i];
        componentScaleX = component.scaleX * scaleX;
        componentScaleY = component.scaleY * scaleY;
        offset = i;
        output = component.output;
        blocksPerScanline = (component.blocksPerLine + 1) << 3;
        // precalculate the xScaleBlockOffset
        for (x = 0; x < width; x++) {
          j = 0 | (x * componentScaleX);
          xScaleBlockOffset[x] = ((j & mask3LSB) << 3) | (j & 7);
        }
        // linearize the blocks of the component
        for (y = 0; y < height; y++) {
          j = 0 | (y * componentScaleY);
          index = blocksPerScanline * (j & mask3LSB) | ((j & 7) << 3);
          for (x = 0; x < width; x++) {
            data[offset] = output[index + xScaleBlockOffset[x]];
            offset += numComponents;
          }
        }
      }

      // decodeTransform contains pairs of multiplier (-256..256) and additive
      var transform = this.decodeTransform;
      if (transform) {
        for (i = 0; i < dataLength;) {
          for (j = 0, k = 0; j < numComponents; j++, i++, k += 2) {
            data[i] = ((data[i] * transform[k]) >> 8) + transform[k + 1];
          }
        }
      }
      return data;
    },

    _isColorConversionNeeded: function isColorConversionNeeded() {
      if (this.adobe && this.adobe.transformCode) {
        // The adobe transform marker overrides any previous setting
        return true;
      } else if (this.numComponents === 3) {
        return true;
      } else {
        return false;
      }
    },

    _convertYccToRgb: function convertYccToRgb(data) {
      var Y, Cb, Cr;
      for (var i = 0, length = data.length; i < length; i += 3) {
        Y  = data[i    ];
        Cb = data[i + 1];
        Cr = data[i + 2];
        data[i    ] = clamp0to255(Y - 179.456 + 1.402 * Cr);
        data[i + 1] = clamp0to255(Y + 135.459 - 0.344 * Cb - 0.714 * Cr);
        data[i + 2] = clamp0to255(Y - 226.816 + 1.772 * Cb);
      }
      return data;
    },

    _convertYcckToRgb: function convertYcckToRgb(data) {
      var Y, Cb, Cr, k;
      var offset = 0;
      for (var i = 0, length = data.length; i < length; i += 4) {
        Y  = data[i];
        Cb = data[i + 1];
        Cr = data[i + 2];
        k = data[i + 3];

        var r = -122.67195406894 +
          Cb * (-6.60635669420364e-5 * Cb + 0.000437130475926232 * Cr -
                5.4080610064599e-5 * Y + 0.00048449797120281 * k -
                0.154362151871126) +
          Cr * (-0.000957964378445773 * Cr + 0.000817076911346625 * Y -
                0.00477271405408747 * k + 1.53380253221734) +
          Y * (0.000961250184130688 * Y - 0.00266257332283933 * k +
               0.48357088451265) +
          k * (-0.000336197177618394 * k + 0.484791561490776);

        var g = 107.268039397724 +
          Cb * (2.19927104525741e-5 * Cb - 0.000640992018297945 * Cr +
                0.000659397001245577 * Y + 0.000426105652938837 * k -
                0.176491792462875) +
          Cr * (-0.000778269941513683 * Cr + 0.00130872261408275 * Y +
                0.000770482631801132 * k - 0.151051492775562) +
          Y * (0.00126935368114843 * Y - 0.00265090189010898 * k +
               0.25802910206845) +
          k * (-0.000318913117588328 * k - 0.213742400323665);

        var b = -20.810012546947 +
          Cb * (-0.000570115196973677 * Cb - 2.63409051004589e-5 * Cr +
                0.0020741088115012 * Y - 0.00288260236853442 * k +
                0.814272968359295) +
          Cr * (-1.53496057440975e-5 * Cr - 0.000132689043961446 * Y +
                0.000560833691242812 * k - 0.195152027534049) +
          Y * (0.00174418132927582 * Y - 0.00255243321439347 * k +
               0.116935020465145) +
          k * (-0.000343531996510555 * k + 0.24165260232407);

        data[offset++] = clamp0to255(r);
        data[offset++] = clamp0to255(g);
        data[offset++] = clamp0to255(b);
      }
      return data;
    },

    _convertYcckToCmyk: function convertYcckToCmyk(data) {
      var Y, Cb, Cr;
      for (var i = 0, length = data.length; i < length; i += 4) {
        Y  = data[i];
        Cb = data[i + 1];
        Cr = data[i + 2];
        data[i    ] = clamp0to255(434.456 - Y - 1.402 * Cr);
        data[i + 1] = clamp0to255(119.541 - Y + 0.344 * Cb + 0.714 * Cr);
        data[i + 2] = clamp0to255(481.816 - Y - 1.772 * Cb);
        // K in data[i + 3] is unchanged
      }
      return data;
    },

    _convertCmykToRgb: function convertCmykToRgb(data) {
      var c, m, y, k;
      var offset = 0;
      var min = -255 * 255 * 255;
      var scale = 1 / 255 / 255;
      for (var i = 0, length = data.length; i < length; i += 4) {
        c = data[i];
        m = data[i + 1];
        y = data[i + 2];
        k = data[i + 3];

        var r =
          c * (-4.387332384609988 * c + 54.48615194189176 * m +
               18.82290502165302 * y + 212.25662451639585 * k -
               72734.4411664936) +
          m * (1.7149763477362134 * m - 5.6096736904047315 * y -
               17.873870861415444 * k - 1401.7366389350734) +
          y * (-2.5217340131683033 * y - 21.248923337353073 * k +
               4465.541406466231) -
          k * (21.86122147463605 * k + 48317.86113160301);
        var g =
          c * (8.841041422036149 * c + 60.118027045597366 * m +
               6.871425592049007 * y + 31.159100130055922 * k -
               20220.756542821975) +
          m * (-15.310361306967817 * m + 17.575251261109482 * y +
               131.35250912493976 * k - 48691.05921601825) +
          y * (4.444339102852739 * y + 9.8632861493405 * k -
               6341.191035517494) -
          k * (20.737325471181034 * k + 47890.15695978492);
        var b =
          c * (0.8842522430003296 * c + 8.078677503112928 * m +
               30.89978309703729 * y - 0.23883238689178934 * k -
               3616.812083916688) +
          m * (10.49593273432072 * m + 63.02378494754052 * y +
               50.606957656360734 * k - 28620.90484698408) +
          y * (0.03296041114873217 * y + 115.60384449646641 * k -
               49363.43385999684) -
          k * (22.33816807309886 * k + 45932.16563550634);

        data[offset++] = r >= 0 ? 255 : r <= min ? 0 : 255 + r * scale | 0;
        data[offset++] = g >= 0 ? 255 : g <= min ? 0 : 255 + g * scale | 0;
        data[offset++] = b >= 0 ? 255 : b <= min ? 0 : 255 + b * scale | 0;
      }
      return data;
    },

    getData: function getData(width, height, forceRGBoutput) {
      if (this.numComponents > 4) {
        throw 'Unsupported color mode';
      }
      // type of data: Uint8Array(width * height * numComponents)
      var data = this._getLinearizedBlockData(width, height);

      if (this.numComponents === 3) {
        return this._convertYccToRgb(data);
      } else if (this.numComponents === 4) {
        if (this._isColorConversionNeeded()) {
          if (forceRGBoutput) {
            return this._convertYcckToRgb(data);
          } else {
            return this._convertYcckToCmyk(data);
          }
        } else if (forceRGBoutput) {
          return this._convertCmykToRgb(data);
        }
      }
      return data;
    }
  });

  function isAdobeImage(bytes) {
      var maxBytesScanned = Math.max(bytes.length - 16, 1024);
      // Looking for APP14, 'Adobe'
      for (var i = 0; i < maxBytesScanned; ++i) {
          if (bytes[i] == 0xFF && bytes[i + 1] == 0xEE &&
              bytes[i + 2] == 0x00 && bytes[i + 3] == 0x0E &&
              bytes[i + 4] == 0x41 && bytes[i + 5] == 0x64 &&
              bytes[i + 6] == 0x6F && bytes[i + 7] == 0x62 &&
              bytes[i + 8] == 0x65 && bytes[i + 9] == 0x00)
              return true;
          // scanning until frame tag
          if (bytes[i] == 0xFF && bytes[i + 1] == 0xC0)
              break;
      }
      return false;
  }

  function fixAdobeImage(bytes) {
      // Inserting 'EMBED' marker after JPEG signature
      var embedMarker = new Uint8Array([0xFF, 0xEC, 0, 8, 0x45, 0x4D, 0x42, 0x45,
          0x44, 0
      ]);
      var newBytes = new Uint8Array(bytes.length + embedMarker.length);
      newBytes.set(bytes, embedMarker.length);
      // copy JPEG header
      newBytes[0] = bytes[0];
      newBytes[1] = bytes[1];
      newBytes.set(embedMarker, 2);
      return newBytes;
  }

  var JpegStream = DecodeStream.inherit({
      klassName : "JpegStream",

      init : function(bytes, dict, xref) {
        // TODO: per poppler, some images may have 'junk' before that
        // need to be removed
        this.dict = dict;

        this.isAdobeImage = false;
        this.colorTransform = dict.get('ColorTransform') || -1;

        if (isAdobeImage(bytes)) {
            this.isAdobeImage = true;
            bytes = fixAdobeImage(bytes);
        }

        this.bytes = bytes;

          this.overrided();          
      },

      ensureBuffer : function(req) {
          if (this.bufferLength)
              return;
          try {
              var jpegImage = new JpegImage();
              if (this.colorTransform != -1)
                  jpegImage.colorTransform = this.colorTransform;
              jpegImage.parse(this.bytes);
              var width = jpegImage.width;
              var height = jpegImage.height;
              var data = jpegImage.getData(width, height);
              this.buffer = data;
              this.bufferLength = data.length;
          } catch (e) {
              error('JPEG error: ' + e);
          }
      },

      getIR : function () {
          return bytesToString(this.bytes);
      },

      getChar : function () {
          error('internal error: getChar is not valid on JpegStream');
      },

      /**
       * Checks if the image can be decoded and displayed by the browser without any
       * further processing such as color space conversions.
       */
      isNativelySupported : function(xref, res) {
              var cs = ColorSpace.parse(this.dict.get('ColorSpace', 'CS'), xref, res);
              // when bug 674619 lands, let's check if browser can do
              // normal cmyk and then we won't need to decode in JS
              if (cs.name === 'DeviceGray' || cs.name === 'DeviceRGB')
                  return true;
              if (cs.name === 'DeviceCMYK' && !this.isAdobeImage &&
                  this.colorTransform < 1)
                  return true;
              return false;
      },

      /**
       * Checks if the image can be decoded by the browser.
       */
      isNativelyDecodable : function(xref, res) {
              var cs = ColorSpace.parse(this.dict.get('ColorSpace', 'CS'), xref, res);
              var numComps = cs.numComps;
              if (numComps == 1 || numComps == 3)
                  return true;

              return false;
      }

  });


  return codec.jpeg = {
    "JpegImage" :JpegImage,
    "JpegStream" : JpegStream
  };

});
define('skylark-utils-codec/jpx',[
  "skylark-langx/langx",
  "skylark-utils-stream/DecodeStream",
  "./codec"
],function(langx,DecodeStream,codec){
  'use strict';

var JpxImage = (function JpxImageClosure() {
  // Table E.1
  var SubbandsGainLog2 = {
    'LL': 0,
    'LH': 1,
    'HL': 1,
    'HH': 2
  };
  function JpxImage() {
    this.failOnCorruptedImage = false;
  }
  JpxImage.prototype = {
    load: function JpxImage_load(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = (function() {
        // TODO catch parse error
        var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
        this.parse(data);
        if (this.onload)
          this.onload();
      }).bind(this);
      xhr.send(null);
    },
    parse: function JpxImage_parse(data) {
      function readUint(data, offset, bytes) {
        var n = 0;
        for (var i = 0; i < bytes; i++)
          n = n * 256 + (data[offset + i] & 0xFF);
        return n;
      }
      var position = 0, length = data.length;
      while (position < length) {
        var headerSize = 8;
        var lbox = readUint(data, position, 4);
        var tbox = readUint(data, position + 4, 4);
        position += headerSize;
        if (lbox == 1) {
          lbox = readUint(data, position, 8);
          position += 8;
          headerSize += 8;
        }
        if (lbox === 0)
          lbox = length - position + headerSize;
        if (lbox < headerSize)
          error('JPX error: Invalid box field size');
        var dataLength = lbox - headerSize;
        var jumpDataLength = true;
        switch (tbox) {
          case 0x6A501A1A: // 'jP\032\032'
            // TODO
            break;
          case 0x6A703268: // 'jp2h'
            jumpDataLength = false; // parsing child boxes
            break;
          case 0x636F6C72: // 'colr'
            // TODO
            break;
          case 0x6A703263: // 'jp2c'
            this.parseCodestream(data, position, position + dataLength);
            break;
        }
        if (jumpDataLength)
          position += dataLength;
      }
    },
    parseCodestream: function JpxImage_parseCodestream(data, start, end) {
      var context = {};
      try {
        var position = start;
        while (position < end) {
          var code = readUint16(data, position);
          position += 2;

          var length = 0, j;
          switch (code) {
            case 0xFF4F: // Start of codestream (SOC)
              context.mainHeader = true;
              break;
            case 0xFFD9: // End of codestream (EOC)
              break;
            case 0xFF51: // Image and tile size (SIZ)
              length = readUint16(data, position);
              var siz = {};
              siz.Xsiz = readUint32(data, position + 4);
              siz.Ysiz = readUint32(data, position + 8);
              siz.XOsiz = readUint32(data, position + 12);
              siz.YOsiz = readUint32(data, position + 16);
              siz.XTsiz = readUint32(data, position + 20);
              siz.YTsiz = readUint32(data, position + 24);
              siz.XTOsiz = readUint32(data, position + 28);
              siz.YTOsiz = readUint32(data, position + 32);
              var componentsCount = readUint16(data, position + 36);
              siz.Csiz = componentsCount;
              var components = [];
              j = position + 38;
              for (var i = 0; i < componentsCount; i++) {
                var component = {
                  precision: (data[j] & 0x7F) + 1,
                  isSigned: !!(data[j] & 0x80),
                  XRsiz: data[j + 1],
                  YRsiz: data[j + 1]
                };
                calculateComponentDimensions(component, siz);
                components.push(component);
              }
              context.SIZ = siz;
              context.components = components;
              calculateTileGrids(context, components);
              context.QCC = [];
              context.COC = [];
              break;
            case 0xFF5C: // Quantization default (QCD)
              length = readUint16(data, position);
              var qcd = {};
              j = position + 2;
              var sqcd = data[j++];
              var spqcdSize, scalarExpounded;
              switch (sqcd & 0x1F) {
                case 0:
                  spqcdSize = 8;
                  scalarExpounded = true;
                  break;
                case 1:
                  spqcdSize = 16;
                  scalarExpounded = false;
                  break;
                case 2:
                  spqcdSize = 16;
                  scalarExpounded = true;
                  break;
                default:
                  throw 'Invalid SQcd value ' + sqcd;
              }
              qcd.noQuantization = spqcdSize == 8;
              qcd.scalarExpounded = scalarExpounded;
              qcd.guardBits = sqcd >> 5;
              var spqcds = [];
              while (j < length + position) {
                var spqcd = {};
                if (spqcdSize == 8) {
                  spqcd.epsilon = data[j++] >> 3;
                  spqcd.mu = 0;
                } else {
                  spqcd.epsilon = data[j] >> 3;
                  spqcd.mu = ((data[j] & 0x7) << 8) | data[j + 1];
                  j += 2;
                }
                spqcds.push(spqcd);
              }
              qcd.SPqcds = spqcds;
              if (context.mainHeader)
                context.QCD = qcd;
              else {
                context.currentTile.QCD = qcd;
                context.currentTile.QCC = [];
              }
              break;
            case 0xFF5D: // Quantization component (QCC)
              length = readUint16(data, position);
              var qcc = {};
              j = position + 2;
              var cqcc;
              if (context.SIZ.Csiz < 257)
                cqcc = data[j++];
              else {
                cqcc = readUint16(data, j);
                j += 2;
              }
              var sqcd = data[j++];
              var spqcdSize, scalarExpounded;
              switch (sqcd & 0x1F) {
                case 0:
                  spqcdSize = 8;
                  scalarExpounded = true;
                  break;
                case 1:
                  spqcdSize = 16;
                  scalarExpounded = false;
                  break;
                case 2:
                  spqcdSize = 16;
                  scalarExpounded = true;
                  break;
                default:
                  throw 'Invalid SQcd value ' + sqcd;
              }
              qcc.noQuantization = spqcdSize == 8;
              qcc.scalarExpounded = scalarExpounded;
              qcc.guardBits = sqcd >> 5;
              var spqcds = [];
              while (j < length + position) {
                var spqcd = {};
                if (spqcdSize == 8) {
                  spqcd.epsilon = data[j++] >> 3;
                  spqcd.mu = 0;
                } else {
                  spqcd.epsilon = data[j] >> 3;
                  spqcd.mu = ((data[j] & 0x7) << 8) | data[j + 1];
                  j += 2;
                }
                spqcds.push(spqcd);
              }
              qcc.SPqcds = spqcds;
              if (context.mainHeader)
                context.QCC[cqcc] = qcc;
              else
                context.currentTile.QCC[cqcc] = qcc;
              break;
            case 0xFF52: // Coding style default (COD)
              length = readUint16(data, position);
              var cod = {};
              j = position + 2;
              var scod = data[j++];
              cod.entropyCoderWithCustomPrecincts = !!(scod & 1);
              cod.sopMarkerUsed = !!(scod & 2);
              cod.ephMarkerUsed = !!(scod & 4);
              var codingStyle = {};
              cod.progressionOrder = data[j++];
              cod.layersCount = readUint16(data, j);
              j += 2;
              cod.multipleComponentTransform = data[j++];

              cod.decompositionLevelsCount = data[j++];
              cod.xcb = (data[j++] & 0xF) + 2;
              cod.ycb = (data[j++] & 0xF) + 2;
              var blockStyle = data[j++];
              cod.selectiveArithmeticCodingBypass = !!(blockStyle & 1);
              cod.resetContextProbabilities = !!(blockStyle & 2);
              cod.terminationOnEachCodingPass = !!(blockStyle & 4);
              cod.verticalyStripe = !!(blockStyle & 8);
              cod.predictableTermination = !!(blockStyle & 16);
              cod.segmentationSymbolUsed = !!(blockStyle & 32);
              cod.transformation = data[j++];
              if (cod.entropyCoderWithCustomPrecincts) {
                var precinctsSizes = {};
                while (j < length + position) {
                  var precinctsSize = data[j];
                  precinctsSizes.push({
                    PPx: precinctsSize & 0xF,
                    PPy: precinctsSize >> 4
                  });
                }
                cod.precinctsSizes = precinctsSizes;
              }

              if (cod.sopMarkerUsed || cod.ephMarkerUsed ||
                  cod.selectiveArithmeticCodingBypass ||
                  cod.resetContextProbabilities ||
                  cod.terminationOnEachCodingPass ||
                  cod.verticalyStripe || cod.predictableTermination)
                throw 'Unsupported COD options: ' +
                  globalScope.JSON.stringify(cod);

              if (context.mainHeader)
                context.COD = cod;
              else {
                context.currentTile.COD = cod;
                context.currentTile.COC = [];
              }
              break;
            case 0xFF90: // Start of tile-part (SOT)
              length = readUint16(data, position);
              var tile = {};
              tile.index = readUint16(data, position + 2);
              tile.length = readUint32(data, position + 4);
              tile.dataEnd = tile.length + position - 2;
              tile.partIndex = data[position + 8];
              tile.partsCount = data[position + 9];

              context.mainHeader = false;
              if (tile.partIndex === 0) {
                // reset component specific settings
                tile.COD = context.COD;
                tile.COC = context.COC.slice(0); // clone of the global COC
                tile.QCD = context.QCD;
                tile.QCC = context.QCC.slice(0); // clone of the global COC
              }
              context.currentTile = tile;
              break;
            case 0xFF93: // Start of data (SOD)
              var tile = context.currentTile;
              if (tile.partIndex === 0) {
                initializeTile(context, tile.index);
                buildPackets(context);
              }

              // moving to the end of the data
              length = tile.dataEnd - position;

              parseTilePackets(context, data, position, length);
              break;
            case 0xFF64: // Comment (COM)
              length = readUint16(data, position);
              // skipping content
              break;
            default:
              throw 'Unknown codestream code: ' + code.toString(16);
          }
          position += length;
        }
      } catch (e) {
        if (this.failOnCorruptedImage)
          error('JPX error: ' + e);
        else
          warn('JPX error: ' + e + '. Trying to recover');
      }
      this.tiles = transformComponents(context);
      this.width = context.SIZ.Xsiz - context.SIZ.XOsiz;
      this.height = context.SIZ.Ysiz - context.SIZ.YOsiz;
      this.componentsCount = context.SIZ.Csiz;
    }
  };
  function readUint32(data, offset) {
    return (data[offset] << 24) | (data[offset + 1] << 16) |
      (data[offset + 2] << 8) | data[offset + 3];
  }
  function readUint16(data, offset) {
    return (data[offset] << 8) | data[offset + 1];
  }
  function log2(x) {
    var n = 1, i = 0;
    while (x > n) {
      n <<= 1;
      i++;
    }
    return i;
  }
  function calculateComponentDimensions(component, siz) {
    // Section B.2 Component mapping
    component.x0 = Math.ceil(siz.XOsiz / component.XRsiz);
    component.x1 = Math.ceil(siz.Xsiz / component.XRsiz);
    component.y0 = Math.ceil(siz.YOsiz / component.YRsiz);
    component.y1 = Math.ceil(siz.Ysiz / component.YRsiz);
    component.width = component.x1 - component.x0;
    component.height = component.y1 - component.y0;
  }
  function calculateTileGrids(context, components) {
    var siz = context.SIZ;
    // Section B.3 Division into tile and tile-components
    var tiles = [];
    var numXtiles = Math.ceil((siz.Xsiz - siz.XTOsiz) / siz.XTsiz);
    var numYtiles = Math.ceil((siz.Ysiz - siz.YTOsiz) / siz.YTsiz);
    for (var q = 0; q < numYtiles; q++) {
      for (var p = 0; p < numXtiles; p++) {
        var tile = {};
        tile.tx0 = Math.max(siz.XTOsiz + p * siz.XTsiz, siz.XOsiz);
        tile.ty0 = Math.max(siz.YTOsiz + q * siz.YTsiz, siz.YOsiz);
        tile.tx1 = Math.min(siz.XTOsiz + (p + 1) * siz.XTsiz, siz.Xsiz);
        tile.ty1 = Math.min(siz.YTOsiz + (q + 1) * siz.YTsiz, siz.Ysiz);
        tile.width = tile.tx1 - tile.tx0;
        tile.height = tile.ty1 - tile.ty0;
        tile.components = [];
        tiles.push(tile);
      }
    }
    context.tiles = tiles;

    var componentsCount = siz.Csiz;
    for (var i = 0, ii = componentsCount; i < ii; i++) {
      var component = components[i];
      var tileComponents = [];
      for (var j = 0, jj = tiles.length; j < jj; j++) {
        var tileComponent = {}, tile = tiles[j];
        tileComponent.tcx0 = Math.ceil(tile.tx0 / component.XRsiz);
        tileComponent.tcy0 = Math.ceil(tile.ty0 / component.YRsiz);
        tileComponent.tcx1 = Math.ceil(tile.tx1 / component.XRsiz);
        tileComponent.tcy1 = Math.ceil(tile.ty1 / component.YRsiz);
        tileComponent.width = tileComponent.tcx1 - tileComponent.tcx0;
        tileComponent.height = tileComponent.tcy1 - tileComponent.tcy0;
        tile.components[i] = tileComponent;
      }
    }
  }
  function getBlocksDimensions(context, component, r) {
    var codOrCoc = component.codingStyleParameters;
    var result = {};
    if (!codOrCoc.entropyCoderWithCustomPrecincts) {
      result.PPx = 15;
      result.PPy = 15;
    } else {
      result.PPx = codOrCoc.precinctsSizes[r].PPx;
      result.PPy = codOrCoc.precinctsSizes[r].PPy;
    }
    // calculate codeblock size as described in section B.7
    result.xcb_ = r > 0 ? Math.min(codOrCoc.xcb, result.PPx - 1) :
      Math.min(codOrCoc.xcb, result.PPx);
    result.ycb_ = r > 0 ? Math.min(codOrCoc.ycb, result.PPy - 1) :
      Math.min(codOrCoc.ycb, result.PPy);
    return result;
  }
  function buildPrecincts(context, resolution, dimensions) {
    // Section B.6 Division resolution to precincts
    var precinctWidth = 1 << dimensions.PPx;
    var precinctHeight = 1 << dimensions.PPy;
    var numprecinctswide = resolution.trx1 > resolution.trx0 ?
      Math.ceil(resolution.trx1 / precinctWidth) -
      Math.floor(resolution.trx0 / precinctWidth) : 0;
    var numprecinctshigh = resolution.try1 > resolution.try0 ?
      Math.ceil(resolution.try1 / precinctHeight) -
      Math.floor(resolution.try0 / precinctHeight) : 0;
    var numprecincts = numprecinctswide * numprecinctshigh;
    var precinctXOffset = Math.floor(resolution.trx0 / precinctWidth) *
      precinctWidth;
    var precinctYOffset = Math.floor(resolution.try0 / precinctHeight) *
      precinctHeight;
    resolution.precinctParameters = {
      precinctXOffset: precinctXOffset,
      precinctYOffset: precinctYOffset,
      precinctWidth: precinctWidth,
      precinctHeight: precinctHeight,
      numprecinctswide: numprecinctswide,
      numprecinctshigh: numprecinctshigh,
      numprecincts: numprecincts
    };
  }
  function buildCodeblocks(context, subband, dimensions) {
    // Section B.7 Division sub-band into code-blocks
    var xcb_ = dimensions.xcb_;
    var ycb_ = dimensions.ycb_;
    var codeblockWidth = 1 << xcb_;
    var codeblockHeight = 1 << ycb_;
    var cbx0 = Math.floor(subband.tbx0 / codeblockWidth);
    var cby0 = Math.floor(subband.tby0 / codeblockHeight);
    var cbx1 = Math.ceil(subband.tbx1 / codeblockWidth);
    var cby1 = Math.ceil(subband.tby1 / codeblockHeight);
    var precinctParameters = subband.resolution.precinctParameters;
    var codeblocks = [];
    var precincts = [];
    for (var j = cby0; j < cby1; j++) {
      for (var i = cbx0; i < cbx1; i++) {
        var codeblock = {
          cbx: i,
          cby: j,
          tbx0: codeblockWidth * i,
          tby0: codeblockHeight * j,
          tbx1: codeblockWidth * (i + 1),
          tby1: codeblockHeight * (j + 1)
        };
        // calculate precinct number
        var pi = Math.floor((codeblock.tbx0 -
          precinctParameters.precinctXOffset) /
          precinctParameters.precinctWidth);
        var pj = Math.floor((codeblock.tby0 -
          precinctParameters.precinctYOffset) /
          precinctParameters.precinctHeight);
        var precinctNumber = pj +
          pi * precinctParameters.numprecinctswide;
        codeblock.tbx0_ = Math.max(subband.tbx0, codeblock.tbx0);
        codeblock.tby0_ = Math.max(subband.tby0, codeblock.tby0);
        codeblock.tbx1_ = Math.min(subband.tbx1, codeblock.tbx1);
        codeblock.tby1_ = Math.min(subband.tby1, codeblock.tby1);
        codeblock.precinctNumber = precinctNumber;
        codeblock.subbandType = subband.type;
        var coefficientsLength = (codeblock.tbx1_ - codeblock.tbx0_) *
          (codeblock.tby1_ - codeblock.tby0_);
        codeblock.Lblock = 3;
        codeblocks.push(codeblock);
        // building precinct for the sub-band
        var precinct;
        if (precinctNumber in precincts) {
          precinct = precincts[precinctNumber];
          precinct.cbxMin = Math.min(precinct.cbxMin, i);
          precinct.cbyMin = Math.min(precinct.cbyMin, j);
          precinct.cbxMax = Math.max(precinct.cbxMax, i);
          precinct.cbyMax = Math.max(precinct.cbyMax, j);
        } else {
          precincts[precinctNumber] = precinct = {
            cbxMin: i,
            cbyMin: j,
            cbxMax: i,
            cbyMax: j
          };
        }
        codeblock.precinct = precinct;
      }
    }
    subband.codeblockParameters = {
      codeblockWidth: xcb_,
      codeblockHeight: ycb_,
      numcodeblockwide: cbx1 - cbx0 + 1,
      numcodeblockhigh: cby1 - cby1 + 1
    };
    subband.codeblocks = codeblocks;
    for (var i = 0, ii = codeblocks.length; i < ii; i++) {
      var codeblock = codeblocks[i];
      var precinctNumber = codeblock.precinctNumber;
    }
    subband.precincts = precincts;
  }
  function createPacket(resolution, precinctNumber, layerNumber) {
    var precinctCodeblocks = [];
    // Section B.10.8 Order of info in packet
    var subbands = resolution.subbands;
    // sub-bands already ordered in 'LL', 'HL', 'LH', and 'HH' sequence
    for (var i = 0, ii = subbands.length; i < ii; i++) {
      var subband = subbands[i];
      var codeblocks = subband.codeblocks;
      for (var j = 0, jj = codeblocks.length; j < jj; j++) {
        var codeblock = codeblocks[j];
        if (codeblock.precinctNumber != precinctNumber)
          continue;
        precinctCodeblocks.push(codeblock);
      }
    }
    return {
      layerNumber: layerNumber,
      codeblocks: precinctCodeblocks
    };
  }
  function LayerResolutionComponentPositionIterator(context) {
    var siz = context.SIZ;
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var layersCount = tile.codingStyleDefaultParameters.layersCount;
    var componentsCount = siz.Csiz;
    var maxDecompositionLevelsCount = 0;
    for (var q = 0; q < componentsCount; q++) {
      maxDecompositionLevelsCount = Math.max(maxDecompositionLevelsCount,
        tile.components[q].codingStyleParameters.decompositionLevelsCount);
    }

    var l = 0, r = 0, i = 0, k = 0;

    this.nextPacket = function JpxImage_nextPacket() {
      // Section B.12.1.1 Layer-resolution-component-position
      for (; l < layersCount; l++) {
        for (; r <= maxDecompositionLevelsCount; r++) {
          for (; i < componentsCount; i++) {
            var component = tile.components[i];
            if (r > component.codingStyleParameters.decompositionLevelsCount)
              continue;

            var resolution = component.resolutions[r];
            var numprecincts = resolution.precinctParameters.numprecincts;
            for (; k < numprecincts;) {
              var packet = createPacket(resolution, k, l);
              k++;
              return packet;
            }
            k = 0;
          }
          i = 0;
        }
        r = 0;
      }
      throw 'Out of packets';
    };
  }
  function ResolutionLayerComponentPositionIterator(context) {
    var siz = context.SIZ;
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var layersCount = tile.codingStyleDefaultParameters.layersCount;
    var componentsCount = siz.Csiz;
    var maxDecompositionLevelsCount = 0;
    for (var q = 0; q < componentsCount; q++) {
      maxDecompositionLevelsCount = Math.max(maxDecompositionLevelsCount,
        tile.components[q].codingStyleParameters.decompositionLevelsCount);
    }

    var r = 0, l = 0, i = 0, k = 0;

    this.nextPacket = function JpxImage_nextPacket() {
      // Section B.12.1.2 Resolution-layer-component-position
      for (; r <= maxDecompositionLevelsCount; r++) {
        for (; l < layersCount; l++) {
          for (; i < componentsCount; i++) {
            var component = tile.components[i];
            if (r > component.codingStyleParameters.decompositionLevelsCount)
              continue;

            var resolution = component.resolutions[r];
            var numprecincts = resolution.precinctParameters.numprecincts;
            for (; k < numprecincts;) {
              var packet = createPacket(resolution, k, l);
              k++;
              return packet;
            }
            k = 0;
          }
          i = 0;
        }
        l = 0;
      }
      throw 'Out of packets';
    };
  }
  function buildPackets(context) {
    var siz = context.SIZ;
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var componentsCount = siz.Csiz;
    // Creating resolutions and sub-bands for each component
    for (var c = 0; c < componentsCount; c++) {
      var component = tile.components[c];
      var decompositionLevelsCount =
        component.codingStyleParameters.decompositionLevelsCount;
      // Section B.5 Resolution levels and sub-bands
      var resolutions = [];
      var subbands = [];
      for (var r = 0; r <= decompositionLevelsCount; r++) {
        var blocksDimensions = getBlocksDimensions(context, component, r);
        var resolution = {};
        var scale = 1 << (decompositionLevelsCount - r);
        resolution.trx0 = Math.ceil(component.tcx0 / scale);
        resolution.try0 = Math.ceil(component.tcy0 / scale);
        resolution.trx1 = Math.ceil(component.tcx1 / scale);
        resolution.try1 = Math.ceil(component.tcy1 / scale);
        buildPrecincts(context, resolution, blocksDimensions);
        resolutions.push(resolution);

        var subband;
        if (r === 0) {
          // one sub-band (LL) with last decomposition
          subband = {};
          subband.type = 'LL';
          subband.tbx0 = Math.ceil(component.tcx0 / scale);
          subband.tby0 = Math.ceil(component.tcy0 / scale);
          subband.tbx1 = Math.ceil(component.tcx1 / scale);
          subband.tby1 = Math.ceil(component.tcy1 / scale);
          subband.resolution = resolution;
          buildCodeblocks(context, subband, blocksDimensions);
          subbands.push(subband);
          resolution.subbands = [subband];
        } else {
          var bscale = 1 << (decompositionLevelsCount - r + 1);
          var resolutionSubbands = [];
          // three sub-bands (HL, LH and HH) with rest of decompositions
          subband = {};
          subband.type = 'HL';
          subband.tbx0 = Math.ceil(component.tcx0 / bscale - 0.5);
          subband.tby0 = Math.ceil(component.tcy0 / bscale);
          subband.tbx1 = Math.ceil(component.tcx1 / bscale - 0.5);
          subband.tby1 = Math.ceil(component.tcy1 / bscale);
          subband.resolution = resolution;
          buildCodeblocks(context, subband, blocksDimensions);
          subbands.push(subband);
          resolutionSubbands.push(subband);

          subband = {};
          subband.type = 'LH';
          subband.tbx0 = Math.ceil(component.tcx0 / bscale);
          subband.tby0 = Math.ceil(component.tcy0 / bscale - 0.5);
          subband.tbx1 = Math.ceil(component.tcx1 / bscale);
          subband.tby1 = Math.ceil(component.tcy1 / bscale - 0.5);
          subband.resolution = resolution;
          buildCodeblocks(context, subband, blocksDimensions);
          subbands.push(subband);
          resolutionSubbands.push(subband);

          subband = {};
          subband.type = 'HH';
          subband.tbx0 = Math.ceil(component.tcx0 / bscale - 0.5);
          subband.tby0 = Math.ceil(component.tcy0 / bscale - 0.5);
          subband.tbx1 = Math.ceil(component.tcx1 / bscale - 0.5);
          subband.tby1 = Math.ceil(component.tcy1 / bscale - 0.5);
          subband.resolution = resolution;
          buildCodeblocks(context, subband, blocksDimensions);
          subbands.push(subband);
          resolutionSubbands.push(subband);

          resolution.subbands = resolutionSubbands;
        }
      }
      component.resolutions = resolutions;
      component.subbands = subbands;
    }
    // Generate the packets sequence
    var progressionOrder = tile.codingStyleDefaultParameters.progressionOrder;
    var packetsIterator;
    switch (progressionOrder) {
      case 0:
        tile.packetsIterator =
          new LayerResolutionComponentPositionIterator(context);
        break;
      case 1:
        tile.packetsIterator =
          new ResolutionLayerComponentPositionIterator(context);
        break;
      default:
        throw 'Unsupported progression order ' + progressionOrder;
    }
  }
  function parseTilePackets(context, data, offset, dataLength) {
    var position = 0;
    var buffer, bufferSize = 0, skipNextBit = false;
    function readBits(count) {
      while (bufferSize < count) {
        var b = data[offset + position];
        position++;
        if (skipNextBit) {
          buffer = (buffer << 7) | b;
          bufferSize += 7;
          skipNextBit = false;
        } else {
          buffer = (buffer << 8) | b;
          bufferSize += 8;
        }
        if (b == 0xFF) {
          skipNextBit = true;
        }
      }
      bufferSize -= count;
      return (buffer >>> bufferSize) & ((1 << count) - 1);
    }
    function alignToByte() {
      bufferSize = 0;
      if (skipNextBit) {
        position++;
        skipNextBit = false;
      }
    }
    function readCodingpasses() {
      var value = readBits(1);
      if (value === 0)
        return 1;
      value = (value << 1) | readBits(1);
      if (value == 0x02)
        return 2;
      value = (value << 2) | readBits(2);
      if (value <= 0x0E)
        return (value & 0x03) + 3;
      value = (value << 5) | readBits(5);
      if (value <= 0x1FE)
        return (value & 0x1F) + 6;
      value = (value << 7) | readBits(7);
      return (value & 0x7F) + 37;
    }
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var packetsIterator = tile.packetsIterator;
    while (position < dataLength) {
      var packet = packetsIterator.nextPacket();
      if (!readBits(1)) {
        alignToByte();
        continue;
      }
      var layerNumber = packet.layerNumber;
      var queue = [];
      for (var i = 0, ii = packet.codeblocks.length; i < ii; i++) {
        var codeblock = packet.codeblocks[i];
        var precinct = codeblock.precinct;
        var codeblockColumn = codeblock.cbx - precinct.cbxMin;
        var codeblockRow = codeblock.cby - precinct.cbyMin;
        var codeblockIncluded = false;
        var firstTimeInclusion = false;
        if ('included' in codeblock) {
          codeblockIncluded = !!readBits(1);
        } else {
          // reading inclusion tree
          var precinct = codeblock.precinct;
          var inclusionTree, zeroBitPlanesTree;
          if ('inclusionTree' in precinct) {
            inclusionTree = precinct.inclusionTree;
          } else {
            // building inclusion and zero bit-planes trees
            var width = precinct.cbxMax - precinct.cbxMin + 1;
            var height = precinct.cbyMax - precinct.cbyMin + 1;
            inclusionTree = new InclusionTree(width, height, layerNumber);
            zeroBitPlanesTree = new TagTree(width, height);
            precinct.inclusionTree = inclusionTree;
            precinct.zeroBitPlanesTree = zeroBitPlanesTree;
          }

          if (inclusionTree.reset(codeblockColumn, codeblockRow, layerNumber)) {
            while (true) {
              if (readBits(1)) {
                var valueReady = !inclusionTree.nextLevel();
                if (valueReady) {
                  codeblock.included = true;
                  codeblockIncluded = firstTimeInclusion = true;
                  break;
                }
              } else {
                inclusionTree.incrementValue(layerNumber);
                break;
              }
            }
          }
        }
        if (!codeblockIncluded)
          continue;
        if (firstTimeInclusion) {
          zeroBitPlanesTree = precinct.zeroBitPlanesTree;
          zeroBitPlanesTree.reset(codeblockColumn, codeblockRow);
          while (true) {
            if (readBits(1)) {
              var valueReady = !zeroBitPlanesTree.nextLevel();
              if (valueReady)
                break;
            } else
              zeroBitPlanesTree.incrementValue();
          }
          codeblock.zeroBitPlanes = zeroBitPlanesTree.value;
        }
        var codingpasses = readCodingpasses();
        while (readBits(1))
          codeblock.Lblock++;
        var codingpassesLog2 = log2(codingpasses);
        // rounding down log2
        var bits = ((codingpasses < (1 << codingpassesLog2)) ?
          codingpassesLog2 - 1 : codingpassesLog2) + codeblock.Lblock;
        var codedDataLength = readBits(bits);
        queue.push({
          codeblock: codeblock,
          codingpasses: codingpasses,
          dataLength: codedDataLength
        });
      }
      alignToByte();
      while (queue.length > 0) {
        var packetItem = queue.shift();
        var codeblock = packetItem.codeblock;
        if (!('data' in codeblock))
          codeblock.data = [];
        codeblock.data.push({
          data: data,
          start: offset + position,
          end: offset + position + packetItem.dataLength,
          codingpasses: packetItem.codingpasses
        });
        position += packetItem.dataLength;
      }
    }
    return position;
  }
  function copyCoefficients(coefficients, x0, y0, width, height,
                            delta, mb, codeblocks, transformation,
                            segmentationSymbolUsed) {
    var r = 0.5; // formula (E-6)
    for (var i = 0, ii = codeblocks.length; i < ii; ++i) {
      var codeblock = codeblocks[i];
      var blockWidth = codeblock.tbx1_ - codeblock.tbx0_;
      var blockHeight = codeblock.tby1_ - codeblock.tby0_;
      if (blockWidth === 0 || blockHeight === 0)
        continue;
      if (!('data' in codeblock))
        continue;

      var bitModel, currentCodingpassType;
      bitModel = new BitModel(blockWidth, blockHeight, codeblock.subbandType,
        codeblock.zeroBitPlanes);
      currentCodingpassType = 2; // first bit plane starts from cleanup

      // collect data
      var data = codeblock.data, totalLength = 0, codingpasses = 0;
      for (var q = 0, qq = data.length; q < qq; q++) {
        var dataItem = data[q];
        totalLength += dataItem.end - dataItem.start;
        codingpasses += dataItem.codingpasses;
      }
      var encodedData = new Uint8Array(totalLength), k = 0;
      for (var q = 0, qq = data.length; q < qq; q++) {
        var dataItem = data[q];
        var chunk = dataItem.data.subarray(dataItem.start, dataItem.end);
        encodedData.set(chunk, k);
        k += chunk.length;
      }
      // decoding the item
      var decoder = new ArithmeticDecoder(encodedData, 0, totalLength);
      bitModel.setDecoder(decoder);

      for (var q = 0; q < codingpasses; q++) {
        switch (currentCodingpassType) {
          case 0:
            bitModel.runSignificancePropogationPass();
            break;
          case 1:
            bitModel.runMagnitudeRefinementPass();
            break;
          case 2:
            bitModel.runCleanupPass();
            if (segmentationSymbolUsed)
              bitModel.checkSegmentationSymbol();
            break;
        }
        currentCodingpassType = (currentCodingpassType + 1) % 3;
      }

      var offset = (codeblock.tbx0_ - x0) + (codeblock.tby0_ - y0) * width;
      var position = 0;
      for (var j = 0; j < blockHeight; j++) {
        for (var k = 0; k < blockWidth; k++) {
          var n = (bitModel.coefficentsSign[position] ? -1 : 1) *
            bitModel.coefficentsMagnitude[position];
          var nb = bitModel.bitsDecoded[position], correction;
          if (transformation === 0 || mb > nb) {
            // use r only if transformation is irreversible or
            // not all bitplanes were decoded for reversible transformation
            n += n < 0 ? n - r : n > 0 ? n + r : 0;
            correction = 1 << (mb - nb);
          } else
            correction = 1;
          coefficients[offset++] = n * correction * delta;
          position++;
        }
        offset += width - blockWidth;
      }
    }
  }
  function transformTile(context, tile, c) {
    var component = tile.components[c];
    var codingStyleParameters = component.codingStyleParameters;
    var quantizationParameters = component.quantizationParameters;
    var decompositionLevelsCount =
      codingStyleParameters.decompositionLevelsCount;
    var spqcds = quantizationParameters.SPqcds;
    var scalarExpounded = quantizationParameters.scalarExpounded;
    var guardBits = quantizationParameters.guardBits;
    var transformation = codingStyleParameters.transformation;
    var segmentationSymbolUsed = codingStyleParameters.segmentationSymbolUsed;
    var precision = context.components[c].precision;

    var subbandCoefficients = [];
    var k = 0, b = 0;
    for (var i = 0; i <= decompositionLevelsCount; i++) {
      var resolution = component.resolutions[i];

      for (var j = 0, jj = resolution.subbands.length; j < jj; j++) {
        var mu, epsilon;
        if (!scalarExpounded) {
          // formula E-5
          mu = spqcds[0].mu;
          epsilon = spqcds[0].epsilon + (i > 0 ? 1 - i : 0);
        } else {
          mu = spqcds[b].mu;
          epsilon = spqcds[b].epsilon;
        }

        var subband = resolution.subbands[j];
        var width = subband.tbx1 - subband.tbx0;
        var height = subband.tby1 - subband.tby0;
        var gainLog2 = SubbandsGainLog2[subband.type];

        // calulate quantization coefficient (Section E.1.1.1)
        var delta = Math.pow(2, (precision + gainLog2) - epsilon) *
          (1 + mu / 2048);
        var mb = (guardBits + epsilon - 1);

        var coefficients = new Float32Array(width * height);
        copyCoefficients(coefficients, subband.tbx0, subband.tby0,
          width, height, delta, mb, subband.codeblocks, transformation,
          segmentationSymbolUsed);

        subbandCoefficients.push({
          width: width,
          height: height,
          items: coefficients
        });

        b++;
      }
    }

    var transformation = codingStyleParameters.transformation;
    var transform = transformation === 0 ? new IrreversibleTransform() :
      new ReversibleTransform();
    var result = transform.calculate(subbandCoefficients,
      component.tcx0, component.tcy0);
    return {
      left: component.tcx0,
      top: component.tcy0,
      width: result.width,
      height: result.height,
      items: result.items
    };
  }
  function transformComponents(context) {
    var siz = context.SIZ;
    var components = context.components;
    var componentsCount = siz.Csiz;
    var resultImages = [];
    for (var i = 0, ii = context.tiles.length; i < ii; i++) {
      var tile = context.tiles[i];
      var result = [];
      for (var c = 0; c < componentsCount; c++) {
        var image = transformTile(context, tile, c);
        result.push(image);
      }

      // Section G.2.2 Inverse multi component transform
      if (tile.codingStyleDefaultParameters.multipleComponentTransform) {
        var y0items = result[0].items;
        var y1items = result[1].items;
        var y2items = result[2].items;
        for (var j = 0, jj = y0items.length; j < jj; j++) {
          var y0 = y0items[j], y1 = y1items[j], y2 = y2items[j];
          var i1 = y0 - ((y2 + y1) >> 2);
          y1items[j] = i1;
          y0items[j] = y2 + i1;
          y2items[j] = y1 + i1;
        }
      }

      // Section G.1 DC level shifting to unsigned component values
      for (var c = 0; c < componentsCount; c++) {
        var component = components[c];
        if (component.isSigned)
          continue;

        var offset = 1 << (component.precision - 1);
        var tileImage = result[c];
        var items = tileImage.items;
        for (var j = 0, jj = items.length; j < jj; j++)
          items[j] += offset;
      }

      // To simplify things: shift and clamp output to 8 bit unsigned
      for (var c = 0; c < componentsCount; c++) {
        var component = components[c];
        var offset = component.isSigned ? 128 : 0;
        var shift = component.precision - 8;
        var tileImage = result[c];
        var items = tileImage.items;
        var data = new Uint8Array(items.length);
        for (var j = 0, jj = items.length; j < jj; j++) {
          var value = (items[j] >> shift) + offset;
          data[j] = value < 0 ? 0 : value > 255 ? 255 : value;
        }
        result[c].items = data;
      }

      resultImages.push(result);
    }
    return resultImages;
  }
  function initializeTile(context, tileIndex) {
    var siz = context.SIZ;
    var componentsCount = siz.Csiz;
    var tile = context.tiles[tileIndex];
    var resultTiles = [];
    for (var c = 0; c < componentsCount; c++) {
      var component = tile.components[c];
      var qcdOrQcc = c in context.currentTile.QCC ?
        context.currentTile.QCC[c] : context.currentTile.QCD;
      component.quantizationParameters = qcdOrQcc;
      var codOrCoc = c in context.currentTile.COC ?
        context.currentTile.COC[c] : context.currentTile.COD;
      component.codingStyleParameters = codOrCoc;
    }
    tile.codingStyleDefaultParameters = context.currentTile.COD;
  }

  // Section B.10.2 Tag trees
  var TagTree = (function TagTreeClosure() {
    function TagTree(width, height) {
      var levelsLength = log2(Math.max(width, height)) + 1;
      this.levels = [];
      for (var i = 0; i < levelsLength; i++) {
        var level = {
          width: width,
          height: height,
          items: []
        };
        this.levels.push(level);
        width = Math.ceil(width / 2);
        height = Math.ceil(height / 2);
      }
    }
    TagTree.prototype = {
      reset: function TagTree_reset(i, j) {
        var currentLevel = 0, value = 0;
        while (currentLevel < this.levels.length) {
          var level = this.levels[currentLevel];
          var index = i + j * level.width;
          if (index in level.items) {
            value = level.items[index];
            break;
          }
          level.index = index;
          i >>= 1;
          j >>= 1;
          currentLevel++;
        }
        currentLevel--;
        var level = this.levels[currentLevel];
        level.items[level.index] = value;
        this.currentLevel = currentLevel;
        delete this.value;
      },
      incrementValue: function TagTree_incrementValue() {
        var level = this.levels[this.currentLevel];
        level.items[level.index]++;
      },
      nextLevel: function TagTree_nextLevel() {
        var currentLevel = this.currentLevel;
        var level = this.levels[currentLevel];
        var value = level.items[level.index];
        currentLevel--;
        if (currentLevel < 0) {
          this.value = value;
          return false;
        }

        this.currentLevel = currentLevel;
        var level = this.levels[currentLevel];
        level.items[level.index] = value;
        return true;
      }
    };
    return TagTree;
  })();

  var InclusionTree = (function InclusionTreeClosure() {
    function InclusionTree(width, height,  defaultValue) {
      var levelsLength = log2(Math.max(width, height)) + 1;
      this.levels = [];
      for (var i = 0; i < levelsLength; i++) {
        var items = new Uint8Array(width * height);
        for (var j = 0, jj = items.length; j < jj; j++)
          items[j] = defaultValue;

        var level = {
          width: width,
          height: height,
          items: items
        };
        this.levels.push(level);

        width = Math.ceil(width / 2);
        height = Math.ceil(height / 2);
      }
    }
    InclusionTree.prototype = {
      reset: function InclusionTree_reset(i, j, stopValue) {
        var currentLevel = 0;
        while (currentLevel < this.levels.length) {
          var level = this.levels[currentLevel];
          var index = i + j * level.width;
          level.index = index;
          var value = level.items[index];

          if (value == 0xFF)
            break;

          if (value > stopValue) {
            this.currentLevel = currentLevel;
            // already know about this one, propagating the value to top levels
            this.propagateValues();
            return false;
          }

          i >>= 1;
          j >>= 1;
          currentLevel++;
        }
        this.currentLevel = currentLevel - 1;
        return true;
      },
      incrementValue: function InclusionTree_incrementValue(stopValue) {
        var level = this.levels[this.currentLevel];
        level.items[level.index] = stopValue + 1;
        this.propagateValues();
      },
      propagateValues: function InclusionTree_propagateValues() {
        var levelIndex = this.currentLevel;
        var level = this.levels[levelIndex];
        var currentValue = level.items[level.index];
        while (--levelIndex >= 0) {
          var level = this.levels[levelIndex];
          level.items[level.index] = currentValue;
        }
      },
      nextLevel: function InclusionTree_nextLevel() {
        var currentLevel = this.currentLevel;
        var level = this.levels[currentLevel];
        var value = level.items[level.index];
        level.items[level.index] = 0xFF;
        currentLevel--;
        if (currentLevel < 0)
          return false;

        this.currentLevel = currentLevel;
        var level = this.levels[currentLevel];
        level.items[level.index] = value;
        return true;
      }
    };
    return InclusionTree;
  })();

  // Implements C.3. Arithmetic decoding procedures
  var ArithmeticDecoder = (function ArithmeticDecoderClosure() {
    var QeTable = [
      {qe: 0x5601, nmps: 1, nlps: 1, switchFlag: 1},
      {qe: 0x3401, nmps: 2, nlps: 6, switchFlag: 0},
      {qe: 0x1801, nmps: 3, nlps: 9, switchFlag: 0},
      {qe: 0x0AC1, nmps: 4, nlps: 12, switchFlag: 0},
      {qe: 0x0521, nmps: 5, nlps: 29, switchFlag: 0},
      {qe: 0x0221, nmps: 38, nlps: 33, switchFlag: 0},
      {qe: 0x5601, nmps: 7, nlps: 6, switchFlag: 1},
      {qe: 0x5401, nmps: 8, nlps: 14, switchFlag: 0},
      {qe: 0x4801, nmps: 9, nlps: 14, switchFlag: 0},
      {qe: 0x3801, nmps: 10, nlps: 14, switchFlag: 0},
      {qe: 0x3001, nmps: 11, nlps: 17, switchFlag: 0},
      {qe: 0x2401, nmps: 12, nlps: 18, switchFlag: 0},
      {qe: 0x1C01, nmps: 13, nlps: 20, switchFlag: 0},
      {qe: 0x1601, nmps: 29, nlps: 21, switchFlag: 0},
      {qe: 0x5601, nmps: 15, nlps: 14, switchFlag: 1},
      {qe: 0x5401, nmps: 16, nlps: 14, switchFlag: 0},
      {qe: 0x5101, nmps: 17, nlps: 15, switchFlag: 0},
      {qe: 0x4801, nmps: 18, nlps: 16, switchFlag: 0},
      {qe: 0x3801, nmps: 19, nlps: 17, switchFlag: 0},
      {qe: 0x3401, nmps: 20, nlps: 18, switchFlag: 0},
      {qe: 0x3001, nmps: 21, nlps: 19, switchFlag: 0},
      {qe: 0x2801, nmps: 22, nlps: 19, switchFlag: 0},
      {qe: 0x2401, nmps: 23, nlps: 20, switchFlag: 0},
      {qe: 0x2201, nmps: 24, nlps: 21, switchFlag: 0},
      {qe: 0x1C01, nmps: 25, nlps: 22, switchFlag: 0},
      {qe: 0x1801, nmps: 26, nlps: 23, switchFlag: 0},
      {qe: 0x1601, nmps: 27, nlps: 24, switchFlag: 0},
      {qe: 0x1401, nmps: 28, nlps: 25, switchFlag: 0},
      {qe: 0x1201, nmps: 29, nlps: 26, switchFlag: 0},
      {qe: 0x1101, nmps: 30, nlps: 27, switchFlag: 0},
      {qe: 0x0AC1, nmps: 31, nlps: 28, switchFlag: 0},
      {qe: 0x09C1, nmps: 32, nlps: 29, switchFlag: 0},
      {qe: 0x08A1, nmps: 33, nlps: 30, switchFlag: 0},
      {qe: 0x0521, nmps: 34, nlps: 31, switchFlag: 0},
      {qe: 0x0441, nmps: 35, nlps: 32, switchFlag: 0},
      {qe: 0x02A1, nmps: 36, nlps: 33, switchFlag: 0},
      {qe: 0x0221, nmps: 37, nlps: 34, switchFlag: 0},
      {qe: 0x0141, nmps: 38, nlps: 35, switchFlag: 0},
      {qe: 0x0111, nmps: 39, nlps: 36, switchFlag: 0},
      {qe: 0x0085, nmps: 40, nlps: 37, switchFlag: 0},
      {qe: 0x0049, nmps: 41, nlps: 38, switchFlag: 0},
      {qe: 0x0025, nmps: 42, nlps: 39, switchFlag: 0},
      {qe: 0x0015, nmps: 43, nlps: 40, switchFlag: 0},
      {qe: 0x0009, nmps: 44, nlps: 41, switchFlag: 0},
      {qe: 0x0005, nmps: 45, nlps: 42, switchFlag: 0},
      {qe: 0x0001, nmps: 45, nlps: 43, switchFlag: 0},
      {qe: 0x5601, nmps: 46, nlps: 46, switchFlag: 0}
    ];

    function ArithmeticDecoder(data, start, end) {
      this.data = data;
      this.bp = start;
      this.dataEnd = end;

      this.chigh = data[start];
      this.clow = 0;

      this.byteIn();

      this.chigh = ((this.chigh << 7) & 0xFFFF) | ((this.clow >> 9) & 0x7F);
      this.clow = (this.clow << 7) & 0xFFFF;
      this.ct -= 7;
      this.a = 0x8000;
    }

    ArithmeticDecoder.prototype = {
      byteIn: function ArithmeticDecoder_byteIn() {
        var data = this.data;
        var bp = this.bp;
        if (data[bp] == 0xFF) {
          var b1 = data[bp + 1];
          if (b1 > 0x8F) {
            this.clow += 0xFF00;
            this.ct = 8;
          } else {
            bp++;
            this.clow += (data[bp] << 9);
            this.ct = 7;
            this.bp = bp;
          }
        } else {
          bp++;
          this.clow += bp < this.dataEnd ? (data[bp] << 8) : 0xFF00;
          this.ct = 8;
          this.bp = bp;
        }
        if (this.clow > 0xFFFF) {
          this.chigh += (this.clow >> 16);
          this.clow &= 0xFFFF;
        }
      },
      readBit: function ArithmeticDecoder_readBit(cx) {
        var qeIcx = QeTable[cx.index].qe;
        this.a -= qeIcx;

        if (this.chigh < qeIcx) {
          var d = this.exchangeLps(cx);
          this.renormD();
          return d;
        } else {
          this.chigh -= qeIcx;
          if ((this.a & 0x8000) === 0) {
            var d = this.exchangeMps(cx);
            this.renormD();
            return d;
          } else {
            return cx.mps;
          }
        }
      },
      renormD: function ArithmeticDecoder_renormD() {
        do {
          if (this.ct === 0)
            this.byteIn();

          this.a <<= 1;
          this.chigh = ((this.chigh << 1) & 0xFFFF) | ((this.clow >> 15) & 1);
          this.clow = (this.clow << 1) & 0xFFFF;
          this.ct--;
        } while ((this.a & 0x8000) === 0);
      },
      exchangeMps: function ArithmeticDecoder_exchangeMps(cx) {
        var d;
        var qeTableIcx = QeTable[cx.index];
        if (this.a < qeTableIcx.qe) {
          d = 1 - cx.mps;

          if (qeTableIcx.switchFlag == 1) {
            cx.mps = 1 - cx.mps;
          }
          cx.index = qeTableIcx.nlps;
        } else {
          d = cx.mps;
          cx.index = qeTableIcx.nmps;
        }
        return d;
      },
      exchangeLps: function ArithmeticDecoder_exchangeLps(cx) {
        var d;
        var qeTableIcx = QeTable[cx.index];
        if (this.a < qeTableIcx.qe) {
          this.a = qeTableIcx.qe;
          d = cx.mps;
          cx.index = qeTableIcx.nmps;
        } else {
          this.a = qeTableIcx.qe;
          d = 1 - cx.mps;

          if (qeTableIcx.switchFlag == 1) {
            cx.mps = 1 - cx.mps;
          }
          cx.index = qeTableIcx.nlps;
        }
        return d;
      }
    };

    return ArithmeticDecoder;
  })();

  // Section D. Coefficient bit modeling
  var BitModel = (function BitModelClosure() {
    // Table D-1
    // The index is binary presentation: 0dddvvhh, ddd - sum of Di (0..4),
    // vv - sum of Vi (0..2), and hh - sum of Hi (0..2)
    var LLAndLHContextsLabel = new Uint8Array([
      0, 5, 8, 0, 3, 7, 8, 0, 4, 7, 8, 0, 0, 0, 0, 0, 1, 6, 8, 0, 3, 7, 8, 0, 4,
      7, 8, 0, 0, 0, 0, 0, 2, 6, 8, 0, 3, 7, 8, 0, 4, 7, 8, 0, 0, 0, 0, 0, 2, 6,
      8, 0, 3, 7, 8, 0, 4, 7, 8, 0, 0, 0, 0, 0, 2, 6, 8, 0, 3, 7, 8, 0, 4, 7, 8
    ]);
    var HLContextLabel = new Uint8Array([
      0, 3, 4, 0, 5, 7, 7, 0, 8, 8, 8, 0, 0, 0, 0, 0, 1, 3, 4, 0, 6, 7, 7, 0, 8,
      8, 8, 0, 0, 0, 0, 0, 2, 3, 4, 0, 6, 7, 7, 0, 8, 8, 8, 0, 0, 0, 0, 0, 2, 3,
      4, 0, 6, 7, 7, 0, 8, 8, 8, 0, 0, 0, 0, 0, 2, 3, 4, 0, 6, 7, 7, 0, 8, 8, 8
    ]);
    var HHContextLabel = new Uint8Array([
      0, 1, 2, 0, 1, 2, 2, 0, 2, 2, 2, 0, 0, 0, 0, 0, 3, 4, 5, 0, 4, 5, 5, 0, 5,
      5, 5, 0, 0, 0, 0, 0, 6, 7, 7, 0, 7, 7, 7, 0, 7, 7, 7, 0, 0, 0, 0, 0, 8, 8,
      8, 0, 8, 8, 8, 0, 8, 8, 8, 0, 0, 0, 0, 0, 8, 8, 8, 0, 8, 8, 8, 0, 8, 8, 8
    ]);

    // Table D-2
    function calcSignContribution(significance0, sign0, significance1, sign1) {
      if (significance1) {
        if (!sign1)
          return significance0 ? (!sign0 ? 1 : 0) : 1;
        else
          return significance0 ? (!sign0 ? 0 : -1) : -1;
      } else
        return significance0 ? (!sign0 ? 1 : -1) : 0;
    }
    // Table D-3
    var SignContextLabels = [
      {contextLabel: 13, xorBit: 0},
      {contextLabel: 12, xorBit: 0},
      {contextLabel: 11, xorBit: 0},
      {contextLabel: 10, xorBit: 0},
      {contextLabel: 9, xorBit: 0},
      {contextLabel: 10, xorBit: 1},
      {contextLabel: 11, xorBit: 1},
      {contextLabel: 12, xorBit: 1},
      {contextLabel: 13, xorBit: 1}
    ];

    function BitModel(width, height, subband, zeroBitPlanes) {
      this.width = width;
      this.height = height;

      this.contextLabelTable = subband == 'HH' ? HHContextLabel :
        subband == 'HL' ? HLContextLabel : LLAndLHContextsLabel;

      var coefficientCount = width * height;

      // coefficients outside the encoding region treated as insignificant
      // add border state cells for significanceState
      this.neighborsSignificance = new Uint8Array(coefficientCount);
      this.coefficentsSign = new Uint8Array(coefficientCount);
      this.coefficentsMagnitude = new Uint32Array(coefficientCount);
      this.processingFlags = new Uint8Array(coefficientCount);

      var bitsDecoded = new Uint8Array(this.width * this.height);
      for (var i = 0, ii = bitsDecoded.length; i < ii; i++)
        bitsDecoded[i] = zeroBitPlanes;
      this.bitsDecoded = bitsDecoded;

      this.reset();
    }

    BitModel.prototype = {
      setDecoder: function BitModel_setDecoder(decoder) {
        this.decoder = decoder;
      },
      reset: function BitModel_reset() {
        this.uniformContext = {index: 46, mps: 0};
        this.runLengthContext = {index: 3, mps: 0};
        this.contexts = [];
        this.contexts.push({index: 4, mps: 0});
        for (var i = 1; i <= 16; i++)
          this.contexts.push({index: 0, mps: 0});
      },
      setNeighborsSignificance:
        function BitModel_setNeighborsSignificance(row, column) {
        var neighborsSignificance = this.neighborsSignificance;
        var width = this.width, height = this.height;
        var index = row * width + column;
        if (row > 0) {
          if (column > 0)
            neighborsSignificance[index - width - 1] += 0x10;
          if (column + 1 < width)
            neighborsSignificance[index - width + 1] += 0x10;
          neighborsSignificance[index - width] += 0x04;
        }
        if (row + 1 < height) {
          if (column > 0)
            neighborsSignificance[index + width - 1] += 0x10;
          if (column + 1 < width)
            neighborsSignificance[index + width + 1] += 0x10;
          neighborsSignificance[index + width] += 0x04;
        }
        if (column > 0)
          neighborsSignificance[index - 1] += 0x01;
        if (column + 1 < width)
          neighborsSignificance[index + 1] += 0x01;
        neighborsSignificance[index] |= 0x80;
      },
      runSignificancePropogationPass:
        function BitModel_runSignificancePropogationPass() {
        var decoder = this.decoder;
        var width = this.width, height = this.height;
        var coefficentsMagnitude = this.coefficentsMagnitude;
        var coefficentsSign = this.coefficentsSign;
        var contextLabels = this.contextLabels;
        var neighborsSignificance = this.neighborsSignificance;
        var processingFlags = this.processingFlags;
        var contexts = this.contexts;
        var labels = this.contextLabelTable;
        var bitsDecoded = this.bitsDecoded;
        // clear processed flag
        var processedInverseMask = ~1;
        var processedMask = 1;
        var firstMagnitudeBitMask = 2;
        for (var q = 0, qq = width * height; q < qq; q++)
          processingFlags[q] &= processedInverseMask;

        for (var i0 = 0; i0 < height; i0 += 4) {
          for (var j = 0; j < width; j++) {
            var index = i0 * width + j;
            for (var i1 = 0; i1 < 4; i1++, index += width) {
              var i = i0 + i1;
              if (i >= height)
                break;

              if (coefficentsMagnitude[index] || !neighborsSignificance[index])
                continue;

              var contextLabel = labels[neighborsSignificance[index]];
              var cx = contexts[contextLabel];
              var decision = decoder.readBit(cx);
              if (decision) {
                var sign = this.decodeSignBit(i, j);
                coefficentsSign[index] = sign;
                coefficentsMagnitude[index] = 1;
                this.setNeighborsSignificance(i, j);
                processingFlags[index] |= firstMagnitudeBitMask;
              }
              bitsDecoded[index]++;
              processingFlags[index] |= processedMask;
            }
          }
        }
      },
      decodeSignBit: function BitModel_decodeSignBit(row, column) {
        var width = this.width, height = this.height;
        var index = row * width + column;
        var coefficentsMagnitude = this.coefficentsMagnitude;
        var coefficentsSign = this.coefficentsSign;
        var horizontalContribution = calcSignContribution(
          column > 0 && coefficentsMagnitude[index - 1],
          coefficentsSign[index - 1],
          column + 1 < width && coefficentsMagnitude[index + 1],
          coefficentsSign[index + 1]);
        var verticalContribution = calcSignContribution(
          row > 0 && coefficentsMagnitude[index - width],
          coefficentsSign[index - width],
          row + 1 < height && coefficentsMagnitude[index + width],
          coefficentsSign[index + width]);

        var contextLabelAndXor = SignContextLabels[
          3 * (1 - horizontalContribution) + (1 - verticalContribution)];
        var contextLabel = contextLabelAndXor.contextLabel;
        var cx = this.contexts[contextLabel];
        var decoded = this.decoder.readBit(cx);
        return decoded ^ contextLabelAndXor.xorBit;
      },
      runMagnitudeRefinementPass:
        function BitModel_runMagnitudeRefinementPass() {
        var decoder = this.decoder;
        var width = this.width, height = this.height;
        var coefficentsMagnitude = this.coefficentsMagnitude;
        var neighborsSignificance = this.neighborsSignificance;
        var contexts = this.contexts;
        var bitsDecoded = this.bitsDecoded;
        var processingFlags = this.processingFlags;
        var processedMask = 1;
        var firstMagnitudeBitMask = 2;
        for (var i0 = 0; i0 < height; i0 += 4) {
          for (var j = 0; j < width; j++) {
            for (var i1 = 0; i1 < 4; i1++) {
              var i = i0 + i1;
              if (i >= height)
                break;
              var index = i * width + j;

              // significant but not those that have just become
              if (!coefficentsMagnitude[index] ||
                (processingFlags[index] & processedMask) !== 0)
                continue;

              var contextLabel = 16;
              if ((processingFlags[index] &
                firstMagnitudeBitMask) !== 0) {
                processingFlags[i * width + j] ^= firstMagnitudeBitMask;
                // first refinement
                var significance = neighborsSignificance[index];
                var sumOfSignificance = (significance & 3) +
                  ((significance >> 2) & 3) + ((significance >> 4) & 7);
                contextLabel = sumOfSignificance >= 1 ? 15 : 14;
              }

              var cx = contexts[contextLabel];
              var bit = decoder.readBit(cx);
              coefficentsMagnitude[index] =
                (coefficentsMagnitude[index] << 1) | bit;
              bitsDecoded[index]++;
              processingFlags[index] |= processedMask;
            }
          }
        }
      },
      runCleanupPass: function BitModel_runCleanupPass() {
        var decoder = this.decoder;
        var width = this.width, height = this.height;
        var neighborsSignificance = this.neighborsSignificance;
        var significanceState = this.significanceState;
        var coefficentsMagnitude = this.coefficentsMagnitude;
        var coefficentsSign = this.coefficentsSign;
        var contexts = this.contexts;
        var labels = this.contextLabelTable;
        var bitsDecoded = this.bitsDecoded;
        var processingFlags = this.processingFlags;
        var processedMask = 1;
        var firstMagnitudeBitMask = 2;
        var oneRowDown = width;
        var twoRowsDown = width * 2;
        var threeRowsDown = width * 3;
        for (var i0 = 0; i0 < height; i0 += 4) {
          for (var j = 0; j < width; j++) {
            var index0 = i0 * width + j;
            // using the property: labels[neighborsSignificance[index]] == 0
            // when neighborsSignificance[index] == 0
            var allEmpty = i0 + 3 < height &&
              processingFlags[index0] === 0 &&
              processingFlags[index0 + oneRowDown] === 0 &&
              processingFlags[index0 + twoRowsDown] === 0 &&
              processingFlags[index0 + threeRowsDown] === 0 &&
              neighborsSignificance[index0] === 0 &&
              neighborsSignificance[index0 + oneRowDown] === 0 &&
              neighborsSignificance[index0 + twoRowsDown] === 0 &&
              neighborsSignificance[index0 + threeRowsDown] === 0;
            var i1 = 0, index = index0;
            var cx, i;
            if (allEmpty) {
              cx = this.runLengthContext;
              var hasSignificantCoefficent = decoder.readBit(cx);
              if (!hasSignificantCoefficent) {
                bitsDecoded[index0]++;
                bitsDecoded[index0 + oneRowDown]++;
                bitsDecoded[index0 + twoRowsDown]++;
                bitsDecoded[index0 + threeRowsDown]++;
                continue; // next column
              }
              cx = this.uniformContext;
              i1 = (decoder.readBit(cx) << 1) | decoder.readBit(cx);
              i = i0 + i1;
              index += i1 * width;

              var sign = this.decodeSignBit(i, j);
              coefficentsSign[index] = sign;
              coefficentsMagnitude[index] = 1;
              this.setNeighborsSignificance(i, j);
              processingFlags[index] |= firstMagnitudeBitMask;

              index = index0;
              for (var i2 = i0; i2 <= i; i2++, index += width)
                bitsDecoded[index]++;

              i1++;
            }
            for (; i1 < 4; i1++, index += width) {
              i = i0 + i1;
              if (i >= height)
                break;

              if (coefficentsMagnitude[index] ||
                (processingFlags[index] & processedMask) !== 0)
                continue;

              var contextLabel = labels[neighborsSignificance[index]];
              cx = contexts[contextLabel];
              var decision = decoder.readBit(cx);
              if (decision == 1) {
                var sign = this.decodeSignBit(i, j);
                coefficentsSign[index] = sign;
                coefficentsMagnitude[index] = 1;
                this.setNeighborsSignificance(i, j);
                processingFlags[index] |= firstMagnitudeBitMask;
              }
              bitsDecoded[index]++;
            }
          }
        }
      },
      checkSegmentationSymbol: function BitModel_checkSegmentationSymbol() {
        var decoder = this.decoder;
        var cx = this.uniformContext;
        var symbol = (decoder.readBit(cx) << 3) | (decoder.readBit(cx) << 2) |
                     (decoder.readBit(cx) << 1) | decoder.readBit(cx);
        if (symbol != 0xA)
          throw 'Invalid segmentation symbol';
      }
    };

    return BitModel;
  })();

  // Section F, Discrete wavelet transofrmation
  var Transform = (function TransformClosure() {
    function Transform() {
    }
    Transform.prototype.calculate =
      function transformCalculate(subbands, u0, v0) {
      var ll = subbands[0];
      for (var i = 1, ii = subbands.length, j = 1; i < ii; i += 3, j++) {
        ll = this.iterate(ll, subbands[i], subbands[i + 1],
                          subbands[i + 2], u0, v0);
      }
      return ll;
    };
    Transform.prototype.expand = function expand(buffer, bufferPadding, step) {
        // Section F.3.7 extending... using max extension of 4
        var i1 = bufferPadding - 1, j1 = bufferPadding + 1;
        var i2 = bufferPadding + step - 2, j2 = bufferPadding + step;
        buffer[i1--] = buffer[j1++];
        buffer[j2++] = buffer[i2--];
        buffer[i1--] = buffer[j1++];
        buffer[j2++] = buffer[i2--];
        buffer[i1--] = buffer[j1++];
        buffer[j2++] = buffer[i2--];
        buffer[i1--] = buffer[j1++];
        buffer[j2++] = buffer[i2--];
    };
    Transform.prototype.iterate = function Transform_iterate(ll, hl, lh, hh,
                                                            u0, v0) {
      var llWidth = ll.width, llHeight = ll.height, llItems = ll.items;
      var hlWidth = hl.width, hlHeight = hl.height, hlItems = hl.items;
      var lhWidth = lh.width, lhHeight = lh.height, lhItems = lh.items;
      var hhWidth = hh.width, hhHeight = hh.height, hhItems = hh.items;

      // Section F.3.3 interleave
      var width = llWidth + hlWidth;
      var height = llHeight + lhHeight;
      var items = new Float32Array(width * height);
      for (var i = 0, ii = llHeight; i < ii; i++) {
        var k = i * llWidth, l = i * 2 * width;
        for (var j = 0, jj = llWidth; j < jj; j++, k++, l += 2)
          items[l] = llItems[k];
      }
      for (var i = 0, ii = hlHeight; i < ii; i++) {
        var k = i * hlWidth, l = i * 2 * width + 1;
        for (var j = 0, jj = hlWidth; j < jj; j++, k++, l += 2)
          items[l] = hlItems[k];
      }
      for (var i = 0, ii = lhHeight; i < ii; i++) {
        var k = i * lhWidth, l = (i * 2 + 1) * width;
        for (var j = 0, jj = lhWidth; j < jj; j++, k++, l += 2)
          items[l] = lhItems[k];
      }
      for (var i = 0, ii = hhHeight; i < ii; i++) {
        var k = i * hhWidth, l = (i * 2 + 1) * width + 1;
        for (var j = 0, jj = hhWidth; j < jj; j++, k++, l += 2)
          items[l] = hhItems[k];
      }

      var bufferPadding = 4;
      var bufferLength = new Float32Array(Math.max(width, height) +
        2 * bufferPadding);
      var buffer = new Float32Array(bufferLength);
      var bufferOut = new Float32Array(bufferLength);

      // Section F.3.4 HOR_SR
      for (var v = 0; v < height; v++) {
        if (width == 1) {
          // if width = 1, when u0 even keep items as is, when odd divide by 2
          if ((u0 % 1) !== 0) {
            items[v * width] /= 2;
          }
          continue;
        }

        var k = v * width;
        var l = bufferPadding;
        for (var u = 0; u < width; u++, k++, l++)
          buffer[l] = items[k];

        this.expand(buffer, bufferPadding, width);
        this.filter(buffer, bufferPadding, width, u0, bufferOut);

        k = v * width;
        l = bufferPadding;
        for (var u = 0; u < width; u++, k++, l++)
          items[k] = bufferOut[l];
      }

      // Section F.3.5 VER_SR
      for (var u = 0; u < width; u++) {
        if (height == 1) {
          // if height = 1, when v0 even keep items as is, when odd divide by 2
          if ((v0 % 1) !== 0) {
            items[u] /= 2;
          }
          continue;
        }

        var k = u;
        var l = bufferPadding;
        for (var v = 0; v < height; v++, k += width, l++)
          buffer[l] = items[k];

        this.expand(buffer, bufferPadding, height);
        this.filter(buffer, bufferPadding, height, v0, bufferOut);

        k = u;
        l = bufferPadding;
        for (var v = 0; v < height; v++, k += width, l++)
          items[k] = bufferOut[l];
      }
      return {
        width: width,
        height: height,
        items: items
      };
    };
    return Transform;
  })();

  // Section 3.8.2 Irreversible 9-7 filter
  var IrreversibleTransform = (function IrreversibleTransformClosure() {
    function IrreversibleTransform() {
      Transform.call(this);
    }

    IrreversibleTransform.prototype = Object.create(Transform.prototype);
    IrreversibleTransform.prototype.filter =
      function irreversibleTransformFilter(y, offset, length, i0, x) {
      var i0_ = Math.floor(i0 / 2);
      var i1_ = Math.floor((i0 + length) / 2);
      var offset_ = offset - (i0 % 1);

      var alpha = -1.586134342059924;
      var beta = -0.052980118572961;
      var gamma = 0.882911075530934;
      var delta = 0.443506852043971;
      var K = 1.230174104914001;
      var K_ = 1 / K;

      // step 1
      var j = offset_ - 2;
      for (var n = i0_ - 1, nn = i1_ + 2; n < nn; n++, j += 2)
        x[j] = K * y[j];

      // step 2
      var j = offset_ - 3;
      for (var n = i0_ - 2, nn = i1_ + 2; n < nn; n++, j += 2)
        x[j] = K_ * y[j];

      // step 3
      var j = offset_ - 2;
      for (var n = i0_ - 1, nn = i1_ + 2; n < nn; n++, j += 2)
        x[j] -= delta * (x[j - 1] + x[j + 1]);

      // step 4
      var j = offset_ - 1;
      for (var n = i0_ - 1, nn = i1_ + 1; n < nn; n++, j += 2)
        x[j] -= gamma * (x[j - 1] + x[j + 1]);

      // step 5
      var j = offset_;
      for (var n = i0_, nn = i1_ + 1; n < nn; n++, j += 2)
        x[j] -= beta * (x[j - 1] + x[j + 1]);

      // step 6
      var j = offset_ + 1;
      for (var n = i0_, nn = i1_; n < nn; n++, j += 2)
        x[j] -= alpha * (x[j - 1] + x[j + 1]);
    };

    return IrreversibleTransform;
  })();

  // Section 3.8.1 Reversible 5-3 filter
  var ReversibleTransform = (function ReversibleTransformClosure() {
    function ReversibleTransform() {
      Transform.call(this);
    }

    ReversibleTransform.prototype = Object.create(Transform.prototype);
    ReversibleTransform.prototype.filter =
      function reversibleTransformFilter(y, offset, length, i0, x) {
      var i0_ = Math.floor(i0 / 2);
      var i1_ = Math.floor((i0 + length) / 2);
      var offset_ = offset - (i0 % 1);

      for (var n = i0_, nn = i1_ + 1, j = offset_; n < nn; n++, j += 2)
        x[j] = y[j] - Math.floor((y[j - 1] + y[j + 1] + 2) / 4);

      for (var n = i0_, nn = i1_, j = offset_ + 1; n < nn; n++, j += 2)
        x[j] = y[j] + Math.floor((x[j - 1] + x[j + 1]) / 2);
    };

    return ReversibleTransform;
  })();


  })();

  /**
   * For JPEG 2000's we use a library to decode these images and
   * the stream behaves like all the other DecodeStreams.
   */

    var JpxStream = DecodeStream.inherit({
        klassName : "JpxStream",

        init : function(bytes, dict) {
          this.dict = dict;
          this.bytes = bytes;

            this.overrided();          
        },
      ensureBuffer : function(req) {
          if (this.bufferLength)
              return;

          var jpxImage = new JpxImage();
          jpxImage.parse(this.bytes);

          var width = jpxImage.width;
          var height = jpxImage.height;
          var componentsCount = jpxImage.componentsCount;
          if (componentsCount != 1 && componentsCount != 3 && componentsCount != 4)
              error('JPX with ' + componentsCount + ' components is not supported');

          var data = new Uint8Array(width * height * componentsCount);

          for (var k = 0, kk = jpxImage.tiles.length; k < kk; k++) {
              var tileCompoments = jpxImage.tiles[k];
              var tileWidth = tileCompoments[0].width;
              var tileHeight = tileCompoments[0].height;
              var tileLeft = tileCompoments[0].left;
              var tileTop = tileCompoments[0].top;

              var dataPosition, sourcePosition, data0, data1, data2, data3, rowFeed;
              switch (componentsCount) {
                  case 1:
                      data0 = tileCompoments[0].items;

                      dataPosition = width * tileTop + tileLeft;
                      rowFeed = width - tileWidth;
                      sourcePosition = 0;
                      for (var j = 0; j < tileHeight; j++) {
                          for (var i = 0; i < tileWidth; i++)
                              data[dataPosition++] = data0[sourcePosition++];
                          dataPosition += rowFeed;
                      }
                      break;
                  case 3:
                      data0 = tileCompoments[0].items;
                      data1 = tileCompoments[1].items;
                      data2 = tileCompoments[2].items;

                      dataPosition = (width * tileTop + tileLeft) * 3;
                      rowFeed = (width - tileWidth) * 3;
                      sourcePosition = 0;
                      for (var j = 0; j < tileHeight; j++) {
                          for (var i = 0; i < tileWidth; i++) {
                              data[dataPosition++] = data0[sourcePosition];
                              data[dataPosition++] = data1[sourcePosition];
                              data[dataPosition++] = data2[sourcePosition];
                              sourcePosition++;
                          }
                          dataPosition += rowFeed;
                      }
                      break;
                  case 4:
                      data0 = tileCompoments[0].items;
                      data1 = tileCompoments[1].items;
                      data2 = tileCompoments[2].items;
                      data3 = tileCompoments[3].items;

                      dataPosition = (width * tileTop + tileLeft) * 4;
                      rowFeed = (width - tileWidth) * 4;
                      sourcePosition = 0;
                      for (var j = 0; j < tileHeight; j++) {
                          for (var i = 0; i < tileWidth; i++) {
                              data[dataPosition++] = data0[sourcePosition];
                              data[dataPosition++] = data1[sourcePosition];
                              data[dataPosition++] = data2[sourcePosition];
                              data[dataPosition++] = data3[sourcePosition];
                              sourcePosition++;
                          }
                          dataPosition += rowFeed;
                      }
                      break;
              }
          }

          this.buffer = data;
          this.bufferLength = data.length;
      },

      getChar : function JpxStream_getChar() {
          error('internal error: getChar is not valid on JpxStream');
      }
    });

  return codec.jpx = {
    "JpxImage" :JpxImage,
    "JpxStream" : JpxStream
  };
  
});

define('skylark-utils-codec/main',[
    "./codec",
    "./base64",
    "./jbig2",
    "./jpeg",
    "./jpx",
], function(codec) {

	return codec;
});
define('skylark-utils-codec', ['skylark-utils-codec/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-utils-codec.js.map
