require('util-is');
var util = require('util');

function Flow(a, b) {
  this.trap = util.isFunction(a) ? a : b;
  var opts = util.isFunction(a) ? b : a;
  this.targets = [];
  this.options = opts || {};
}

Flow.prototype.toString = function() {
  var arr = this.targets.slice(0);
  return arr.map(function(x, index) { return '<' + index + '> ' + (x.name || '??') + '()'; }).join('\n');
};

Flow.prototype.seq = function() {
  this.targets = this.targets.concat(Array.prototype.slice.call(arguments, 0));
  if (!this.trap && this.targets.length === 0) 
    throw new Error('At least one function must be specified');

  return this;
};

Flow.prototype.conc = function(functionsByName) {
  var self = this;

  function compose(funcByName, aggregator, resultTransformer) {
    return function() {
      var incomingArgs = Array.prototype.slice.call(arguments, 0);
      var outerNext = incomingArgs.pop();
      var names = Object.keys(funcByName);
      var count = names.length;
      names.forEach(function(name, index) {      
        var f = funcByName[name];
        function next(e) {
          var data = Array.prototype.slice.call(arguments, 1);
          if (e) return outerNext(e);
          aggregator[name] = data;
          --count;
          if (count === 0) return outerNext.apply(null, [null].concat(resultTransformer(aggregator)));
        }
        f.apply(null, incomingArgs.concat([next]));
      });
    }
  }

  return this.seq(compose(functionsByName, {}, function(results) { return [results]; }));
};


Flow.prototype.graph = function(a) {
  var self = this;

  function translateArray(a) {
    console.log('\n-----------------------------------\n');
    if (a.length != 2) 
      throw new Error('a.length must be 2');
    var f1 = a[0];
    var f2 = a[1];


    return function(next) {
      function indexedNext(i) {
        console.log('i=' + i + ', ' + arguments[1] + ', ' + arguments[2]);
        if (i === 0) {
          return a[i](indexedNext.bind(null, i + 1));
        }

        var err = arguments[1];
        var value = arguments[2];
        if (err) return next(err);
        a[i](value, function() {
          next.apply(null, arguments);
        });
      }

      indexedNext(0);
    }
  }

  function compose(funcByName) {
    var aggregator = {};
    return function() {
      var incomingArgs = Array.prototype.slice.call(arguments, 0);
      var outerNext = incomingArgs.pop();
      var names = Object.keys(funcByName);
      var count = names.length;
      names.forEach(function(name, index) {      
        var f = funcByName[name];
        if (util.isArray(f)) {
          f = translateArray(f);
        }
        function next(e) {
          var data = Array.prototype.slice.call(arguments, 1);
          if (e) return outerNext(e);
          aggregator[name] = data;
          --count;
          if (count === 0) return outerNext(null, aggregator);
        }
        f.apply(null, incomingArgs.concat([next]));
      });
    }
  }

  if (util.isArray(a)) {
    a.forEach(function(current) {
      if (util.isFunction(current)) {
        self.seq(current);
        return;
      }

      return self.seq(compose(current));
    });
    return this;
  }
  return this.conc(a);
}

Flow.prototype.asFunction = function() {
  var functions = this.targets.slice(0);
  this.trap && functions.push(this.trap);
  var self = this;
  var trace = [];
  function applyAt(i, e) {
    var incomingArgs = Array.prototype.slice.call(arguments, 2);
    var f = functions[i];
    if (i === functions.length - 1) {
      return f.apply(null, [e].concat(incomingArgs));
    }

    trace.push('  at ' + (f.name || '?') + '()');


    function next() {
      var applyAtArgs = Array.prototype.slice.call(arguments, 0);
      if (applyAtArgs[0]) {
        applyAtArgs = [applyAtArgs[0]];
      }
      applyAtArgs = [i + 1].concat(applyAtArgs);
      return applyAt.apply(null, applyAtArgs);
    };


    var outgoingArgs = incomingArgs.concat([next]);
    try {
      if (e) return next(e);
      f.apply(null, outgoingArgs);
    } catch(e) {
      trace.push('Flow trace: '); 
      e.stack = e.stack + '\n' + trace.slice(0).reverse().join('\n');
      self.options.verbose && console.log('\n\ne.flowTrace=' + e.stack + '\n\n');
      next(e);
    }
  };

  return function() {
    var list = [0, null].concat(Array.prototype.slice.call(arguments, 0));
    applyAt.apply(null, list);
  };
};

Flow.prototype.run = function() {
  this.asFunction().apply(null, Array.prototype.slice.call(arguments, 0));
};

module.exports.flow = function(a, b) { return new Flow(a,b); }
module.exports.seq = function seq(trap) {
  var flow = new Flow(trap);
  flow.seq.apply(flow, Array.prototype.slice.call(arguments, 1));
  return flow;
}

