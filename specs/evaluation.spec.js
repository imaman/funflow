var Graph = require('../lib/graph');
var rootFromDsl = require('../lib/dsl').rootFromDsl;
var show = require('../lib/visualization').show;
var u_ = require('underscore');

describe('funflow compilation', function() {
  function compile(v) {
    return function(e, a1, a2, next) { v.payload(a1, a2, next) };
  }
  it('transforms a single function into a fully-async one', function() {
    var root = rootFromDsl(
      function sum(x, y, next) { next(null, x + y) }
    );
    var flow = compile(root);
    var args;
    flow(null, 3, 7, function(e, v) {
      args = [e, v];
    });
    expect(args).toEqual([null, 10]);
  });
});


