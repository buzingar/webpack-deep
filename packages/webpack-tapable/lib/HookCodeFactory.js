/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
'use strict';

class HookCodeFactory {
  constructor(config) {
    // 这个config作用暂定.因为我看了这个文件,没看到有引用的地方,
    // 应该是其他子类有引用到
    this.config = config;
    // 这两个不难懂, 往下看就知道了
    this.options = undefined;
    this._args = undefined;
  }

  // 4-6
  // 在我们的例子中他是通过动态的生成一个call方法,根据的条件有,钩子是否有context 属性(这个是根据header的代码才能知道), 钩子的个数, 钩子的类型,钩子的参数,钩子的拦截器个数.
  create(options) {
    // 初始化参数,保存options到本对象this.options,保存new Hook(["options"]) 传入的参数到 this._args
    this.init(options);
    // 注意,关于 fn这个变量的函数,返回的都是字符串,不是函数不是方法,是返回可以转化成代码执行的字符串,思维要转变过来.
    let fn;
    // 动态构建钩子,这里是抽象层,分同步, 异步, promise
    switch (this.options.type) {
      case 'sync':
        // 动态返回一个钩子函数
        fn = new Function(
          // 生成函数的参数,no before no after 返回参数字符串 xxx,xxx 在
          // 注意这里this.args返回的是一个字符串,
          // 在这个例子中是options
          this.args(),
          '"use strict";\n' +
            this.header() +
            this.contentWithInterceptors({
              onError: (err) => `throw ${err};\n`,
              onResult: (result) => `return ${result};\n`,
              resultReturns: true,
              onDone: () => '',
              rethrowIfPossible: true,
            }),
        );
        break;
      case 'async':
        fn = new Function(
          this.args({
            after: '_callback',
          }),
          '"use strict";\n' +
            this.header() +
            this.contentWithInterceptors({
              onError: (err) => `_callback(${err});\n`,
              onResult: (result) => `_callback(null, ${result});\n`,
              onDone: () => '_callback();\n',
            }),
        );
        break;
      case 'promise':
        let errorHelperUsed = false;
        const content = this.contentWithInterceptors({
          onError: (err) => {
            errorHelperUsed = true;
            return `_error(${err});\n`;
          },
          onResult: (result) => `_resolve(${result});\n`,
          onDone: () => '_resolve();\n',
        });
        let code = '';
        code += '"use strict";\n';
        code += this.header();
        code += 'return new Promise((function(_resolve, _reject) {\n';
        if (errorHelperUsed) {
          code += 'var _sync = true;\n';
          code += 'function _error(_err) {\n';
          code += 'if(_sync)\n';
          code +=
            '_resolve(Promise.resolve().then((function() { throw _err; })));\n';
          code += 'else\n';
          code += '_reject(_err);\n';
          code += '};\n';
        }
        code += content;
        if (errorHelperUsed) {
          code += '_sync = false;\n';
        }
        code += '}));\n';
        fn = new Function(this.args(), code);
        break;
    }
    // 把刚才init赋的值初始化为undefined
    // this.options = undefined;
    // this._args = undefined;
    this.deinit();
    return fn;
  }

  // 4-5
  // (this,options)
  setup(instance, options) {
    // 这里的instance 是syncHook 实例, 其实就是把tap进来的钩子数组给到钩子的_x属性里.
    instance._x = options.taps.map((t) => t.fn);
  }

  /**
   * @param {{ type: "sync" | "promise" | "async", taps: Array<Tap>, interceptors: Array<Interceptor> }} options
   */
  init(options) {
    this.options = options;
    this._args = options.args.slice();
  }

  deinit() {
    this.options = undefined;
    this._args = undefined;
  }

  // 4-8
  contentWithInterceptors(options) {
    if (this.options.interceptors.length > 0) {
      const onError = options.onError;
      const onResult = options.onResult;
      const onDone = options.onDone;
      let code = '';
      for (let i = 0; i < this.options.interceptors.length; i++) {
        const interceptor = this.options.interceptors[i];
        if (interceptor.call) {
          code += `${this.getInterceptor(i)}.call(${this.args({
            before: interceptor.context ? '_context' : undefined,
          })});\n`;
        }
      }
      // 这个 content 调用的是子类的 content 函数,
      // 参数由子类传,实际返回的是 this.callTapsSeries() 返回的类容
      code += this.content(
        Object.assign(options, {
          onError:
            onError &&
            ((err) => {
              let code = '';
              for (let i = 0; i < this.options.interceptors.length; i++) {
                const interceptor = this.options.interceptors[i];
                if (interceptor.error) {
                  code += `${this.getInterceptor(i)}.error(${err});\n`;
                }
              }
              code += onError(err);
              return code;
            }),
          onResult:
            onResult &&
            ((result) => {
              let code = '';
              for (let i = 0; i < this.options.interceptors.length; i++) {
                const interceptor = this.options.interceptors[i];
                if (interceptor.result) {
                  code += `${this.getInterceptor(i)}.result(${result});\n`;
                }
              }
              code += onResult(result);
              return code;
            }),
          onDone:
            onDone &&
            (() => {
              let code = '';
              for (let i = 0; i < this.options.interceptors.length; i++) {
                const interceptor = this.options.interceptors[i];
                if (interceptor.done) {
                  code += `${this.getInterceptor(i)}.done();\n`;
                }
              }
              code += onDone();
              return code;
            }),
        }),
      );
      return code;
    } else {
      return this.content(options);
    }
  }

