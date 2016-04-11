# rarch v0.0.1-alpha

Revision history packer in pure JavaScript.

This is similar to, and arose from the need in JavaScript for something similar to, good old [RCS](https://www.gnu.org/software/rcs/) where a single file contains not only its most recent version, but also all previous versions along with a thin layer of metadata.  Just like RCS, rarch's strength is in using [delta encoding](https://en.wikipedia.org/wiki/Delta_encoding): the most recent version of the data is stored in full, and reverse differences to each progressively older revision are stored.  The result is very space-efficient and is optimized for the most common use cases of accessing the latest revision and adding a newer revision on top.

I use it to manage revisions of web pages, but it uses [vcdiff.js](https://github.com/vphantom/vcdiff.js) under the hood which should be binary-safe.

Unlike RCS and a bit more like Git, multiple packs can be named and grouped together for convenience.  Delta encoding is only applied to a single pack's history however, and not across packs.

## Installation & Basic Usage

```shell
npm install rarch
```

### Creating a new pack

```js
var rarch = require('rarch');

var pack = rarch.pack();
pack.commit('This is a test.');
pack.commit('This is another test.');
console.log(pack.toJSON());
```

### Loading an existing pack

```js
var rarch = require('rarch');

// Assume 'packdata' contains a previously-saved pack
// Either a rarch Array, JSON string or Zlib binary
var pack = rarch.pack(packdata);

// Add newer commits or browse the history...
```

### Trees

```js
var rarch = require('rarch');

// Assume treedata was loaded from somewhere
var tree = rarch.tree(treedata);
console.log(tree.some_entry[0].timestamp);  // Oldest timestamp of 'some_entry'
tree.some_entry.commit(newData);  // Add a newer revision to that pack
treedata = tree.toZlib();  // Compress updated tree, ready to save back
```

## API: Packs

### rarch.pack([*pack*])

Returns a usable pack instance.  If a pack was provided, it will be decompressed and JSON-decoded as necessary and instance methods will be added if they weren't already present.  It is safe to pass a pack instance as well, in which case it would be returned unchanged.

Such a pack instance is actually an `Array` of objects, each of which representing an individual commit in chronological order.  The array gets a few additional methods (see below).

You can include a pack instance directly as part of a larger structure on which you'd invoke `JSON.stringify()` or equivalent yourself down the line.  Just pass the pack through `rarch.pack()` again when you load it back in the future to make it usable:

```js
myObj = JSON.parse(savedObj);
myObj.foo.bar.pack = rarch.pack(myObj.foo.bar.pack);  // Re-activate
```

### pack.toJSON()

Convenience wrapper for `JSON.stringify()`.  The resulting serialized string can be fed back to `rarch.pack()` later.

### pack.toZlib()

Passes the result of `pack.toJSON()` through Zlib compression.  The resulting binary string can be fed back to `rarch.pack()` later.  This is the ideal format to save to disk or database cell.

### pack.commit(*data*[, *metadata*])

Appends a newer version of `data` to the pack.  All properties of `metadata` not starting with an underscore `_` are copied along in the new commit object.  Some properties have special meaning:

- `_skipUnchanged` If present and true, would cause the revision **not** to be added at all if its data is identical to the current most recent version.

- `timestamp` If none is supplied, this will be set as the current number of seconds since Epoch at the moment the commit is created.

### Pack iteration

As a pack is an `Array`, iteration works as expected:

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

### pack[*n*].data() / commit.data()

Each individual commit in a pack's history offers this method to compute the revision's original data.  Therefore, unlike other properties which can be accessed directly like `timestamp`, the original data must be accessed through the `data()` method.

## API: Trees

A tree (named for its loose relationship with Git's internal concept) is simply an object with named properties leading to packs, as a convenient means to group packs together.  Unlike Git's internal trees, however, this structure is flat (there cannot be a tree within a tree).

Adding and removing packs from a tree is done the usual object way:

```js
// Add new pack 'foo' held in variable fooPack
tree.foo = fooPack;

// Remove pack 'foo' forever from the tree
delete tree.foo;
```

### rarch.tree([*tree*])

Like `rarch.pack()`, when fed any kind of tree (object, JSON string, Zlib compressed JSON string), returns a usable tree instance.  It is safe to pass its result back to itself.

### tree.toJSON()

Like `pack.toJSON()`, this is a convenience wrapper to `JSON.stringify()`.  Its result can be fed back to `rarch.tree()` later.

### tree.toZlib()

Like `pack.toZlib()`, this passes the result of `tree.toJSON()` through Zlib compression.  The resulting binary string can be fed back to `rarch.tree()` later.  This is the ideal format to save to disk or database cell.

