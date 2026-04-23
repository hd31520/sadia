import{r as e,t}from"./chunk-CilyBKbf.js";var n=t(((e,t)=>{t.exports=function(){return typeof Promise==`function`&&Promise.prototype&&Promise.prototype.then}})),r=t((e=>{var t,n=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];e.getSymbolSize=function(e){if(!e)throw Error(`"version" cannot be null or undefined`);if(e<1||e>40)throw Error(`"version" should be in range from 1 to 40`);return e*4+17},e.getSymbolTotalCodewords=function(e){return n[e]},e.getBCHDigit=function(e){let t=0;for(;e!==0;)t++,e>>>=1;return t},e.setToSJISFunction=function(e){if(typeof e!=`function`)throw Error(`"toSJISFunc" is not a valid function.`);t=e},e.isKanjiModeEnabled=function(){return t!==void 0},e.toSJIS=function(e){return t(e)}})),i=t((e=>{e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2};function t(t){if(typeof t!=`string`)throw Error(`Param is not a string`);switch(t.toLowerCase()){case`l`:case`low`:return e.L;case`m`:case`medium`:return e.M;case`q`:case`quartile`:return e.Q;case`h`:case`high`:return e.H;default:throw Error(`Unknown EC Level: `+t)}}e.isValid=function(e){return e&&e.bit!==void 0&&e.bit>=0&&e.bit<4},e.from=function(n,r){if(e.isValid(n))return n;try{return t(n)}catch{return r}}})),a=t(((e,t)=>{function n(){this.buffer=[],this.length=0}n.prototype={get:function(e){let t=Math.floor(e/8);return(this.buffer[t]>>>7-e%8&1)==1},put:function(e,t){for(let n=0;n<t;n++)this.putBit((e>>>t-n-1&1)==1)},getLengthInBits:function(){return this.length},putBit:function(e){let t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),e&&(this.buffer[t]|=128>>>this.length%8),this.length++}},t.exports=n})),o=t(((e,t)=>{function n(e){if(!e||e<1)throw Error(`BitMatrix size must be defined and greater than 0`);this.size=e,this.data=new Uint8Array(e*e),this.reservedBit=new Uint8Array(e*e)}n.prototype.set=function(e,t,n,r){let i=e*this.size+t;this.data[i]=n,r&&(this.reservedBit[i]=!0)},n.prototype.get=function(e,t){return this.data[e*this.size+t]},n.prototype.xor=function(e,t,n){this.data[e*this.size+t]^=n},n.prototype.isReserved=function(e,t){return this.reservedBit[e*this.size+t]},t.exports=n})),s=t((e=>{var t=r().getSymbolSize;e.getRowColCoords=function(e){if(e===1)return[];let n=Math.floor(e/7)+2,r=t(e),i=r===145?26:Math.ceil((r-13)/(2*n-2))*2,a=[r-7];for(let e=1;e<n-1;e++)a[e]=a[e-1]-i;return a.push(6),a.reverse()},e.getPositions=function(t){let n=[],r=e.getRowColCoords(t),i=r.length;for(let e=0;e<i;e++)for(let t=0;t<i;t++)e===0&&t===0||e===0&&t===i-1||e===i-1&&t===0||n.push([r[e],r[t]]);return n}})),c=t((e=>{var t=r().getSymbolSize,n=7;e.getPositions=function(e){let r=t(e);return[[0,0],[r-n,0],[0,r-n]]}})),l=t((e=>{e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var t={N1:3,N2:3,N3:40,N4:10};e.isValid=function(e){return e!=null&&e!==``&&!isNaN(e)&&e>=0&&e<=7},e.from=function(t){return e.isValid(t)?parseInt(t,10):void 0},e.getPenaltyN1=function(e){let n=e.size,r=0,i=0,a=0,o=null,s=null;for(let c=0;c<n;c++){i=a=0,o=s=null;for(let l=0;l<n;l++){let n=e.get(c,l);n===o?i++:(i>=5&&(r+=t.N1+(i-5)),o=n,i=1),n=e.get(l,c),n===s?a++:(a>=5&&(r+=t.N1+(a-5)),s=n,a=1)}i>=5&&(r+=t.N1+(i-5)),a>=5&&(r+=t.N1+(a-5))}return r},e.getPenaltyN2=function(e){let n=e.size,r=0;for(let t=0;t<n-1;t++)for(let i=0;i<n-1;i++){let n=e.get(t,i)+e.get(t,i+1)+e.get(t+1,i)+e.get(t+1,i+1);(n===4||n===0)&&r++}return r*t.N2},e.getPenaltyN3=function(e){let n=e.size,r=0,i=0,a=0;for(let t=0;t<n;t++){i=a=0;for(let o=0;o<n;o++)i=i<<1&2047|e.get(t,o),o>=10&&(i===1488||i===93)&&r++,a=a<<1&2047|e.get(o,t),o>=10&&(a===1488||a===93)&&r++}return r*t.N3},e.getPenaltyN4=function(e){let n=0,r=e.data.length;for(let t=0;t<r;t++)n+=e.data[t];return Math.abs(Math.ceil(n*100/r/5)-10)*t.N4};function n(t,n,r){switch(t){case e.Patterns.PATTERN000:return(n+r)%2==0;case e.Patterns.PATTERN001:return n%2==0;case e.Patterns.PATTERN010:return r%3==0;case e.Patterns.PATTERN011:return(n+r)%3==0;case e.Patterns.PATTERN100:return(Math.floor(n/2)+Math.floor(r/3))%2==0;case e.Patterns.PATTERN101:return n*r%2+n*r%3==0;case e.Patterns.PATTERN110:return(n*r%2+n*r%3)%2==0;case e.Patterns.PATTERN111:return(n*r%3+(n+r)%2)%2==0;default:throw Error(`bad maskPattern:`+t)}}e.applyMask=function(e,t){let r=t.size;for(let i=0;i<r;i++)for(let a=0;a<r;a++)t.isReserved(a,i)||t.xor(a,i,n(e,a,i))},e.getBestMask=function(t,n){let r=Object.keys(e.Patterns).length,i=0,a=1/0;for(let o=0;o<r;o++){n(o),e.applyMask(o,t);let r=e.getPenaltyN1(t)+e.getPenaltyN2(t)+e.getPenaltyN3(t)+e.getPenaltyN4(t);e.applyMask(o,t),r<a&&(a=r,i=o)}return i}})),u=t((e=>{var t=i(),n=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],r=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];e.getBlocksCount=function(e,r){switch(r){case t.L:return n[(e-1)*4+0];case t.M:return n[(e-1)*4+1];case t.Q:return n[(e-1)*4+2];case t.H:return n[(e-1)*4+3];default:return}},e.getTotalCodewordsCount=function(e,n){switch(n){case t.L:return r[(e-1)*4+0];case t.M:return r[(e-1)*4+1];case t.Q:return r[(e-1)*4+2];case t.H:return r[(e-1)*4+3];default:return}}})),d=t((e=>{var t=new Uint8Array(512),n=new Uint8Array(256);(function(){let e=1;for(let r=0;r<255;r++)t[r]=e,n[e]=r,e<<=1,e&256&&(e^=285);for(let e=255;e<512;e++)t[e]=t[e-255]})(),e.log=function(e){if(e<1)throw Error(`log(`+e+`)`);return n[e]},e.exp=function(e){return t[e]},e.mul=function(e,r){return e===0||r===0?0:t[n[e]+n[r]]}})),f=t((e=>{var t=d();e.mul=function(e,n){let r=new Uint8Array(e.length+n.length-1);for(let i=0;i<e.length;i++)for(let a=0;a<n.length;a++)r[i+a]^=t.mul(e[i],n[a]);return r},e.mod=function(e,n){let r=new Uint8Array(e);for(;r.length-n.length>=0;){let e=r[0];for(let i=0;i<n.length;i++)r[i]^=t.mul(n[i],e);let i=0;for(;i<r.length&&r[i]===0;)i++;r=r.slice(i)}return r},e.generateECPolynomial=function(n){let r=new Uint8Array([1]);for(let i=0;i<n;i++)r=e.mul(r,new Uint8Array([1,t.exp(i)]));return r}})),p=t(((e,t)=>{var n=f();function r(e){this.genPoly=void 0,this.degree=e,this.degree&&this.initialize(this.degree)}r.prototype.initialize=function(e){this.degree=e,this.genPoly=n.generateECPolynomial(this.degree)},r.prototype.encode=function(e){if(!this.genPoly)throw Error(`Encoder not initialized`);let t=new Uint8Array(e.length+this.degree);t.set(e);let r=n.mod(t,this.genPoly),i=this.degree-r.length;if(i>0){let e=new Uint8Array(this.degree);return e.set(r,i),e}return r},t.exports=r})),m=t((e=>{e.isValid=function(e){return!isNaN(e)&&e>=1&&e<=40}})),h=t((e=>{var t=`[0-9]+`,n=`[A-Z $%*+\\-./:]+`,r=`(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+`;r=r.replace(/u/g,`\\u`);var i=`(?:(?![A-Z0-9 $%*+\\-./:]|`+r+`)(?:.|[\r
]))+`;e.KANJI=new RegExp(r,`g`),e.BYTE_KANJI=RegExp(`[^A-Z0-9 $%*+\\-./:]+`,`g`),e.BYTE=new RegExp(i,`g`),e.NUMERIC=new RegExp(t,`g`),e.ALPHANUMERIC=new RegExp(n,`g`);var a=RegExp(`^`+r+`$`),o=RegExp(`^`+t+`$`),s=RegExp(`^[A-Z0-9 $%*+\\-./:]+$`);e.testKanji=function(e){return a.test(e)},e.testNumeric=function(e){return o.test(e)},e.testAlphanumeric=function(e){return s.test(e)}})),g=t((e=>{var t=m(),n=h();e.NUMERIC={id:`Numeric`,bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:`Alphanumeric`,bit:2,ccBits:[9,11,13]},e.BYTE={id:`Byte`,bit:4,ccBits:[8,16,16]},e.KANJI={id:`Kanji`,bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(e,n){if(!e.ccBits)throw Error(`Invalid mode: `+e);if(!t.isValid(n))throw Error(`Invalid version: `+n);return n>=1&&n<10?e.ccBits[0]:n<27?e.ccBits[1]:e.ccBits[2]},e.getBestModeForData=function(t){return n.testNumeric(t)?e.NUMERIC:n.testAlphanumeric(t)?e.ALPHANUMERIC:n.testKanji(t)?e.KANJI:e.BYTE},e.toString=function(e){if(e&&e.id)return e.id;throw Error(`Invalid mode`)},e.isValid=function(e){return e&&e.bit&&e.ccBits};function r(t){if(typeof t!=`string`)throw Error(`Param is not a string`);switch(t.toLowerCase()){case`numeric`:return e.NUMERIC;case`alphanumeric`:return e.ALPHANUMERIC;case`kanji`:return e.KANJI;case`byte`:return e.BYTE;default:throw Error(`Unknown mode: `+t)}}e.from=function(t,n){if(e.isValid(t))return t;try{return r(t)}catch{return n}}})),_=t((e=>{var t=r(),n=u(),a=i(),o=g(),s=m(),c=7973,l=t.getBCHDigit(c);function d(t,n,r){for(let i=1;i<=40;i++)if(n<=e.getCapacity(i,r,t))return i}function f(e,t){return o.getCharCountIndicator(e,t)+4}function p(e,t){let n=0;return e.forEach(function(e){let r=f(e.mode,t);n+=r+e.getBitsLength()}),n}function h(t,n){for(let r=1;r<=40;r++)if(p(t,r)<=e.getCapacity(r,n,o.MIXED))return r}e.from=function(e,t){return s.isValid(e)?parseInt(e,10):t},e.getCapacity=function(e,r,i){if(!s.isValid(e))throw Error(`Invalid QR Code version`);i===void 0&&(i=o.BYTE);let a=(t.getSymbolTotalCodewords(e)-n.getTotalCodewordsCount(e,r))*8;if(i===o.MIXED)return a;let c=a-f(i,e);switch(i){case o.NUMERIC:return Math.floor(c/10*3);case o.ALPHANUMERIC:return Math.floor(c/11*2);case o.KANJI:return Math.floor(c/13);case o.BYTE:default:return Math.floor(c/8)}},e.getBestVersionForData=function(e,t){let n,r=a.from(t,a.M);if(Array.isArray(e)){if(e.length>1)return h(e,r);if(e.length===0)return 1;n=e[0]}else n=e;return d(n.mode,n.getLength(),r)},e.getEncodedBits=function(e){if(!s.isValid(e)||e<7)throw Error(`Invalid QR Code version`);let n=e<<12;for(;t.getBCHDigit(n)-l>=0;)n^=c<<t.getBCHDigit(n)-l;return e<<12|n}})),v=t((e=>{var t=r(),n=1335,i=21522,a=t.getBCHDigit(n);e.getEncodedBits=function(e,r){let o=e.bit<<3|r,s=o<<10;for(;t.getBCHDigit(s)-a>=0;)s^=n<<t.getBCHDigit(s)-a;return(o<<10|s)^i}})),y=t(((e,t)=>{var n=g();function r(e){this.mode=n.NUMERIC,this.data=e.toString()}r.getBitsLength=function(e){return 10*Math.floor(e/3)+(e%3?e%3*3+1:0)},r.prototype.getLength=function(){return this.data.length},r.prototype.getBitsLength=function(){return r.getBitsLength(this.data.length)},r.prototype.write=function(e){let t,n,r;for(t=0;t+3<=this.data.length;t+=3)n=this.data.substr(t,3),r=parseInt(n,10),e.put(r,10);let i=this.data.length-t;i>0&&(n=this.data.substr(t),r=parseInt(n,10),e.put(r,i*3+1))},t.exports=r})),b=t(((e,t)=>{var n=g(),r=`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:`.split(``);function i(e){this.mode=n.ALPHANUMERIC,this.data=e}i.getBitsLength=function(e){return 11*Math.floor(e/2)+e%2*6},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(e){let t;for(t=0;t+2<=this.data.length;t+=2){let n=r.indexOf(this.data[t])*45;n+=r.indexOf(this.data[t+1]),e.put(n,11)}this.data.length%2&&e.put(r.indexOf(this.data[t]),6)},t.exports=i})),x=t(((e,t)=>{var n=g();function r(e){this.mode=n.BYTE,typeof e==`string`?this.data=new TextEncoder().encode(e):this.data=new Uint8Array(e)}r.getBitsLength=function(e){return e*8},r.prototype.getLength=function(){return this.data.length},r.prototype.getBitsLength=function(){return r.getBitsLength(this.data.length)},r.prototype.write=function(e){for(let t=0,n=this.data.length;t<n;t++)e.put(this.data[t],8)},t.exports=r})),S=t(((e,t)=>{var n=g(),i=r();function a(e){this.mode=n.KANJI,this.data=e}a.getBitsLength=function(e){return e*13},a.prototype.getLength=function(){return this.data.length},a.prototype.getBitsLength=function(){return a.getBitsLength(this.data.length)},a.prototype.write=function(e){let t;for(t=0;t<this.data.length;t++){let n=i.toSJIS(this.data[t]);if(n>=33088&&n<=40956)n-=33088;else if(n>=57408&&n<=60351)n-=49472;else throw Error(`Invalid SJIS character: `+this.data[t]+`
Make sure your charset is UTF-8`);n=(n>>>8&255)*192+(n&255),e.put(n,13)}},t.exports=a})),C=t(((e,t)=>{var n={single_source_shortest_paths:function(e,t,r){var i={},a={};a[t]=0;var o=n.PriorityQueue.make();o.push(t,0);for(var s,c,l,u,d,f,p,m,h;!o.empty();)for(l in s=o.pop(),c=s.value,u=s.cost,d=e[c]||{},d)d.hasOwnProperty(l)&&(f=d[l],p=u+f,m=a[l],h=a[l]===void 0,(h||m>p)&&(a[l]=p,o.push(l,p),i[l]=c));if(r!==void 0&&a[r]===void 0){var g=[`Could not find a path from `,t,` to `,r,`.`].join(``);throw Error(g)}return i},extract_shortest_path_from_predecessor_list:function(e,t){for(var n=[],r=t;r;)n.push(r),e[r],r=e[r];return n.reverse(),n},find_path:function(e,t,r){var i=n.single_source_shortest_paths(e,t,r);return n.extract_shortest_path_from_predecessor_list(i,r)},PriorityQueue:{make:function(e){var t=n.PriorityQueue,r={},i;for(i in e||={},t)t.hasOwnProperty(i)&&(r[i]=t[i]);return r.queue=[],r.sorter=e.sorter||t.default_sorter,r},default_sorter:function(e,t){return e.cost-t.cost},push:function(e,t){var n={value:e,cost:t};this.queue.push(n),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};t!==void 0&&(t.exports=n)})),w=t((e=>{var t=g(),n=y(),i=b(),a=x(),o=S(),s=h(),c=r(),l=C();function u(e){return unescape(encodeURIComponent(e)).length}function d(e,t,n){let r=[],i;for(;(i=e.exec(n))!==null;)r.push({data:i[0],index:i.index,mode:t,length:i[0].length});return r}function f(e){let n=d(s.NUMERIC,t.NUMERIC,e),r=d(s.ALPHANUMERIC,t.ALPHANUMERIC,e),i,a;return c.isKanjiModeEnabled()?(i=d(s.BYTE,t.BYTE,e),a=d(s.KANJI,t.KANJI,e)):(i=d(s.BYTE_KANJI,t.BYTE,e),a=[]),n.concat(r,i,a).sort(function(e,t){return e.index-t.index}).map(function(e){return{data:e.data,mode:e.mode,length:e.length}})}function p(e,r){switch(r){case t.NUMERIC:return n.getBitsLength(e);case t.ALPHANUMERIC:return i.getBitsLength(e);case t.KANJI:return o.getBitsLength(e);case t.BYTE:return a.getBitsLength(e)}}function m(e){return e.reduce(function(e,t){let n=e.length-1>=0?e[e.length-1]:null;return n&&n.mode===t.mode?(e[e.length-1].data+=t.data,e):(e.push(t),e)},[])}function _(e){let n=[];for(let r=0;r<e.length;r++){let i=e[r];switch(i.mode){case t.NUMERIC:n.push([i,{data:i.data,mode:t.ALPHANUMERIC,length:i.length},{data:i.data,mode:t.BYTE,length:i.length}]);break;case t.ALPHANUMERIC:n.push([i,{data:i.data,mode:t.BYTE,length:i.length}]);break;case t.KANJI:n.push([i,{data:i.data,mode:t.BYTE,length:u(i.data)}]);break;case t.BYTE:n.push([{data:i.data,mode:t.BYTE,length:u(i.data)}])}}return n}function v(e,n){let r={},i={start:{}},a=[`start`];for(let o=0;o<e.length;o++){let s=e[o],c=[];for(let e=0;e<s.length;e++){let l=s[e],u=``+o+e;c.push(u),r[u]={node:l,lastCount:0},i[u]={};for(let e=0;e<a.length;e++){let o=a[e];r[o]&&r[o].node.mode===l.mode?(i[o][u]=p(r[o].lastCount+l.length,l.mode)-p(r[o].lastCount,l.mode),r[o].lastCount+=l.length):(r[o]&&(r[o].lastCount=l.length),i[o][u]=p(l.length,l.mode)+4+t.getCharCountIndicator(l.mode,n))}}a=c}for(let e=0;e<a.length;e++)i[a[e]].end=0;return{map:i,table:r}}function w(e,r){let s,l=t.getBestModeForData(e);if(s=t.from(r,l),s!==t.BYTE&&s.bit<l.bit)throw Error(`"`+e+`" cannot be encoded with mode `+t.toString(s)+`.
 Suggested mode is: `+t.toString(l));switch(s===t.KANJI&&!c.isKanjiModeEnabled()&&(s=t.BYTE),s){case t.NUMERIC:return new n(e);case t.ALPHANUMERIC:return new i(e);case t.KANJI:return new o(e);case t.BYTE:return new a(e)}}e.fromArray=function(e){return e.reduce(function(e,t){return typeof t==`string`?e.push(w(t,null)):t.data&&e.push(w(t.data,t.mode)),e},[])},e.fromString=function(t,n){let r=v(_(f(t,c.isKanjiModeEnabled())),n),i=l.find_path(r.map,`start`,`end`),a=[];for(let e=1;e<i.length-1;e++)a.push(r.table[i[e]].node);return e.fromArray(m(a))},e.rawSplit=function(t){return e.fromArray(f(t,c.isKanjiModeEnabled()))}})),T=t((e=>{var t=r(),n=i(),d=a(),f=o(),m=s(),h=c(),y=l(),b=u(),x=p(),S=_(),C=v(),T=g(),E=w();function D(e,t){let n=e.size,r=h.getPositions(t);for(let t=0;t<r.length;t++){let i=r[t][0],a=r[t][1];for(let t=-1;t<=7;t++)if(!(i+t<=-1||n<=i+t))for(let r=-1;r<=7;r++)a+r<=-1||n<=a+r||(t>=0&&t<=6&&(r===0||r===6)||r>=0&&r<=6&&(t===0||t===6)||t>=2&&t<=4&&r>=2&&r<=4?e.set(i+t,a+r,!0,!0):e.set(i+t,a+r,!1,!0))}}function O(e){let t=e.size;for(let n=8;n<t-8;n++){let t=n%2==0;e.set(n,6,t,!0),e.set(6,n,t,!0)}}function k(e,t){let n=m.getPositions(t);for(let t=0;t<n.length;t++){let r=n[t][0],i=n[t][1];for(let t=-2;t<=2;t++)for(let n=-2;n<=2;n++)t===-2||t===2||n===-2||n===2||t===0&&n===0?e.set(r+t,i+n,!0,!0):e.set(r+t,i+n,!1,!0)}}function A(e,t){let n=e.size,r=S.getEncodedBits(t),i,a,o;for(let t=0;t<18;t++)i=Math.floor(t/3),a=t%3+n-8-3,o=(r>>t&1)==1,e.set(i,a,o,!0),e.set(a,i,o,!0)}function j(e,t,n){let r=e.size,i=C.getEncodedBits(t,n),a,o;for(a=0;a<15;a++)o=(i>>a&1)==1,a<6?e.set(a,8,o,!0):a<8?e.set(a+1,8,o,!0):e.set(r-15+a,8,o,!0),a<8?e.set(8,r-a-1,o,!0):a<9?e.set(8,15-a-1+1,o,!0):e.set(8,15-a-1,o,!0);e.set(r-8,8,1,!0)}function M(e,t){let n=e.size,r=-1,i=n-1,a=7,o=0;for(let s=n-1;s>0;s-=2)for(s===6&&s--;;){for(let n=0;n<2;n++)if(!e.isReserved(i,s-n)){let r=!1;o<t.length&&(r=(t[o]>>>a&1)==1),e.set(i,s-n,r),a--,a===-1&&(o++,a=7)}if(i+=r,i<0||n<=i){i-=r,r=-r;break}}}function N(e,n,r){let i=new d;r.forEach(function(t){i.put(t.mode.bit,4),i.put(t.getLength(),T.getCharCountIndicator(t.mode,e)),t.write(i)});let a=(t.getSymbolTotalCodewords(e)-b.getTotalCodewordsCount(e,n))*8;for(i.getLengthInBits()+4<=a&&i.put(0,4);i.getLengthInBits()%8!=0;)i.putBit(0);let o=(a-i.getLengthInBits())/8;for(let e=0;e<o;e++)i.put(e%2?17:236,8);return P(i,e,n)}function P(e,n,r){let i=t.getSymbolTotalCodewords(n),a=i-b.getTotalCodewordsCount(n,r),o=b.getBlocksCount(n,r),s=o-i%o,c=Math.floor(i/o),l=Math.floor(a/o),u=l+1,d=c-l,f=new x(d),p=0,m=Array(o),h=Array(o),g=0,_=new Uint8Array(e.buffer);for(let e=0;e<o;e++){let t=e<s?l:u;m[e]=_.slice(p,p+t),h[e]=f.encode(m[e]),p+=t,g=Math.max(g,t)}let v=new Uint8Array(i),y=0,S,C;for(S=0;S<g;S++)for(C=0;C<o;C++)S<m[C].length&&(v[y++]=m[C][S]);for(S=0;S<d;S++)for(C=0;C<o;C++)v[y++]=h[C][S];return v}function F(e,n,r,i){let a;if(Array.isArray(e))a=E.fromArray(e);else if(typeof e==`string`){let t=n;if(!t){let n=E.rawSplit(e);t=S.getBestVersionForData(n,r)}a=E.fromString(e,t||40)}else throw Error(`Invalid data`);let o=S.getBestVersionForData(a,r);if(!o)throw Error(`The amount of data is too big to be stored in a QR Code`);if(!n)n=o;else if(n<o)throw Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+o+`.
`);let s=N(n,r,a),c=new f(t.getSymbolSize(n));return D(c,n),O(c),k(c,n),j(c,r,0),n>=7&&A(c,n),M(c,s),isNaN(i)&&(i=y.getBestMask(c,j.bind(null,c,r))),y.applyMask(i,c),j(c,r,i),{modules:c,version:n,errorCorrectionLevel:r,maskPattern:i,segments:a}}e.create=function(e,r){if(e===void 0||e===``)throw Error(`No input text`);let i=n.M,a,o;return r!==void 0&&(i=n.from(r.errorCorrectionLevel,n.M),a=S.from(r.version),o=y.from(r.maskPattern),r.toSJISFunc&&t.setToSJISFunction(r.toSJISFunc)),F(e,a,i,o)}})),E=t((e=>{function t(e){if(typeof e==`number`&&(e=e.toString()),typeof e!=`string`)throw Error(`Color should be defined as hex string`);let t=e.slice().replace(`#`,``).split(``);if(t.length<3||t.length===5||t.length>8)throw Error(`Invalid hex color: `+e);(t.length===3||t.length===4)&&(t=Array.prototype.concat.apply([],t.map(function(e){return[e,e]}))),t.length===6&&t.push(`F`,`F`);let n=parseInt(t.join(``),16);return{r:n>>24&255,g:n>>16&255,b:n>>8&255,a:n&255,hex:`#`+t.slice(0,6).join(``)}}e.getOptions=function(e){e||={},e.color||={};let n=e.margin===void 0||e.margin===null||e.margin<0?4:e.margin,r=e.width&&e.width>=21?e.width:void 0,i=e.scale||4;return{width:r,scale:r?4:i,margin:n,color:{dark:t(e.color.dark||`#000000ff`),light:t(e.color.light||`#ffffffff`)},type:e.type,rendererOpts:e.rendererOpts||{}}},e.getScale=function(e,t){return t.width&&t.width>=e+t.margin*2?t.width/(e+t.margin*2):t.scale},e.getImageWidth=function(t,n){let r=e.getScale(t,n);return Math.floor((t+n.margin*2)*r)},e.qrToImageData=function(t,n,r){let i=n.modules.size,a=n.modules.data,o=e.getScale(i,r),s=Math.floor((i+r.margin*2)*o),c=r.margin*o,l=[r.color.light,r.color.dark];for(let e=0;e<s;e++)for(let n=0;n<s;n++){let u=(e*s+n)*4,d=r.color.light;if(e>=c&&n>=c&&e<s-c&&n<s-c){let t=Math.floor((e-c)/o),r=Math.floor((n-c)/o);d=l[+!!a[t*i+r]]}t[u++]=d.r,t[u++]=d.g,t[u++]=d.b,t[u]=d.a}}})),D=t((e=>{var t=E();function n(e,t,n){e.clearRect(0,0,t.width,t.height),t.style||={},t.height=n,t.width=n,t.style.height=n+`px`,t.style.width=n+`px`}function r(){try{return document.createElement(`canvas`)}catch{throw Error(`You need to specify a canvas element`)}}e.render=function(e,i,a){let o=a,s=i;o===void 0&&(!i||!i.getContext)&&(o=i,i=void 0),i||(s=r()),o=t.getOptions(o);let c=t.getImageWidth(e.modules.size,o),l=s.getContext(`2d`),u=l.createImageData(c,c);return t.qrToImageData(u.data,e,o),n(l,s,c),l.putImageData(u,0,0),s},e.renderToDataURL=function(t,n,r){let i=r;i===void 0&&(!n||!n.getContext)&&(i=n,n=void 0),i||={};let a=e.render(t,n,i),o=i.type||`image/png`,s=i.rendererOpts||{};return a.toDataURL(o,s.quality)}})),O=t((e=>{var t=E();function n(e,t){let n=e.a/255,r=t+`="`+e.hex+`"`;return n<1?r+` `+t+`-opacity="`+n.toFixed(2).slice(1)+`"`:r}function r(e,t,n){let r=e+t;return n!==void 0&&(r+=` `+n),r}function i(e,t,n){let i=``,a=0,o=!1,s=0;for(let c=0;c<e.length;c++){let l=Math.floor(c%t),u=Math.floor(c/t);!l&&!o&&(o=!0),e[c]?(s++,c>0&&l>0&&e[c-1]||(i+=o?r(`M`,l+n,.5+u+n):r(`m`,a,0),a=0,o=!1),l+1<t&&e[c+1]||(i+=r(`h`,s),s=0)):a++}return i}e.render=function(e,r,a){let o=t.getOptions(r),s=e.modules.size,c=e.modules.data,l=s+o.margin*2,u=o.color.light.a?`<path `+n(o.color.light,`fill`)+` d="M0 0h`+l+`v`+l+`H0z"/>`:``,d=`<path `+n(o.color.dark,`stroke`)+` d="`+i(c,s,o.margin)+`"/>`,f=`viewBox="0 0 `+l+` `+l+`"`,p=`<svg xmlns="http://www.w3.org/2000/svg" `+(o.width?`width="`+o.width+`" height="`+o.width+`" `:``)+f+` shape-rendering="crispEdges">`+u+d+`</svg>
`;return typeof a==`function`&&a(null,p),p}})),k=e(t((e=>{var t=n(),r=T(),i=D(),a=O();function o(e,n,i,a,o){let s=[].slice.call(arguments,1),c=s.length,l=typeof s[c-1]==`function`;if(!l&&!t())throw Error(`Callback required as last argument`);if(l){if(c<2)throw Error(`Too few arguments provided`);c===2?(o=i,i=n,n=a=void 0):c===3&&(n.getContext&&o===void 0?(o=a,a=void 0):(o=a,a=i,i=n,n=void 0))}else{if(c<1)throw Error(`Too few arguments provided`);return c===1?(i=n,n=a=void 0):c===2&&!n.getContext&&(a=i,i=n,n=void 0),new Promise(function(t,o){try{t(e(r.create(i,a),n,a))}catch(e){o(e)}})}try{let t=r.create(i,a);o(null,e(t,n,a))}catch(e){o(e)}}e.create=r.create,e.toCanvas=o.bind(null,i.render),e.toDataURL=o.bind(null,i.renderToDataURL),e.toString=o.bind(null,function(e,t,n){return a.render(e,n)})}))(),1),A=[`০`,`১`,`২`,`৩`,`৪`,`৫`,`৬`,`৭`,`৮`,`৯`],j=new Intl.NumberFormat(`bn-BD`,{minimumFractionDigits:2,maximumFractionDigits:2}),M=new Intl.DateTimeFormat(`bn-BD`,{day:`2-digit`,month:`2-digit`,year:`numeric`}),N={name:`Your Company Name`,address:`Your Address`,proprietor:`Owner Name`,phone:`+8800000000000`},P={piece:`পিস`,pieces:`পিস`,pic:`পিস`,pics:`পিস`,pc:`পিস`,pcs:`পিস`,unit:`ইউনিট`,dozen:`ডজন`,set:`সেট`,kg:`কেজি`,gram:`গ্রাম`,litre:`লিটার`,liter:`লিটার`,ml:`এমএল`,foot:`ফুট`,feet:`ফুট`,inch:`ইঞ্চি`,box:`বক্স`,pair:`জোড়া`,packet:`প্যাকেট`,bundle:`বান্ডিল`,roll:`রোল`};function F(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function I(e){return F(e).replace(/\r?\n/g,`<br />`)}function L(e){return String(e??``).replace(/\d/g,e=>A[Number(e)]||e)}function R(e){return L(j.format(Number(e||0)))}function z(e){let t=new Date(e||Date.now());return Number.isNaN(t.getTime())?``:L(M.format(t))}function B(e){let t=String(e||``).trim().toLowerCase();return t?P[t]||L(e):`-`}function V(e,t){let n=[...e],r=Math.max(t-n.length,0);for(let e=0;e<r;e+=1)n.push({serial:``,quantity:``,description:``,measurement:``,rate:``,amount:``});return n}function H(e){return`
    <tr>
      <td class="memo-cell memo-cell-center memo-cell-serial">${F(e.serial||``)}</td>
      <td class="memo-cell memo-cell-center">${F(e.quantity||``)}</td>
      <td class="memo-cell memo-cell-description">${F(e.description||``)}</td>
      <td class="memo-cell memo-cell-center">${F(e.measurement||``)}</td>
      <td class="memo-cell memo-cell-right">${e.rate===``?``:R(e.rate)}</td>
      <td class="memo-cell memo-cell-right">${e.amount===``?``:R(e.amount)}</td>
    </tr>
  `}function U(e){return e.map(e=>`
        <div class="summary-card${e.highlight?` summary-card-highlight`:``}${e.emphasis?` summary-card-emphasis`:``}">
          <span>${F(e.label)}</span>
          <strong>${R(e.value)}</strong>
        </div>
      `).join(``)}function W(e){return e.filter(Boolean).map(e=>`<div>${F(e)}</div>`).join(``)}function G({browserTitle:e,title:t,memoNo:n,date:r,customerName:i,customerAddress:a,items:o,summaryRows:s,note:c,footerLines:l,leftSignatureLabel:u,rightSignatureLabel:d,qrDataUrl:f,qrCaption:p}){let m=V(o,15).map(H).join(``),h=U(s),g=W(l),_=c?I(c):``,v=s[0]?.value??0;return`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${F(e||`Memo`)}</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: A4 portrait; margin: 10mm; }
          body {
            margin: 0;
            background: #f2efe4;
            font-family: "Noto Serif Bengali", "Noto Sans Bengali", "SolaimanLipi", "Kalpurush", serif;
            color: #1f2937;
          }
          .sheet {
            width: 100%;
            max-width: 920px;
            margin: 0 auto;
            position: relative;
            overflow: hidden;
            border: 1px solid #7f96c8;
            background:
              radial-gradient(circle at 14% 18%, rgba(74, 141, 63, 0.08), transparent 26%),
              radial-gradient(circle at 86% 24%, rgba(76, 63, 146, 0.08), transparent 24%),
              radial-gradient(circle at 50% 70%, rgba(122, 45, 22, 0.07), transparent 26%),
              linear-gradient(180deg, #f6efb4 0%, #f8f2c7 100%);
          }
          .watermark {
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0.08;
            background-image:
              linear-gradient(45deg, rgba(76, 63, 146, 0.7) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(76, 63, 146, 0.7) 25%, transparent 25%);
            background-size: 160px 160px;
            background-position: 28px 40px, 96px 108px;
            mask-image: radial-gradient(circle at center, black 35%, transparent 78%);
          }
          .header {
            position: relative;
            padding: 16px 22px 12px;
            border-bottom: 2px solid #5d78b5;
            background: linear-gradient(180deg, rgba(227,208,109,0.9) 0%, rgba(247,239,197,0.72) 100%);
          }
          .bismillah {
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .memo-pill {
            display: inline-block;
            padding: 4px 20px;
            border-radius: 999px;
            background: #4a8d3f;
            color: #fff;
            font-size: 14px;
            font-weight: 700;
          }
          .memo-pill-wrap {
            text-align: center;
          }
          .company-name {
            margin-top: 8px;
            text-align: center;
            font-size: 33px;
            line-height: 1.18;
            font-weight: 700;
            color: #7a2d16;
            padding: 0 120px;
          }
          .proprietor {
            margin-top: 10px;
            text-align: center;
          }
          .proprietor span {
            display: inline-block;
            background: #333;
            color: #fff;
            padding: 5px 18px;
            border-radius: 999px;
            font-size: 15px;
            font-weight: 700;
          }
          .address-line {
            margin-top: 10px;
            text-align: center;
            font-size: 15px;
            line-height: 1.6;
            font-weight: 600;
            padding: 0 110px;
            color: #3f355b;
          }
          .phone-block {
            margin-top: 8px;
            text-align: center;
            font-size: 14px;
            font-weight: 700;
            color: #374151;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 96px 1fr 118px 1fr;
            border-bottom: 1px solid #6d86be;
          }
          .meta-label {
            background: #4c3f92;
            color: #fff;
            font-weight: 700;
            padding: 9px 12px;
            border-right: 1px solid #6d86be;
          }
          .meta-value {
            min-height: 42px;
            padding: 9px 14px;
            border-right: 1px solid #6d86be;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.04em;
          }
          .meta-value:last-child {
            border-right: 0;
            font-size: 16px;
            letter-spacing: 0;
            font-weight: 600;
          }
          .wide-meta {
            display: grid;
            grid-template-columns: 96px 1fr;
            border-bottom: 1px solid #6d86be;
          }
          .wide-meta-value {
            min-height: 42px;
            padding: 10px 14px;
            font-size: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            position: relative;
            z-index: 1;
          }
          thead tr {
            background: #43368e;
            color: #fff;
          }
          th {
            border: 1px solid #6d86be;
            padding: 9px 8px;
            font-size: 15px;
            font-weight: 700;
          }
          .memo-cell {
            height: 38px;
            border: 1px solid #6d86be;
            padding: 7px 8px;
            background: rgba(255,255,255,0.08);
            font-size: 15px;
          }
          .memo-cell-center {
            text-align: center;
          }
          .memo-cell-right {
            text-align: right;
          }
          .memo-cell-serial {
            width: 64px;
          }
          .memo-cell-description {
            width: 38%;
          }
          .summary-wrap {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 320px;
            gap: 14px;
            align-items: stretch;
            padding: 14px 18px 10px;
            border-top: 1px solid #6d86be;
          }
          .words-box {
            min-height: 88px;
            border: 1px solid rgba(109, 134, 190, 0.7);
            background: rgba(255,255,255,0.24);
            padding: 12px 14px;
          }
          .words-box strong {
            color: #4c3f92;
          }
          .summary-grid {
            display: grid;
            gap: 10px;
          }
          .summary-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            padding: 12px 14px;
            border: 1px solid rgba(109, 134, 190, 0.7);
            background: rgba(255,255,255,0.28);
            font-size: 15px;
            font-weight: 700;
          }
          .summary-card strong {
            font-size: 18px;
            color: #4c3f92;
          }
          .summary-card-highlight {
            background: rgba(76, 63, 146, 0.1);
          }
          .summary-card-emphasis strong {
            color: #9a3412;
          }
          .note-box {
            margin: 0 18px;
            padding: 12px 14px;
            border: 1px solid rgba(109, 134, 190, 0.7);
            background: rgba(255,255,255,0.2);
            font-size: 14px;
            line-height: 1.6;
          }
          .bottom-strip {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: flex-end;
            padding: 18px 18px 14px;
            min-height: 92px;
          }
          .footer-note {
            font-size: 14px;
            font-weight: 700;
            line-height: 1.7;
          }
          .qr-box {
            text-align: right;
          }
          .qr-box img {
            width: 88px;
            height: 88px;
            border: 1px solid rgba(109, 134, 190, 0.7);
            background: #fff;
            padding: 6px;
          }
          .qr-box div {
            margin-top: 6px;
            font-size: 12px;
            font-weight: 700;
          }
          .signature-row {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding: 16px 18px 22px;
            font-size: 14px;
            font-weight: 700;
          }
          .signature-row div {
            width: 220px;
            text-align: center;
            padding-top: 28px;
            border-top: 1px dashed #4b5563;
          }
          @media print {
            body {
              background: #fff;
            }
            .sheet {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="watermark"></div>

          <div class="header">
            <div class="bismillah">বিসমিল্লাহির রাহমানির রাহিম</div>
            <div class="memo-pill-wrap">
              <span class="memo-pill">${F(t)}</span>
            </div>
            <div class="company-name">${F(N.name)}</div>
            <div class="proprietor">
              <span>প্রোঃ ${F(N.proprietor)}</span>
            </div>
            <div class="address-line">${F(N.address)}</div>
            <div class="phone-block">মোবাইল: ${F(N.phone)}</div>
          </div>

          <div class="meta-grid">
            <div class="meta-label">নং</div>
            <div class="meta-value">${F(L(n||``))}</div>
            <div class="meta-label">তারিখ</div>
            <div class="meta-value">${F(z(r))}</div>
          </div>

          <div class="wide-meta">
            <div class="meta-label">নাম</div>
            <div class="wide-meta-value">${I(i||``)}</div>
          </div>

          <div class="wide-meta">
            <div class="meta-label">ঠিকানা</div>
            <div class="wide-meta-value">${I(a||``)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 64px;">নং</th>
                <th style="width: 92px;">সংখ্যা</th>
                <th>মালের বিবরণ</th>
                <th style="width: 120px;">পরিমাপ</th>
                <th style="width: 120px;">দর</th>
                <th style="width: 140px;">টাকা</th>
              </tr>
            </thead>
            <tbody>${m}</tbody>
          </table>

          <div class="summary-wrap">
            <div class="words-box">
              <strong>কথায় :</strong> ${R(v)} টাকা
            </div>
            <div class="summary-grid">${h}</div>
          </div>

          ${_?`<div class="note-box"><strong>নোট :</strong> ${_}</div>`:``}

          <div class="bottom-strip">
            <div class="footer-note">${g}</div>
            ${f?`
                  <div class="qr-box">
                    <img src="${f}" alt="Memo QR" />
                    <div>${F(p||``)}</div>
                  </div>
                `:``}
          </div>

          <div class="signature-row">
            <div>${F(u||`ক্রেতার স্বাক্ষর`)}</div>
            <div>${F(d||`বিক্রেতার স্বাক্ষর`)}</div>
          </div>
        </div>
      </body>
    </html>
  `}async function K(e){await new Promise(t=>{let n=Array.from(e.document.images||[]);if(!n.length){t();return}let r=0,i=()=>{r+=1,r>=n.length&&t()};n.forEach(e=>{if(e.complete){i();return}e.onload=i,e.onerror=i}),window.setTimeout(t,2e3)})}async function q(e){let t=e.qrText?await k.toDataURL(e.qrText,{width:140,margin:1,color:{dark:`#000000`,light:`#ffffff`}}):``,n=G({...e,qrDataUrl:t}),r=window.open(``,`_blank`,`width=980,height=820`);r&&(r.document.open(),r.document.write(n),r.document.close(),await K(r),window.setTimeout(()=>{r.focus(),r.print()},120))}function J(e=[]){return e.map((e,t)=>({serial:L(t+1),quantity:L(Number(e.quantity||0)),description:e.product?.name||e.product_name||`পণ্য`,measurement:B(e.product?.unit_type||e.unit_type),rate:Number(e.product?.price??e.unit_price??e.unitPrice??0),amount:Number(e.lineTotal??e.total_price??e.total??0)}))}function Y({serial:e=1,quantity:t=1,description:n=``,measurement:r=``,rate:i=0,amount:a=0}){return{serial:e===``?``:L(e),quantity:L(t),description:n,measurement:B(r),rate:Number(i||0),amount:Number(a||0)}}export{q as i,Y as n,R as r,J as t};