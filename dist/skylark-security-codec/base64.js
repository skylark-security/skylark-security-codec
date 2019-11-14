/**
 * skylark-security-codec - The codec features enhancement for skylark utils.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["skylark-langx/langx","./codec"],function(r,h){var n=function(){return n},u="=",a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";return n.encode=function(r){for(var h=[],n=r.length,e=n%3,t=n-e,s=0;s<t;){var c=r[s++]<<16|r[s++]<<8|r[s++];h.push(a.charAt(c>>>18&63)),h.push(a.charAt(c>>>12&63)),h.push(a.charAt(c>>>6&63)),h.push(a.charAt(63&c))}switch(e){case 2:c=r[s++]<<16|r[s++]<<8;h.push(a.charAt(c>>>18&63)),h.push(a.charAt(c>>>12&63)),h.push(a.charAt(c>>>6&63)),h.push(u);break;case 1:c=r[s++]<<16;h.push(a.charAt(c>>>18&63)),h.push(a.charAt(c>>>12&63)),h.push(u),h.push(u)}return h.join("")},n.decode=function(r){for(var h=r.split(""),n=[],e=h.length;h[--e]==u;);for(var t=0;t<e;){var s=a.indexOf(h[t++])<<18;t<=e&&(s|=a.indexOf(h[t++])<<12),t<=e&&(s|=a.indexOf(h[t++])<<6),t<=e&&(s|=a.indexOf(h[t++])),n.push(s>>>16&255),n.push(s>>>8&255),n.push(255&s)}for(;0==n[n.length-1];)n.pop();return n},h.base64=n});
//# sourceMappingURL=sourcemaps/base64.js.map
