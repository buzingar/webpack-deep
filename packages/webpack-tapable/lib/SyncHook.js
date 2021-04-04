/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
'use strict';

const Hook = require('./Hook');
const HookCodeFactory = require('./HookCodeFactory');

// 4-4
class SyncHookCodeFactory extends HookCodeFactory {
  // 4-9
  content({ onError, onDone, rethrowIfPossible }) {
    // 可以在这改变onError 但是这里的 i 并没有用到
    // 注意这里并没有传入onResult
    return this.callTapsSeries({
      onError: (i, err) => onError(err),
      onDone,
      // 这个默认为true
      rethrowIfPossible,
    });
  }
}

const factory = new SyncHookCodeFactory();

const TAP_ASYNC = () => {
  throw new Error('tapAsync is not supported on a SyncHook');
};

const TAP_PROMISE = () => {
  throw new Error('tapPromise is not supported on a SyncHook');
};

// 4-3
const COMPILE = function (options) {
  // 现在options 是由Hook里面 传到这里的
  // options
  // {
  //  taps: this.taps, tap对象数组
  //  interceptors: this.interceptors, 拦截器数组
  //  args: this._args,
  //  type: type
  // }
  // 对应回教程中的编译出来的调用函数依赖于的那几项看看,是不是这些,钩子的个数,new SyncHook(['arg'])的参数个数,拦截器的个数,钩子的类型.
  console.log('compile:', options); // {taps:[], interceptors: [], args: ['options'], type: 'sync'}
  factory.setup(this, options);
  return factory.create(options);
};

// 1-1. new SyncHook(['synchook'])
function SyncHook(args = [], name = undefined) {
  console.log('args-name:', args, name); // [ 'options' ] undefined
  // 1-2. 先执行超类Hook的初始化工作
  const hook = new Hook(args, name);
  hook.constructor = SyncHook;
  hook.tapAsync = TAP_ASYNC;
  hook.tapPromise = TAP_PROMISE;
  console.log('SyncHook:', Date.now());
  hook.compile = COMPILE;
  return hook;
}

SyncHook.prototype = null;

module.exports = SyncHook;
