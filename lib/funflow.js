var legacy = require('./legacy');
var compiler = require('./compilation');
var dsl = require('./dsl');

exports.Compiler = compiler.Compiler;
exports.compile = compiler.compile;
exports.newFlow = compiler.newFlow;
exports.timer = dsl.timer;
exports.comp = dsl.comp;
exports.single = dsl.single;
exports.fork = dsl.fork;



exports.flow = legacy.flow;
exports.seq = legacy.seq;