  // 4-7
  // 注意 header 返回的不是代码,是可以转化成代码的字符串(这个时候并没有执行).
  /**
   * 此时call函数应该为:
   * "use strict";
   * function (options) {
   * 	 var _context;
   *   var _x = this._x;
   *   var _taps = this.taps;
   *   var _interterceptors = this.interceptors;
   * 我们只有一个拦截器所以下面的只会生成一个
   *   _interceptors[0].call(options);
   * }
   */
  header() {
    let code = '';
    // this.needContext() 判断taps[i] 是否 有context 属性, 任意一个tap有 都会返回 true
    if (this.needContext()) {
      // 如果有context 属性, 那_context这个变量就是一个空的对象.
      code += 'var _context = {};\n';
    } else {
      // 否则 就是undefined
      code += 'var _context;\n';
    }
    // 在setup()中 把所有tap对象的钩子 都给到了 instance ,这里的this 就是setup 中的instance _x 就是钩子对象数组
    code += 'var _x = this._x;\n';
    // 如果有拦截器,在我们的例子中,就有一个拦截器
    if (this.options.interceptors.length > 0) {
      // 保存taps 数组到_taps变量, 保存拦截器数组 到变量_interceptors
      code += 'var _taps = this.taps;\n';
      code += 'var _interceptors = this.interceptors;\n';
    }
    return code;
  }

  needContext() {
    for (const tap of this.options.taps) if (tap.context) return true;
    return false;
  }

