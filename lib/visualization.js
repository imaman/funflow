require('util-is');
var util = require('util');
var Graph = require('../lib/graph');
var Screen = require('../lib/screen').Screen;
var extend = require('node.extend');
var u_ = require('underscore');

function treeFromDsl(dsl, prefix) {
  prefix = prefix || '_temp_';
  var g = Graph.new_();
  var n = 0;

  function translate(dsl) {
    var root;
    if (util.isArray(dsl)) {
      var name = prefix + n;
      n += 1;
      root = g.vertex(name);

      dsl.forEach(function(current) {
        var child = translate(current);
        root.connectTo(child);
      });
      return root;
    }

    if (util.isPureObject(dsl)) {
      var name = prefix + n;
      n += 1;
      root = g.vertex(name);
      Object.keys(dsl).forEach(function(k) {
        var v = translate(dsl[k]);
        root.connectTo(v);
      });
      root.type = 'conc';
      return root;
    }

    return g.vertex(dsl);
  }
  translate(dsl);
  return g;
}

function show(v, options) {
  options = extend({seqShift: 1, branchShift: 1, connect: false},
      options);
  function preOrder(v, screen) {
    screen.putAt(0, 0, v.key);

    var row = 1;
    var col = 1;
    if (v.type === 'conc') {
      v.targets().forEach(function(t) {
        var dim = preOrder(t, screen.nested(options.branchShift, col));
        col += dim.p;
        row = Math.max(row, dim.s);
      });
      if (v.targets().length) {
        row += options.branchShift;
      }
    } else if (v.targets().length > 0) {
      v.targets().forEach(function(t) {
        var dim = preOrder(t, screen.nested(row, options.seqShift));
        row += dim.s;
        if (options.connect) {
          screen.putAt(row, 0, '|');
          row += 1;
        }
        col = Math.max(col, dim.p);
      });
      col += options.seqShift;
    }

    return { s: row, p: col };
  }

  var screen = Screen.new_();
  preOrder(v, screen);
  return screen.render(1);
}

exports.treeFromDsl = treeFromDsl;
exports.show = show;

