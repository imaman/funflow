require('util-is');
var util = require('util');
var Graph = require('../lib/graph');
var Screen = require('../lib/screen').Screen;
var extend = require('node.extend');
var u_ = require('underscore');

function rootFromDsl(dsl, prefix) {
  var g = treeFromDsl(dsl, prefix);
  var roots = g.vertices().filter(function(v) { return v.incoming().length === 0});
  if (roots.length !== 1)
    throw new Error('Found ' + roots.length + ' roots');
  return roots[0];
}

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


function showSplit(v, screen, options, preOrder) {
  var row = 1;
  var col = 1;
  var cols = [];

  v.targets().forEach(function(t) {
    cols.push(col);
    var dim = preOrder(t, screen.nested(options.branchShift, col));
    col += dim.p;
    row = Math.max(row, options.branchShift + dim.s);
  });

  if (!options.connect) {
    screen.putAt(0, 0, v.key);
    return {s: row, p: col};
  }

  screen.putAt(0, 0, '|');
  screen.putAt(1, 0, '+', '-');
  screen.putAt(row + 1, 0, '+', '-');

  cols.forEach(function(c, index) {
    var isLast = index === (cols.length - 1);
    // +---+--+--+
    // |   |  |  |
    screen.putAt(1, c, '+', isLast ? undefined : '-');
    screen.putAt(2, c, '|');

    // |   |  |  |
    // +---+--+--+
    screen.putAt(row, c, '|');
    screen.putAt(row + 1, c, '+', isLast ? undefined : '-');
  });
  return {s: row + 2, p: col};
}

function showSequence(v, screen, options, preOrder) {
  var row = 1;
  var col = 1;
  screen.putAt(0, 0, options.connect ? '|' : v.key);
  v.targets().forEach(function(t) {
    var dim = preOrder(t, screen.nested(row, options.seqShift));
    row += dim.s;
    col = Math.max(col, dim.p);
  });
  return {s: row, p: col + options.seqShift};
}

function showTerminal(v, screen, options, preOrder) {
  screen.putAt(0, 0, v.key);
  if (!options.connect) {
    return {s: 1, p: 1};
  }

  screen.putAt(1, 0 ,'|');
  return {s: 2, p: 1};
}

function show(v, options) {
  options = extend({seqShift: 1, branchShift: 1, connect: false},
      options);
  if (options.connect) {
    options.branchShift = 3;
    options.seqShift = 0;
  }

  function preOrder(v, screen) {

    if (v.type === 'conc') {
      return showSplit(v, screen, options, preOrder);
    } else if (v.targets().length > 0) {
      return showSequence(v, screen, options, preOrder);
    } else {
      return showTerminal(v, screen, options, preOrder);
    }
  }

  function connectVeritcally(lines, numRows, numCols) {
    u_.range(0, numCols).forEach(function(c) {
      u_.range(1, numRows).forEach(function(r) {
        var curr = lines[r][c];
        var prev = lines[r-1][c];
        if (prev.trim() === '|' && curr.trim().length === 0) {
          lines[r][c] = ('|' + curr.substring(1));
        }
      });
    });
  }

  var screen = Screen.new_();
  preOrder(v, screen);
  return screen.render(1, connectVeritcally);
}

exports.treeFromDsl = treeFromDsl;
exports.rootFromDsl = rootFromDsl;
exports.show = show;

