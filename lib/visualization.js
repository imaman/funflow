var dsl = require('./dsl');
var Screen = require('../lib/screen').Screen;
var extend = require('node.extend');
var u_ = require('underscore');


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
  screen.putAt(1, 0, (options.splitArrows ? '+->' : '+'), '-');
  screen.putAt(row + 1, 0, (options.splitArrows ? '+-<' : '+'), '-');

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
  options = extend({seqShift: 1, branchShift: 1, connect: false, downArrows: false, splitArrows: false, spacing: 1},
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
      var count = 0;
      u_.range(1, numRows).forEach(function(r) {
        var curr = lines[r][c];
        var prev = lines[r-1][c].trim();
        if ((prev === '|' || prev === 'v') && curr.trim().length === 0) {
          ++count;
          lines[r][c] = (((options.downArrows && count === 3) ? 'v' : '|') + curr.substring(1));
        } else {
          count = 0;
        }
      });
    });
  }

  var screen = Screen.new_();
  preOrder(v, screen);
  return screen.render(options.spacing, connectVeritcally);
}

exports.show = show;
exports.rootFromDsl = dsl.rootFromDsl;
exports.treeFromDsl = dsl.treeFromDsl;

