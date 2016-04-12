var zlib = require("zlib");

var diffable = require("vcdiff");
var vcdiff = new diffable.Vcdiff();

var utils = require("./utils");

var rarch = {
  _packMethods: {
    freeze: packToJSON,
    toGzip: packToGzip,
    commit: packCommit
  },
  _treeMethods: {
    freeze: packToJSON,
    toGzip: packToGzip
  },
  pack: makePack,
  tree: makeTree
};

function commitData(pack, i) {
  var j = 0;
  var data = "";

  if (typeof this._data !== "undefined") {
    return this._data;
  } else {
    j = pack.length - 1;
    data = pack[j]._data;
    for (j--; j >= i; j--) {
      data = vcdiff.decode(data, pack[j]._diff);
    }
  }
  return data;
}

function packToJSON() {
  return JSON.stringify(this);
}

function packToGzip() {
  return zlib.gzipSync(JSON.stringify(this));
}

// FIXME: Do we need "use strict" once for all or in each function?
function packCommit(data, metadata) {
  var date = new Date();
  var versions = this.length;
  var head = this.pop();
  var commit = {
    _md5: utils.md5sum(data),
    _data: data
  };

  if (typeof metadata === "undefined") {
    metadata = {};
  }

  utils.addProps(metadata, commit);
  commit.data = commitData.bind(commit, this, versions);
  if (typeof commit["timestamp"] !== "string") {
    commit.timestamp = Math.floor(date.getTime() / 1000);
  }
  if (typeof head === "object") {
    if (metadata["_skipUnchanged"] && commit._md5 === head._md5) {
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

function makePack(pack) {
  var method = null;

  if (typeof pack === "undefined" || pack === null) {
    pack = [];
  } else {
    pack = utils.thaw(pack);
  }
  pack.forEach(function(commit, i, pack) {
    commit.data = commitData.bind(commit, pack, i);
  });
  utils.addProps(rarch._packMethods, pack);
  return pack;
}

function makeTree(tree) {
  var pack = null;

  if (typeof tree === "undefined" || tree === null) {
    tree = {};
  } else {
    tree = utils.thaw(tree);
  }
  for (pack in tree) {
    if (tree.hasOwnProperty(pack)) {
      tree[pack] = makePack(tree[pack]);
    }
  }
  utils.addProps(rarch._treeMethods, tree);
  return tree;
}

module.exports = rarch;
