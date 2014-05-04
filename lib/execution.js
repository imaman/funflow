var show = require('./visualization').show;
var u_ = require('underscore');
var Top = require('./top').Top;

var Execution = Top.extend({
  run: function(e) {
    var args = u_.toArray(arguments);
    var next = args.pop();
    if (e) return next(e);
    this.inputs_ = args;
    this.callback = next;
    return this.continueFrom(null);
  },
  ids: function() {
    return Object.keys(this.buf_).map(
      function(x) { return Number(x) });
  },
  outputOf: function(id) {
    return this.buf_[id]['output'];
  },
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
          var outputOfCurr;
          var ts;
          if (curr === null) {
            outputOfCurr = execution.inputs_;
            ts = [execution.realV0_];
          } else {
            outputOfCurr = execution.get(curr, 'output');
            execution.put(curr, 'completed', true);
            ts = curr.targets();
          }


          if (ts.length === 0) {
            execution.isDone_ = true;
            return execution.callback.apply(null, outputOfCurr);
          }
          ts.forEach(function(t) {
            var outgoingArgs = [].concat(outputOfCurr);
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
}, function(defs, callback, root, inputs, realV0) {
  return { buf_: [], callback: callback, root_: root, completed_: [], pumpOn_: false, isDone_: false, inputs_: inputs, realV0_: realV0 };
});

exports.Execution = Execution;
