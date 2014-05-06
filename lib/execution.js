var show = require('./visualization').show;
var u_ = require('underscore');
var Top = require('./top').Top;

var Output = Top.extend({
  asArray: function(arity) {
    if (arguments.length === 0)
      return this.arr_;
    var result = this.arr_.slice(1);
    if (arity === 1)
      result = result[0];
    return result;
  },
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

var State = Top.extend({

}, function(defs, v, output, nexts) {
  return { vertex: v, output: output, nexts: nexts }
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
    var self = this;
    return this.continueFrom(State.new_(null, Output.new_(self.inputs_), [self.realV0_]));
  },
  ids: function() {
    return Object.keys(this.buf_).map(
      function(x) { return Number(x) });
  },
  outputOf: function(id) {
    return this.buf_[id]['state'].output.asArray();
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
  continueFrom: function(state) {
    var self = this;
    if (this.isDone_)
      return;
    this.statesToProcess_.push(state);
    pump();

    function next(state) {
      var t = state.vertex;
      var output = Output.new_(u_.toArray(arguments).slice(1));
      // We first need to store output in execution: when translateError() is
      // called, we get the textual representaition of execution and we want it
      // to include output.
      self.put(t, 'output', output);
      state.output = output;
      if (self.options_.translateErrors) {
        output.translateError(self);
      }
      self.continueFrom(stateFromVertex(t));
    }

    function pump() {
      if (self.pumpOn_)
        return;

      self.pumpOn_ = true;
      try {
        while (self.statesToProcess_.length > 0) {
          var state = self.statesToProcess_.pop();
          markCompletionOf(state);
          processCompleted(state);
        }
      } finally {
        self.pumpOn_ = false;
      }
    }

    function markCompletionOf(state) {
      state.vertex && self.put(state.vertex, 'completed', true) }
    function startOfFlow(v) { return v === null }
    function endOfFlow(state) { return state.vertex && state.vertex.outgoing().length === 0 }
    function finalize(state) {
      self.isDone_ = true;
      return self.callback.apply(null, state.output.asArray());
    }

    function dispatchNextVertex(t, output) {
      var outgoingArgs = [].concat(output.asArray());
      var nextOfT = next.bind(null, stateFromVertex(t));
      outgoingArgs.push(nextOfT);
      outgoingArgs.push(self);
      try {
        t.payloadWithExecution.apply(null, outgoingArgs);
      } catch (err) {
        nextOfT(err);
      }
    }

    function stateFromVertex(v) {
      var res = self.get(v, 'state');
      if (res)
        return res;
      res = State.new_(v, self.get(v, 'output'), v.targets());
      self.put(v, 'state', res);
      return res;
    }

    function processCompleted(state) {
      if (endOfFlow(state))
        return finalize(state);

      state.nexts.forEach(function(t) {
        dispatchNextVertex(t, state.output);
      });
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
        return '  - ' + index + ' => ' + curr['state'].output;
      }));
    }
    return lines.join('\n');
  }
}, function(defs, callback, root, inputs, realV0, options) {
  return { buf_: [], callback: callback, root_: root, statesToProcess_: [], pumpOn_: false, isDone_: false, inputs_: inputs, realV0_: realV0, runCount_: 0, options_: options || {} }
});

function createPayloadWithExecution(v, isMerge) {
  if (isMerge)
    return payloadWithExecution.bind(null, v);
  return function() {
    var args = u_.toArray(arguments);
    args.pop();
    v.payload.apply(null, args);
  }
}

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
    var outputOfS = execution.get(s, 'state').output;
    // TODO: move on as soon as an err is produced by any of the branches.
    // currently errors are detected only after all inputs are ready.
    err = err || outputOfS.error();
    inputs[edge.slot] = outputOfS.asArray(s.outArity);
  });
  if (err) return next(err);
  v.merge(inputs, next);
}


exports.Execution = Execution;
exports.createPayloadWithExecution = createPayloadWithExecution;
