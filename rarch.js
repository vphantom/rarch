/*! Name v1.0.1
 * <https://github.com/vphantom/rarch>
 * Copyright 2016 Stéphane Lavergne
 * Free software under MIT License: <https://opensource.org/licenses/MIT> */

'use strict';

var zlib = require('zlib');

var async = require('async');

var diffable = require('vcdiff');
var vcdiff = new diffable.Vcdiff();

var utils = require('./utils');

var rarch = {
  _packMethods: {
    string: packToJSON,
    gzip  : packToGzip,
    commit: packCommit,
    reset : packReset
  },
  _treeMethods: {
    string: packToJSON,
    gzip  : packToGzip
  },
  pack: makePack,
  tree: makeTree
};

/**
 * Reconstruct the data from a particular revision index
 *
 * @param {Array}    pack     The pack to process
 * @param {number}   i        Which revision to reconstruct
 * @param {Function} callback Node-style function(err,data)
 *
 * @return {undefined}
 */
function commitData(pack, i, callback) {
  'use strict';

  var j = 0;
  var data = '';
  var commit = this;

  if (typeof commit._data !== 'undefined') {
    callback(false, commit._data);
    return;
  }
  j = pack.length - 1;
  data = pack[j]._data;
  j--;
  async.whilst(
    function() {
      return (j >= i);
    },
    function(asyncCallback) {
      data = vcdiff.decode(data, pack[j]._diff);
      j--;
      setImmediate(asyncCallback);
    },
    function() {
      setImmediate(callback, false, data);
    }
  );
}

/**
 * String representation of a pack or tree
 *
 * This function was provided from day one for allowing the future possibility
 * of doing more processing than simply wrapping JSON.stringify().
 *
 * @param {Function} callback Node-style function(err,json)
 *
 * @return {string} JSON representation
 */
function packToJSON(callback) {
  'use strict';

  var pack = this;

  setImmediate(function() {
    callback(false, JSON.stringify(pack));
  });
  return;
}

/**
 * Gzipped version of a pack or tree
 *
 * @param {Function} callback Node-style function(err,gzip)
 *
 * @return {Buffer} Gzipped pack or tree
 */
function packToGzip(callback) {
  'use strict';

  var pack = this;

  setImmediate(function() {
    zlib.gzip(JSON.stringify(pack), callback);
  });
  return;
}

/**
 * Add a new revision to a pack
 *
 * @param {string} data       New revision to add
 * @param {Object} [metadata] Options and properties to tag along
 *
 * @return {Array} The pack that was acted upon (for chaining)
 */
function packCommit(data, metadata) {
  'use strict';

  var date = new Date();
  var versions = this.length;
  var head = this.pop();
  var commit = {
    _md5 : utils.md5sum(data),
    _data: data
  };

  if (typeof metadata === 'undefined') {
    metadata = {};
  }

  utils.addProps(metadata, commit);

  commit.data = commitData.bind(commit, this, versions);
  // Support Bluebird automatically if it's globally available
  if (typeof Promise.promisify === 'function') {
    commit.dataAsync = Promise
      .promisify(commitData)
      .bind(commit, this, versions)
    ;
  }

  if (typeof commit['timestamp'] !== 'number') {
    commit.timestamp = Math.floor(date.getTime() / 1000);
  }
  if (typeof head === 'object') {
    if (metadata['_skipUnchanged'] && commit._md5 === head._md5) {
      this.push(head);
      return this;
    }
    head._diff = vcdiff.encode(data, head._data);
    delete head._data;
    this.push(head);
  }
  this.push(commit);

  return this;
}

/**
 * Remove all revisions and add a new initial one to a pack
 *
 * @param {string} [data]     New revision to add
 * @param {Object} [metadata] Options and properties to tag along
 *
 * @return {Array} The pack that was acted upon (for chaining)
 */
function packReset(data, metadata) {
  'use strict';

  this.length = 0;
  if (typeof data !== 'undefined') {
    return this.commit(data, metadata);
  }
  return this;
}

/**
 * If necessary, decompress and JSON-parse an object
 *
 * @param {(Buffer|string|Array|Object)} obj      The object to thaw
 * @param {Function}                     callback Node-style function(err,obj)
 *
 * @return {(Array|Object)} The thawed object
 */
function thaw(obj, callback) {
  var deJSON = function(err, obj) {
    if (Buffer.isBuffer(obj)) {
      obj = obj.toString();
    }
    if (obj[0] === '[' || obj[0] === '{') {
      obj = JSON.parse(obj);
    }
    return setImmediate(callback, false, obj);
  };

  if (utils.isGzip(obj)) {
    return zlib.gunzip(obj, deJSON);
  }
  return deJSON(false, obj);
}

/**
 * Create or activate a pack
 *
 * @param {(Array|string|Buffer)} [pack]   Existing pack or pack data
 * @param {Function}              callback Node-style function(err,obj)
 *
 * @return {Array} The activated pack
 */
function makePack(pack, callback) {
  setImmediate(function() {
    if (typeof pack === 'undefined' || pack === null) {
      pack = [];
    }
    if (typeof pack === 'function') {
      callback = pack;
      pack = [];
    }
    thaw(pack, function(err, pack) {
      pack.forEach(function(commit, i, pack) {
        commit.data = commitData.bind(commit, pack, i);
        // Support Bluebird automatically if it's globally available
        if (typeof Promise.promisify === 'function') {
          commit.dataAsync = Promise
            .promisify(commitData)
            .bind(commit, pack, i)
          ;
        }
      });
      utils.addProps(rarch._packMethods, pack);
      return setImmediate(callback, false, pack);
    });
  });
}

/**
 * Create or activate a tree
 *
 * @param {(Object|string|Buffer)} [tree]   Existing tree or tree data
 * @param {Function}               callback Node-style function(err,obj)
 *
 * @return {Object} The activated tree
 */
function makeTree(tree, callback) {
  setImmediate(function() {
    if (typeof tree === 'undefined' || tree === null) {
      tree = {};
    }
    if (typeof tree === 'function') {
      callback = tree;
      tree = {};
    }
    thaw(tree, function(err, tree) {
      async.forEachOf(
        tree,
        function(pack, key, asyncCallback) {
          makePack(pack, function(err, newPack) {
            tree[key] = newPack;
            asyncCallback();
          });
        },
        function() {
          utils.addProps(rarch._treeMethods, tree);
          setImmediate(callback, false, tree);
        }
      );
    });
  });
}

// Support Bluebird automatically if it's globally available
if (typeof Promise.promisify === 'function') {
  rarch._packMethods.stringAsync
    = (rarch._treeMethods.stringAsync = Promise.promisify(packToJSON));
  rarch._packMethods.gzipAsync
    = (rarch._treeMethods.gzipAsync   = Promise.promisify(packToGzip));
  rarch.packAsync = Promise.promisify(makePack);
  rarch.treeAsync = Promise.promisify(makeTree);
}

module.exports = rarch;
