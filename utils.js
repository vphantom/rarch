/*! Name v1.0.1
 * <https://github.com/vphantom/rarch>
 * Copyright 2016 Stéphane Lavergne
 * Free software under MIT License: <https://opensource.org/licenses/MIT> */

'use strict';

var crypto = require('crypto');

/**
 * Compute MD5 checksum on a string or buffer
 *
 * @param {(Buffer|string)} data The data to checksum
 *
 * @return {string} Hex representation of the checksum
 */
function md5sum(data) {
  var hasher = crypto.createHash('md5');

  hasher.update(data);
  return hasher.digest('hex');
}

/**
 * Copy properties from one object to another
 *
 * @param {Object} srcObj Source
 * @param {Object} dstObj Destination
 *
 * @return {void}
 */
function addProps(srcObj, dstObj) {
  var prop = null;

  for (prop in srcObj) {
    if (srcObj.hasOwnProperty(prop) && prop[0] !== '_') {
      dstObj[prop] = srcObj[prop];
    }
  }
}

/**
 * Test if something is gzipped
 *
 * @param {(Buffer|string)} buf Data to examine
 *
 * @return {boolean} Whether it has the gzip header signature
 */
function isGzip(buf) {
  return (
    buf
    && buf.length >= 3
    && buf[0] === 0x1f
    && buf[1] === 0x8b
    && buf[2] === 0x08
  );
}


module.exports = {
  md5sum  : md5sum,
  addProps: addProps,
  isGzip  : isGzip
};
