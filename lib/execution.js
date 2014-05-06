var show = require('./visualization').show;
var u_ = require('underscore');
var Top = require('./top').Top;

var Output = Top.extend({
  asArray: function() { return this.arr_ },
  error: function() { return this.arr_[0]; },
  translateError: function(execution) {
    var err = this.arr_[0];
    if (err && !err.flowTrace) {
      var newErr = new Error(err.message || err.toString());
      newErr.casue = err;
      newErr.flowTrace = execution.toString();
      this.arr_[0] = newErr;
    }
  },
  toString: function() {
    var temp = this.arr_.slice(0);
    if (temp[0]) {
      temp[0] = temp[0].toString();
    }
    return JSON.stringify(temp);
  }
}, function(defs, arr) {
  if (arr.length === 0)
    arr = [null];
  return { arr_: arr }
});

var Execution = Top.extend({
  run: function(e) {
    if (++this.runCount_ > 1) {
      throw new Error('An Execution can only run once.');
    }
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
    return this.buf_[id]['output'].asArray();
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
      var output = Output.new_(u_.toArray(arguments).slice(1));
      // We first need to store output in execution: when translateError() is
      // called, we get the textual representaition of execution and we want it
      // to include output.
      execution.put(t, 'output', output);
      if (execution.options_.translateErrors) {
        output.translateError(execution);
      }
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
            outputOfCurr = execution.get(curr, 'output').asArray();
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
  },
  toString: function() {
    var lines = '\n' + show(this.root_, {connect: true, downArrows: true, forkArrows: true});
    lines = lines.split('\n');
    if (this.buf_.length > 0) {
      lines.push('Outputs:');
      lines = lines.concat(this.buf_.map(function(curr, index) {
        return '  - ' + index + ' => ' + curr['output'];
      }));
    }
    return lines.join('\n');
  }
}, function(defs, callback, root, inputs, realV0, options) {
  return { buf_: [], callback: callback, root_: root, completed_: [], pumpOn_: false, isDone_: false, inputs_: inputs, realV0_: realV0, runCount_: 0, options_: options || {} }
});

function payloadWithExecution(v) {
  var args = u_.toArray(arguments);
  var execution = args.pop();
  if (execution.get(v, 'completed')) {
    return;
  }
  var next = args.pop();

  var inputs = {};
  var err;
  var completedEdges = v.incoming().filter(function(edge) { return execution.get(edge.from, 'completed') });
  completedEdges.forEach(function(edge) {
    var s = edge.from;
    var temp = execution.get(s, 'output');
    var outputOfS = temp.asArray();
    inputs[edge.slot] = outputOfS.slice(1);
    err = err || temp.error();
    // TODO: move on as soon as an err is produced by any of the branches.
    // currently errors are detected only after all inputs are ready.
    if (s.outArity === 1) {
      inputs[edge.slot] = outputOfS.slice(1)[0];
    }
  });
  if (err) return next(err);
  v.merge(inputs, next);
}


exports.Execution = Execution;
exports.payloadWithExecution = payloadWithExecution;
