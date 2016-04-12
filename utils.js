var crypto = require("crypto");
var zlib = require("zlib");

function md5sum(data) {
  var hasher = crypto.createHash("md5");

  hasher.update(data);
  return hasher.digest("hex");
}


function addProps(srcObj, dstObj) {
  var prop = null;

  for (prop in srcObj) {
    if (srcObj.hasOwnProperty(prop) && prop[0] !== "_") {
      dstObj[prop] = srcObj[prop];
    }
  }
}


function isGzip(buf) {
  return (
    buf
    && buf.length >= 3
    && buf[0] === 0x1f
    && buf[1] === 0x8b
    && buf[2] === 0x08
  );
}

function thaw(obj) {
  if (isGzip(obj)) {
    obj = zlib.gunzipSync(obj);
  }
  // A buffer would also be an object, this seems safer?
  if (obj[0] === "[" || obj[0] === "{") {
    obj = JSON.parse(obj);
  }
  return obj;
}


module.exports = {
  md5sum  : md5sum,
  addProps: addProps,
  isGzip  : isGzip,
  thaw    : thaw
};
