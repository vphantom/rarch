/* eslint max-len: "off", vars-on-top: "off" */

'use strict';

global.Promise = require('bluebird');
var test = require('tape');
var rarch = require('../rarch.js');

var props = [
  '',
  'This is a test of short strings that change only near the middle or the end or something like that who knows exactly',
  'This is a test of short strings that modulate near the middle or the end or something like that who knows exactly',
  'This is a test of short strings that modulate near the middle or the end just because'
];


test('Packs - Node API', function(t) {
  t.plan(18);

  rarch.pack(null, function(err, pack) {
    t.ok(
      pack.constructor === Array,
      'new pack is an array'
    );

    t.ok(
      typeof pack.string === 'function',
      'new pack has string()'
    );

    t.ok(
      typeof pack.gzip === 'function',
      'new pack has gzip()'
    );

    t.ok(
      typeof pack.commit === 'function',
      'new pack has commit()'
    );

    t.ok(
      typeof pack.reset === 'function',
      'new pack has reset()'
    );

    pack.commit(props[1], {timestamp: 100, payload: true});
    pack.commit(props[2], {timestamp: 101, payload: true});
    pack.commit(props[3]);
    pack.commit(props[3], {_skipUnchanged: true});

    t.ok(
      pack.length === 3,
      '3 commits yield 3 revisions'
    );

    pack[0].data(function(err, string) {
      t.equal(
        string,
        props[1],
        'first revision contents matches'
      );
    });

    pack[1].data(function(err, string) {
      t.equal(
        string,
        props[2],
        'second revision contents matches'
      );
    });

    pack[2].data(function(err, string) {
      t.equal(
        string,
        props[3],
        'third revision contents matches'
      );
    });

    t.ok(
      pack[1].payload,
      'second revision has payload bool'
    );

    t.equal(
      pack[0].timestamp,
      100,
      'first revision has our timestamp'
    );

    pack.string(function(err, string) {
      var obj;

      try {
        obj = JSON.parse(string);
        t.pass('proper JSON serialization');
      } catch (e) {
        t.fail('Serialized JSON is invalid!');
      }

      t.ok(
        typeof obj === 'object',
        'parsed JSON yields object'
      );
    });

    pack.gzip(function(err, gzip) {
      rarch.pack(gzip, function(err, pack) {
        t.ok(
          pack.constructor === Array && pack.length === 3,
          'gzip then re-loading still yields array of 3 elements'
        );
        pack[2].data(function(err, data) {
          t.equal(
            data,
            props[3],
            'third revision content still matches after gzip re-load'
          );
        });
      });
    });
  });

  rarch.pack(null, function(err, pack) {
    pack.commit(props[1], {timestamp: 100, payload: true});
    pack.commit(props[2], {timestamp: 101, payload: true});
    pack.commit(props[3]);
    pack.commit(props[3], {_skipUnchanged: true});

    pack.reset('Short reset data');

    t.ok(
      pack.length === 1,
      'reset-insertion yielded single-element array'
    );

    pack.reset();

    t.ok(
      pack.length === 0,
      'empty reset yielded empty array'
    );
  });

  rarch.pack(function(err, pack) {
    t.ok(
      pack.constructor === Array,
      'short-form creation also yields array'
    );
  });
});

test('Trees - Node API', function(t) {
  t.plan(8);

  rarch.tree(null, function(err, tree) {
    t.ok(
      typeof tree === 'object',
      'new tree is an object'
    );

    t.ok(
      typeof tree.gzip === 'function',
      'new tree has gzip()'
    );
  });

  rarch.tree(function(err, tree) {
    t.ok(
      typeof tree === 'object',
      'short-form creation also yields object'
    );
    rarch.pack(function(err, pack1) {
      tree.pack1 = pack1;
      pack1.commit(props[1]);
      rarch.pack(function(err, pack2) {
        tree.pack2 = pack2;
        pack2.commit(props[2]);
        tree.gzip(function(err, gzip) {
          rarch.tree(gzip, function(err, tree) {
            t.ok(
              typeof tree === 'object',
              'gzip then re-loading still yields object'
            );
            t.ok(
              typeof tree.string === 'function',
              'reloaded tree has string()'
            );
            t.ok(
              typeof tree.gzip === 'function',
              'reloaded tree has gzip()'
            );
            tree.pack1[0].data(function(err, data) {
              t.equal(
                data,
                props[1],
                'first commit of first pack unchanged'
              );
            });
            tree.pack2[0].data(function(err, data) {
              t.equal(
                data,
                props[2],
                'first commit of second pack unchanged'
              );
            });
          });
        });
      });
    });
  });
});

test('Packs - Bluebird API', Promise.coroutine(function *(t) {
  var pack = yield rarch.packAsync();

  t.ok(
    typeof pack.gzip === 'function',
    'new pack has gzip()'
  );

  pack.commit(props[1], {timestamp: 100, payload: true});
  pack.commit(props[2], {timestamp: 101, payload: true});
  pack.commit(props[3]);
  pack.commit(props[3], {_skipUnchanged: true});

  t.ok(
    pack.length === 3,
    '3 commits yield 3 revisions'
  );

  let sample = yield pack[1].dataAsync();

  t.equal(
    sample,
    props[2],
    'second revision content matches'
  );
  t.ok(
    pack[1].payload,
    'second revision has payload bool'
  );

  let gzip    = yield pack.gzipAsync();
  let rebuilt = yield rarch.packAsync(gzip);

  t.ok(
    rebuilt.constructor === Array && rebuilt.length === 3,
    'gzip then re-loading still yields array of 3 elements'
  );

  let data = yield rebuilt[2].dataAsync();

  t.equal(
    data,
    props[3],
    'third revision content still matches after gzip re-load'
  );

  t.end();
}));

test('Trees - Bluebird API', Promise.coroutine(function *(t) {
  var tree = yield rarch.treeAsync();

  t.ok(
    typeof tree.gzip === 'function',
    'new tree has gzip()'
  );

  tree.pack1 = yield rarch.packAsync();
  tree.pack1.commit(props[1]);
  tree.pack2 = yield rarch.packAsync();
  tree.pack2.commit(props[2]);

  let gzip    = yield tree.gzipAsync();
  let rebuilt = yield rarch.treeAsync(gzip);

  t.ok(
    typeof rebuilt === 'object',
    'gzip then re-loading still yields object'
  );
  t.ok(
    typeof rebuilt.gzip === 'function',
    'reloaded tree has gzip()'
  );

  let data = yield tree.pack1[0].dataAsync();

  t.equal(
    data,
    props[1],
    'first commit of first pack unchanged'
  );

  t.end();
}));

