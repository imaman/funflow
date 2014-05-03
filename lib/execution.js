var show = require('./visualization').show;
var u_ = require('underscore');
var Top = require('./top').Top;

var Execution = Top.extend({
  get: function(vertex, key) {
    var entry = this.buf_[vertex.key];
    return entry ? entry[key] : undefined;
  },
  put: function(vertex, key, value) {
    var index = vertex.key;
    var entry = this.buf_[index];
    if (!entry) {
      entry = {};
      this.buf_[index] = entry;
    }
    entry[key] = value;
  },
  continueFrom: function(t) {
    var execution = this;
    if (this.isDone_)
      return;
    this.completed_.push(t);
    pump();

    function next(t) {
      var output = u_.toArray(arguments).slice(1);
      if (output.length === 0)
        output = [null];
      execution.put(t, 'output', output);
      execution.continueFrom(t);
    }

    function pump() {
      if (execution.pumpOn_)
        return;

      execution.pumpOn_ = true;
      try {
        while (execution.completed_.length > 0) {
          var curr = execution.completed_.pop();
          execution.put(curr, 'completed', true);

          var ts = curr.targets();
          if (ts.length === 0) {
            execution.isDone_ = true;
            return execution.callback.apply(null, execution.get(curr, 'output'));
          }
          ts.forEach(function(t) {
            var outgoingArgs = [].concat(execution.get(curr, 'output'));
            var nextOfT = next.bind(null, t);
            outgoingArgs.push(nextOfT);
            try {
              if (t.merge) {
                outgoingArgs.push(execution);
                t.payloadWithExecution.apply(null, outgoingArgs);
              } else {
                t.payload.apply(null, outgoingArgs);
              }
            } catch (err) {
              nextOfT(err);
            }
          });
        }
      } finally {
        execution.pumpOn_ = false;
      }
    }
  },
  toString: function() {
    return '\n' + show(this.root_, {connect: true, downArrows: true, forkArrows: true});
  },
  inspect: function() {
    console.log(this.toString());
    console.log('Outputs:');
    this.buf_.forEach(function(curr, index) {
      console.log('  - ' + index + ' => ' + JSON.stringify(curr.output));
    })
  }
}, function(defs, callback, root, v0) {
  return { buf_: [], callback: callback, root_: root, v0_: v0, completed_: [], pumpOn_: false, isDone_: false }
});

exports.Execution = Execution;