  // 4-11
  /** tapIndex 下标
   * onError:() => onError(i,err,done,skipdone) ,
   * onReslt: undefined
   * onDone: () => {return: done()} //开启递归的钥匙
   * rethrowIfPossible: false 说明当前的钩子不是sync的.
   */
  callTap(tapIndex, { onError, onResult, onDone, rethrowIfPossible }) {
    let code = '';
    // hasTapCached 是否有tap的缓存, 这个要看看他是怎么做的缓存了
    let hasTapCached = false;
    // 这里还是拦截器的用法,如果有就执行拦截器的tap函数
    for (let i = 0; i < this.options.interceptors.length; i++) {
      const interceptor = this.options.interceptors[i];
      if (interceptor.tap) {
        if (!hasTapCached) {
          // 这里getTap返回的是 _taps[0] _taps[1]... 的字符串
          // 这里生成的代码就是 `var _tap0 = _taps[0]`
          // 注意: _taps 变量我们在 header 那里已经生成了
          code += `var _tap${tapIndex} = ${this.getTap(tapIndex)};\n`;
          // 可以看到这个变量的作用就是,如果有多个拦截器.这里也只会执行一次.
          // 注意这句获取_taps 对象的下标用的是tapIndex,在一次循环中,这个tapIndex不会变
          // 就是说如果这里执行多次,就会生成多个重复代码,不稳定,也影响性能.
          // 但是你又要判断拦截器有没有tap才可以执行,或许有更好的写法
          // 如果你能想到,那么你就是webpack的贡献者了.不过这样写,似乎也没什么不好.
          hasTapCached = true;
        }
        // 这里很明显跟上面的getTap 一样 返回的都是字符串
        // 我就直接把这里的code 分析出来了,注意 这里还是在循环中.
        // code += _interceptor[0].tap(_tap0);
        // 由于我们的拦截器没有context,所以没传_context进来.
        // 可以看到这里是调用拦截器的tap方法然后传入tap0对象的地方
        code += `${this.getInterceptor(i)}.tap(${
          interceptor.context ? '_context, ' : ''
        }_tap${tapIndex});\n`;
      }
    }
    // 跑出了循坏
    // 这里的getTapFn 返回的也是字符串 `_x[0]`
    // callTap用到的这些全部在header() 那里生成了,忘记的回头看一下.
    // 这里的code就是: var _fn0 = _x[0]
    code += `var _fn${tapIndex} = ${this.getTapFn(tapIndex)};\n`;
    const tap = this.options.taps[tapIndex];
    // 开始处理tap 对象
    switch (tap.type) {
      case 'sync':
        // 全是同步的时候, 这里不执行, 如果有异步函数,那么恭喜,有可能会报错.所以他加了个 try...catch
        if (!rethrowIfPossible) {
          code += `var _hasError${tapIndex} = false;\n`;
          code += 'try {\n';
        }
        // 前面分析了 同步的时候 onResult 是 undefined
        // 我们也分析一下如果走这里会怎样
        // var _result0 = _fn0(option)
        // 可以看到是调用tap 进来的钩子并且接收参数
        if (onResult) {
          code += `var _result${tapIndex} = _fn${tapIndex}(${this.args({
            before: tap.context ? '_context' : undefined,
          })});\n`;
        } else {
          code += `_fn${tapIndex}(${this.args({
            before: tap.context ? '_context' : undefined,
          })});\n`;
        }
        if (!rethrowIfPossible) {
          code += '} catch(_err) {\n';
          code += `_hasError${tapIndex} = true;\n`;
          code += onError('_err');
          code += '}\n';
          code += `if(!_hasError${tapIndex}) {\n`;
        }
        if (onResult) {
          code += onResult(`_result${tapIndex}`);
        }
        if (onDone) {
          code += onDone();
        }
        if (!rethrowIfPossible) {
          code += '}\n';
        }
        break;
      case 'async':
        let cbCode = '';
        if (onResult)
          cbCode += `(function(_err${tapIndex}, _result${tapIndex}) {\n`;
        else cbCode += `(function(_err${tapIndex}) {\n`;
        cbCode += `if(_err${tapIndex}) {\n`;
        cbCode += onError(`_err${tapIndex}`);
        cbCode += '} else {\n';
        if (onResult) {
          cbCode += onResult(`_result${tapIndex}`);
        }
        if (onDone) {
          cbCode += onDone();
        }
        cbCode += '}\n';
        cbCode += '})';
        code += `_fn${tapIndex}(${this.args({
          before: tap.context ? '_context' : undefined,
          after: cbCode,
        })});\n`;
        break;
      case 'promise':
        code += `var _hasResult${tapIndex} = false;\n`;
        code += `var _promise${tapIndex} = _fn${tapIndex}(${this.args({
          before: tap.context ? '_context' : undefined,
        })});\n`;
        code += `if (!_promise${tapIndex} || !_promise${tapIndex}.then)\n`;
        code += `  throw new Error('Tap function (tapPromise) did not return promise (returned ' + _promise${tapIndex} + ')');\n`;
        code += `_promise${tapIndex}.then((function(_result${tapIndex}) {\n`;
        code += `_hasResult${tapIndex} = true;\n`;
        if (onResult) {
          code += onResult(`_result${tapIndex}`);
        }
        if (onDone) {
          code += onDone();
        }
        code += `}), function(_err${tapIndex}) {\n`;
        code += `if(_hasResult${tapIndex}) throw _err${tapIndex};\n`;
        code += onError(`_err${tapIndex}`);
        code += '});\n';
        break;
    }
    return code;
  }

  // 4-10
  callTapsSeries({
    onError,
    onResult,
    resultReturns,
    onDone,
    doneReturns,
    rethrowIfPossible,
  }) {
    // 如果 taps 钩子处理完毕,执行onDone,或者一个tap都没有 onDone() 返回的是一个字符串
    if (this.options.taps.length === 0) return onDone();
    // 如果有异步钩子,把第一个异步钩子的下标返回,如果没有这个返回的是-1
    const firstAsync = this.options.taps.findIndex((t) => t.type !== 'sync');
    const somethingReturns = resultReturns || doneReturns;
    let code = '';
    let current = onDone;
    let unrollCounter = 0;
    for (let j = this.options.taps.length - 1; j >= 0; j--) {
      const i = j;
      const unroll =
        current !== onDone &&
        (this.options.taps[i].type !== 'sync' || unrollCounter++ > 20);
      if (unroll) {
        unrollCounter = 0;
        code += `function _next${i}() {\n`;
        code += current();
        code += `}\n`;
        current = () => `${somethingReturns ? 'return ' : ''}_next${i}();\n`;
      }
      const done = current;
      // 传入一个值 如果是false 就执行onDone true 返回一个 ""
      // 字面意思,是否跳过done 应该是增加一个跳出递归的条件
      const doneBreak = (skipDone) => {
        if (skipDone) return '';
        return onDone();
      };
      // 这里就是处理单个taps对象的关键,传入一个下标,和一系列回调.
      const content = this.callTap(i, {
        // 调用的onError 是 (i, err) => onError(err) , 后面这个onError(err)是 () => `throw ${err}`
        // 目前 i done doneBreak 都没有用到
        onError: (error) => onError(i, error, done, doneBreak),
        // 这里onResult 同步钩子的情况下在外部是没有传进来的,刚才也提到了
        // 这里onResult是 undefined
        onResult:
          onResult &&
          ((result) => {
            return onResult(i, result, done, doneBreak);
          }),
        // 没有onResult 一定要有一个onDone 所以这里就是一个默认的完成回调
        // 这里的done 执行的是next(i+1), 也就是迭代的处理完所有的taps
        onDone: !onResult && done,
        // rethrowIfPossible 默认是 true 也就是返回后面的
        // 因为没有异步函数 firstAsync = -1.
        // 所以返回的是 -1 < 0,也就是true, 这个可以判断当前的是否是异步的tap对象
        // 这里挺妙的 如果是 false 那么当前的钩子类型就不是sync,可能是promise或者是async
        // 具体作用要看callTaps()如何使用这个.
        rethrowIfPossible:
          rethrowIfPossible && (firstAsync < 0 || i < firstAsync),
      });
      current = () => content;
    }
    code += current();
    return code;
  }

