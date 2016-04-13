# rarch v0.0.1-alpha

Revision history packer in pure JavaScript.

This is similar to, and arose from the need in JavaScript for something similar to, good old [RCS](https://www.gnu.org/software/rcs/) where a single file contains not only its most recent version, but also all previous versions along with a thin layer of metadata.  Just like RCS, rarch's strength is in using [delta encoding](https://en.wikipedia.org/wiki/Delta_encoding): the most recent version of the data is stored in full, and reverse differences to each progressively older revision are stored.  The result is very space-efficient and is optimized for the most common use cases of accessing the latest revision and adding a newer revision on top.

I use it to manage revisions of web pages, but it uses [vcdiff.js](https://github.com/vphantom/vcdiff.js) under the hood which should be binary-safe for other purposes.

Unlike RCS and a bit more like Git, multiple packs can be named and grouped together in "trees" for convenience.  Delta encoding is only applied to a single pack's history however, and not across packs.

For maximum compatibility, the asynchronous bits of this module implement the standard Node callback strategy using [async](https://github.com/caolan/async) under the hood, and if you're using [Bluebird](https://github.com/petkaantonov/bluebird) globally, the promisified "...Async" versions of all async methods are also available.

## Installation & Basic Usage

```shell
npm install rarch
```

### Creating new / reviving stored

```js
var rarch = require('rarch');

// To revive a stored pack, replace 'null' with contents.
// Contents can be one of:
// - Gzipped JSON
// - JSON
// - Existing object
rarch.pack(null, function(err, pack) {
  pack.commit('This is the initial content.');
  pack.commit('This is a new revision of content.');
  pack.string(function(err, string) {
    console.log('JSON ready to save: ' + string);
  });
});
```

If you're using [Bluebird](https://github.com/petkaantonov/bluebird) globally, the above could be simplified using a coroutine:

```js
global.Promise = require('bluebird');
var rarch = require('rarch');

Promise.coroutine(function *() {
  let pack = yield rarch.packAsync();
  pack.commit('This is the initial content.');
  pack.commit('This is a new revision of content.');
  let string = yield pack.string();
  console.log('JSON ready to save: ' + string);
})();
```

### Trees

```js
var rarch = require('rarch');

rarch.tree(null, function(err, tree) {
  rarch.pack(null, function(err, pack) {
    tree.somePackName = pack;
    tree.somePackName.commit('This pack now has content...');
    tree.gzip(function(err, buffer) {
      // ...save 'buffer' to disk or database, perhaps
    });
  });
});
```

## API: Packs

### rarch.pack([*pack*,] *callback*)

##### Bluebird: rarch.packAsync([*pack*])

Produces a usable pack instance.  The provided back data will be decompressed and/or JSON-decoded as necessary and instance methods will be added if they weren't already present.  It is thus safe to pass a pack instance as well, in which case it would pass unchanged.  If `pack` isn't provided, a new one will be created.

Such a pack instance is actually an `Array` of objects, each of which representing an individual commit in chronological order.  The array gets a few additional pack-related methods (see below).

You can include a pack instance directly as part of a larger structure on which you'd invoke `JSON.stringify()` or equivalent yourself down the line.  Just pass the pack through `rarch.pack()` again when you load it in the future to make it usable:

```js
myObj = JSON.parse(savedObj);
rarch.pack(myObj.foo.bar.pack, function(err, pack) {
  myObj.foo.bar.pack = pack;  // Re-activated
});
```

### pack.string(*callback*)

##### Bluebird: pack.stringAsync()

At the moment, this is a wrapper for `JSON.stringify()` but this may change in the future, which is why this method already exists.  The resulting serialized string can be fed back to `rarch.pack()` later.

### pack.gzip(*callback*)

##### Bluebird: pack.gzipAsync()

Passes the result of `pack.string()` through Gzip compression.  The resulting `Buffer` can be fed back to `rarch.pack()` later.  This is the ideal format to save to disk or database cell.

### pack.commit(*data*[, *metadata*])

Appends a newer version of `data` to the pack.  All properties of `metadata` not starting with an underscore `_` are copied along in the new commit object.  Some properties have special meaning:

- `_skipUnchanged` If present and true, would cause the revision **not** to be added at all if its data is identical to the current most recent version.  (This is done internally by comparing MD5 checksums.)

- `timestamp` If none is supplied, it will automatically be set as the current number of seconds since Epoch at the moment the commit is created.

### pack.reset([*data*[, *metadata*]])

Delete the entire pack's history.  If `data` (and possibly `metadata`) is supplied, then `pack.commit()` is invoked.  This was created as a convenience for use cases where only some packs in a tree would need versioning.

### Pack iteration

Because a pack is an `Array`, iteration works as expected:

```js
var rarch = require('rarch');

var pack = rarch.pack(someData);

// For loop
for (i = 0; i < pack.length; i++) {
  console.log("Commit " + i + " timestamp: " + pack[i].timestamp);
}

// forEach() method
pack.forEach(function(commit, i, pack) {
  console.log("Commit " + i + " timestamp: " + commit.timestamp);
});
```

### pack[*n*].data(*callback*) / commit.data(*callback*)

##### Bluebird: pack[*n*].dataAsync() / commit.dataAsync()

Unlike other properties of commits like `timestamp`, each individual commit in a pack's history is stored as a compact delta, and therefore must be reconstructed on demand.

## API: Trees

A tree (named for its rough equivalence to Git's internal concept of that name) is simply an object with named properties leading to packs, as a convenient means to group packs together.  The result is not unlike an enhanced filesystem where all versions of each file are kept, and with `tree.gzip()` one can essentially use this as a versioned JavaScript-native archiver.

**LIMITATION:** This version of rarch cannot nest trees within trees: a member of a tree is necessarily a pack.  The reason why trees weren't named "groups" is for future backwards-compatibility when nested trees eventually get implemented.

Because trees are regular objects with a few special methods added, adding and removing packs from trees works as expected:

```js
// Add new pack 'foo' held in variable fooPack
tree.foo = fooPack;

// Remove pack 'foo' forever from the tree
delete tree.foo;
```

### rarch.tree([*tree*,] *callback*)

##### Bluebird: rarch.treeAsync([*tree*])

Like `rarch.pack()`, when fed any representation of a tree (object, JSON string, Gzip buffer), produces a usable tree instance.  It is safe to pass its result back to itself.

### tree.string(*callback*)

##### Bluebird: tree.stringAsync()

Like `pack.string()`, this stringifies the tree and its result can be fed back to `rarch.tree()` later.

### tree.gzip(*callback*)

##### Bluebird: tree.gzipAsync()

Like `pack.gzip()`, this passes the result of `tree.string()` through Gzip compression.  The resulting buffer can be fed back to `rarch.tree()` later.  This is the ideal format to save to disk or database cell.
