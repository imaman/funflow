var Top = require('../lib/top').Top;
var u_ = require('underscore');

var Screen = Top.extend({
  putAt: function(row, col, value) {
    this.entries.push({
      r: this.base.r + row,
      c: this.base.c + col,
      v: value});
  },
  nested: function(offsetRow, offsetCol) {
    var result = this.new_();
    result.entries = this.entries;
    result.base = { r: offsetRow, c: offsetCol };
    return result;
  },
  render: function(spacing) {
    spacing = (spacing == undefined) ? 2 : spacing;
    var spaces = [];
    var i =0;
    for (i = 0; i < spacing; ++i) {
      spaces.push(' ');
    }
    spaces = spaces.join('');
    var max = this.entries.reduce(function(soFar, current) {
      var maxR = Math.max(soFar.r, current.r);
      var maxC = Math.max(soFar.c, current.c);
      return {r: maxR, c: maxC};
    }, {r: 0, c: 0});

    var widths = u_.range(0, max.c + 1).map(function() { return 0; });
    this.entries.forEach(function(current) {
      var c = current.c;
      widths[c] = Math.max(widths[c], current.length);
    });

    var r;
    var c;

    var lines = [];
    for (r = 0; r <= max.r; ++r) {
      var line = [];
      for (c = 0; c <= max.c; ++c) {
        var es = this.entries.filter(function(current) { return current.r === r && current.c === c });
        if (es.length > 1)
          throw new Error('Colliding entries at ' + r + 'x' + c);

        var s = '';
        if (es.length === 1) {
          s = es[0].v.toString();
        }

        line.push(s);
        line.push(spaces.substring(s.length));
      }
      lines.push(line.join('').replace(/[ ]+$/, ''));
    }
    return lines.join('\n');
  }
},
function() {
  return { entries: [], base: {c: 0, r: 0} }
});

exports.Screen = Screen;

