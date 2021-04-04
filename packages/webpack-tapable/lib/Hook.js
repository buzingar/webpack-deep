/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
'use strict';

const util = require('util');

const deprecateContext = util.deprecate(() => {},
'Hook.context is deprecated and will be removed');
// DELEGATE 委派，代表
// 4-1
const CALL_DELEGATE = function (...args) {
  // 一个函数的this指向调用他的对象,没有就是全局,除非使用call apply bind 等改变指向
  this.call = this._createCall('sync');
  return this.call(...args);
};
const CALL_ASYNC_DELEGATE = function (...args) {
  this.callAsync = this._createCall('async');
  return this.callAsync(...args);
};
const PROMISE_DELEGATE = function (...args) {
  this.promise = this._createCall('promise');
  return this.promise(...args);
};

class Hook {
  // 1-3. 初始化，带_的为内部属性，及不可见，不带_的为暴露可见的属性
  constructor(args = [], name = undefined) {
    console.log('Hook:', args, name); // [ 'options' ] undefined
    // 把数组参数赋值给 _args 内部属性, new 的时候传进来的一系列参数.
    this._args = args; // [ 'options' ]
    this.name = name; // undefined
    // 绑定taps,应该是事件
    this.taps = [];
    // 拦截器数组
    this.interceptors = [];
    this._call = CALL_DELEGATE;
    // 暴露出去用于调用同步钩子的函数
    this.call = CALL_DELEGATE;
    this._callAsync = CALL_ASYNC_DELEGATE;
    // 暴露出去的用于调用异步钩子函数
    this.callAsync = CALL_ASYNC_DELEGATE;
    this._promise = PROMISE_DELEGATE;
    // 暴露出去的用于调用异步promise函数
    this.promise = PROMISE_DELEGATE;
    // 用于生成调用函数的时候,保存钩子数组的变量,现在暂时先不管.
    this._x = undefined;

    this.compile = this.compile;
    this.tap = this.tap;
    this.tapAsync = this.tapAsync;
    this.tapPromise = this.tapPromise;
  }

  // 清晰明了,这个方法一定要子类复写,不然报错,
  // 在当前的上下文中,this指向的是,子类,在我们这个例子中就是SyncHook
  compile(options) {
    throw new Error('Abstract: should be overridden');
  }

  // 4-2
  _createCall(type) {
    console.log('_createCall:', Date.now());
    // 传递一个整合了各个依赖条件的对象给子类的compile方法
    return this.compile({
      taps: this.taps,
      interceptors: this.interceptors,
      args: this._args,
      type: type,
    });
  }

  // 2-1
  _tap(type, options, fn) {
    // type: sync、async、promise
    // 下面是一些参数的限制,options参数必须是字符串或者是带name属性的对象,
    // 用于标明钩子,并把钩子和名字都整合到 options 对象里面
    if (typeof options === 'string') {
      // options = {name: 'A'} ...
      options = {
        name: options.trim(),
      };
    } else if (typeof options !== 'object' || options === null) {
      throw new Error('Invalid tap options');
    }
    if (typeof options.name !== 'string' || options.name === '') {
      throw new Error('Missing name for tap');
    }
    if (typeof options.context !== 'undefined') {
      deprecateContext();
    }
    // {fn: function..., type: sync, name: 'A' }
    options = Object.assign({ type, fn }, options);
    // 注册拦截器
    options = this._runRegisterInterceptors(options);
    // 插入钩子
    this._insert(options);
  }

  tap(options, fn) {
    // console.log('tap:', options, fn); // 'A' function
    this._tap('sync', options, fn);
  }

  tapAsync(options, fn) {
    this._tap('async', options, fn);
  }

  tapPromise(options, fn) {
    this._tap('promise', options, fn);
  }

  // 2-2 如何注册拦截器
  _runRegisterInterceptors(options) {
    // 现在这个参数应该是这个样子的{fn: function..., type: sync, name: 'A' }
    // 遍历拦截器,有就应用,没有就把配置返还回去
    console.log('interceptors:', this.interceptors);
    for (const interceptor of this.interceptors) {
      if (interceptor.register) {
        // 把选项传入拦截器注册, 从这里可以看出,
        // 拦截器的register 可以返回一个新的options选项, 并且替换掉原来的options选项,
        // 也就是说可以在执行了一次register之后 改变你当初 tap 进去的方法
        const newOptions = interceptor.register(options);
        if (newOptions !== undefined) {
          options = newOptions;
        }
      }
    }
    return options;
  }