  callTapsLooping({ onError, onDone, rethrowIfPossible }) {
    if (this.options.taps.length === 0) return onDone();
    const syncOnly = this.options.taps.every((t) => t.type === 'sync');
    let code = '';
    if (!syncOnly) {
      code += 'var _looper = (function() {\n';
      code += 'var _loopAsync = false;\n';
    }
    code += 'var _loop;\n';
    code += 'do {\n';
    code += '_loop = false;\n';
    for (let i = 0; i < this.options.interceptors.length; i++) {
      const interceptor = this.options.interceptors[i];
      if (interceptor.loop) {
        code += `${this.getInterceptor(i)}.loop(${this.args({
          before: interceptor.context ? '_context' : undefined,
        })});\n`;
      }
    }
    code += this.callTapsSeries({
      onError,
      onResult: (i, result, next, doneBreak) => {
        let code = '';
        code += `if(${result} !== undefined) {\n`;
        code += '_loop = true;\n';
        if (!syncOnly) code += 'if(_loopAsync) _looper();\n';
        code += doneBreak(true);
        code += `} else {\n`;
        code += next();
        code += `}\n`;
        return code;
      },
      onDone:
        onDone &&
        (() => {
          let code = '';
          code += 'if(!_loop) {\n';
          code += onDone();
          code += '}\n';
          return code;
        }),
      rethrowIfPossible: rethrowIfPossible && syncOnly,
    });
    code += '} while(_loop);\n';
    if (!syncOnly) {
      code += '_loopAsync = true;\n';
      code += '});\n';
      code += '_looper();\n';
    }
    return code;
  }

  callTapsParallel({
    onError,
    onResult,
    onDone,
    rethrowIfPossible,
    onTap = (i, run) => run(),
  }) {
    if (this.options.taps.length <= 1) {
      return this.callTapsSeries({
        onError,
        onResult,
        onDone,
        rethrowIfPossible,
      });
    }
    let code = '';
    code += 'do {\n';
    code += `var _counter = ${this.options.taps.length};\n`;
    if (onDone) {
      code += 'var _done = (function() {\n';
      code += onDone();
      code += '});\n';
    }
    for (let i = 0; i < this.options.taps.length; i++) {
      const done = () => {
        if (onDone) return 'if(--_counter === 0) _done();\n';
        else return '--_counter;';
      };
      const doneBreak = (skipDone) => {
        if (skipDone || !onDone) return '_counter = 0;\n';
        else return '_counter = 0;\n_done();\n';
      };
      code += 'if(_counter <= 0) break;\n';
      code += onTap(
        i,
        () =>
          this.callTap(i, {
            onError: (error) => {
              let code = '';
              code += 'if(_counter > 0) {\n';
              code += onError(i, error, done, doneBreak);
              code += '}\n';
              return code;
            },
            onResult:
              onResult &&
              ((result) => {
                let code = '';
                code += 'if(_counter > 0) {\n';
                code += onResult(i, result, done, doneBreak);
                code += '}\n';
                return code;
              }),
            onDone:
              !onResult &&
              (() => {
                return done();
              }),
            rethrowIfPossible,
          }),
        done,
        doneBreak,
      );
    }
    code += '} while(false);\n';
    return code;
  }

  args({ before, after } = {}) {
    let allArgs = this._args;
    if (before) allArgs = [before].concat(allArgs);
    if (after) allArgs = allArgs.concat(after);
    if (allArgs.length === 0) {
      return '';
    } else {
      return allArgs.join(', ');
    }
  }

  getTapFn(idx) {
    return `_x[${idx}]`;
  }

  getTap(idx) {
    return `_taps[${idx}]`;
  }

  getInterceptor(idx) {
    return `_interceptors[${idx}]`;
  }
}

module.exports = HookCodeFactory;
