var Top = require('../lib/top').Top;

var Screen = Top.extend({
  putAt: function(row, col, value) {
    this.entries.push({r: row, c: col, v: value});
  },
  render: function() {
    var max = this.entries.reduce(function(soFar, current) {
      var maxR = Math.max(soFar.r, current.r);
      var maxC = Math.max(soFar.c, current.c);
      return {r: maxR, c: maxC};
    }, {r: 0, c: 0});

    var r;
    var c;

    var lines = [];
    for (r = 0; r <= max.r; ++r) {
      var line = [];
      for (c = 0; c <= max.c; ++c) {
        var es = this.entries.filter(function(current) { return current.r === r && current.c === c });
        if (es.length > 1)
          throw new Error('Colliding entries at ' + r + 'x' + c);
        if (es.length === 0) {
          line.push('');
          continue;
        }

        line.push(es[0].v);
      }
      lines.push(line.join('  ').replace(/[ ]+$/, ''));
    }
    return lines.join('\n');
  }
},
function() {
  return { entries: [] }
});

exports.Screen = Screen;