  withOptions(options) {
    const mergeOptions = (opt) =>
      Object.assign({}, options, typeof opt === 'string' ? { name: opt } : opt);

    return {
      name: this.name,
      tap: (opt, fn) => this.tap(mergeOptions(opt), fn),
      tapAsync: (opt, fn) => this.tapAsync(mergeOptions(opt), fn),
      tapPromise: (opt, fn) => this.tapPromise(mergeOptions(opt), fn),
      intercept: (interceptor) => this.intercept(interceptor),
      isUsed: () => this.isUsed(),
      withOptions: (opt) => this.withOptions(mergeOptions(opt)),
    };
  }

  isUsed() {
    return this.taps.length > 0 || this.interceptors.length > 0;
  }

  // 3-1
  intercept(interceptor) {
    // 重置所有的 调用 方法,在教程中我们提到了 编译出来的调用方法依赖的其中一点就是 拦截器.
    // 所以每添加一个拦截器都要重置一次调用方法,在下一次编译的时候,重新生成.
    this._resetCompilation();
    // 保存拦截器 而且是复制一份,保留原本的引用
    this.interceptors.push(Object.assign({}, interceptor));
    // 运行所有的拦截器的register函数并且把 taps[i],(tap对象) 传进去.
    // 在intercept 的时候也会遍历执行一次当前所有的taps,把他们作为参数调用拦截器的register,
    // 并且把返回的 tap对象(tap对象就是指 tap函数里面把fn和name这些信息整合起来的那个对象) 替换了原来的 tap对象,
    // 所以register最好返回一个tap, 在例子中我返回了原来的tap, 但是其实最好返回一个全新的tap
    if (interceptor.register) {
      for (let i = 0; i < this.taps.length; i++) {
        this.taps[i] = interceptor.register(this.taps[i]);
      }
    }
  }

  _resetCompilation() {
    this.call = this._call;
    this.callAsync = this._callAsync;
    this.promise = this._promise;
  }

  // 这其实就是一个排序算法, 根据before, stage 的值来排序,也就是说你可以这样tap进来一个插件
  _insert(item) {
    // 重置资源,因为每一个插件都会有一个新的Compilation
    this._resetCompilation();
    // 顺序标记, 这里联合 __test__ 包里的Hook.js一起使用
    // 看源码不懂,可以看他的测试代码,就知道他写的是什么目的.
    // 从测试代码可以看到,这个 {before}是插件的名字.
    let before;
    // before 可以是单个字符串插件名称,也可以是一个字符串数组插件.
    if (typeof item.before === 'string') {
      before = new Set([item.before]);
    } else if (Array.isArray(item.before)) {
      before = new Set(item.before);
    }
    // 阶段
    // 从测试代码可以知道这个也是一个控制顺序的属性,值越小,执行得就越在前面
    // 而且优先级低于 before
    let stage = 0;
    if (typeof item.stage === 'number') {
      stage = item.stage;
    }
    let i = this.taps.length;
    // 遍历所有`tap`了的函数,然后根据 stage 和 before 进行重新排序.
    // 假设现在tap了 两个钩子  A B  `B` 的配置是  {name: 'B', before: 'A'}
    while (i > 0) {
      // i = 1, taps = [A]
      i--; // i = 0 首先-- 是因为要从最后一个开始
      const x = this.taps[i]; // x = A
      // i = 0, taps[1] = A  i+1 把当前元素往后移位,把位置让出来
      this.taps[i + 1] = x;
      // xStage = 0
      const xStage = x.stage || 0;
      if (before) {
        // 如果有这个属性就会进入这个判断
        if (before.has(x.name)) {
          // 如果before 有x.name 就会把这个插件名称从before这个列表里删除,代表这个钩子位置已经在当前的钩子之前
          before.delete(x.name);
          // 如果before还有元素,继续循环,执行上面的操作
          continue;
        }
        if (before.size > 0) {
          // 如果before还有元素,那就一直循环,直到第一位.
          continue;
        }
      }
      if (xStage > stage) {
        // 如果stage比当前钩子的stage大,继续往前挪
        continue;
      }
      i++;
      break;
    }
    this.taps[i] = item; // 把挪出来的位置插入传进来的钩子
  }
}

Object.setPrototypeOf(Hook.prototype, null);

module.exports = Hook;
