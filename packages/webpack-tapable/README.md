# Tapable

发布订阅模式

tap 只是订阅了钩子函数,我们还需要发布他 call

tapable 是一个类似于 nodejs 的 EventEmitter 的库，主要是控制钩子函数的发布与订阅，控制着 webpack 的插件系。webpack 的本质就是一系列的插件运行。

The tapable package expose many Hook classes, which can be used to create hooks for plugins.
Tapable 库 提供了很多的钩子类, 这些类可以为插件创建钩子

```javascript
const {
  SyncHook,
  SyncBailHook,
  SyncWaterfallHook,
  SyncLoopHook,
  AsyncParallelHook,
  AsyncParallelBailHook,
  AsyncSeriesHook,
  AsyncSeriesBailHook,
  AsyncSeriesWaterfallHook,
} = require('tapable');
```

## Installation

```shell
npm install --save tapable
```

## Usage

All Hook constructors take one optional argument, which is a list of argument names as strings.
所有的钩子构造函数,都接受一个可选的参数,(这个参数最好是数组,不是 tapable 内部也把他变成数组),这是一个参数的字符串名字列表

```js
const hook = new SyncHook(['arg1', 'arg2', 'arg3']);
```

The best practice is to expose all hooks of a class in a `hooks` property:
最好的实践就是把所有的钩子暴露在一个类的 hooks 属性里面：

```js
class Car {
  constructor() {
    this.hooks = {
      accelerate: new SyncHook(['newSpeed']),
      brake: new SyncHook(),
      calculateRoutes: new AsyncParallelHook([
        'source',
        'target',
        'routesList',
      ]),
    };
  }

  /* ... */
}
```

Other people can now use these hooks:
其他开发者现在可以这样用这些钩子

```js
const myCar = new Car();

// Use the tap method to add a consument
myCar.hooks.brake.tap('WarningLampPlugin', () => warningLamp.on());
```

It's required to pass a name to identify the plugin/reason.
这需要你传一个名字去标记这个插件:

You may receive arguments:
你可以接收参数

```js
myCar.hooks.accelerate.tap('LoggerPlugin', (newSpeed) =>
  console.log(`Accelerating to ${newSpeed}`),
);
```

For sync hooks, `tap` is the only valid method to add a plugin. Async hooks also support async plugins:
在同步钩子中, tap 是唯一的绑定方法,异步钩子通常支持异步插件

```js
// promise: 绑定promise钩子的API
myCar.hooks.calculateRoutes.tapPromise(
  'GoogleMapsPlugin',
  (source, target, routesList) => {
    // return a promise
    return google.maps.findRoute(source, target).then((route) => {
      routesList.add(route);
    });
  },
);
// tapAsync:绑定异步钩子的API
myCar.hooks.calculateRoutes.tapAsync(
  'BingMapsPlugin',
  (source, target, routesList, callback) => {
    bing.findRoute(source, target, (err, route) => {
      if (err) return callback(err);
      routesList.add(route);
      // call the callback
      callback();
    });
  },
);

// You can still use sync plugins
// tap: 绑定同步钩子的API
myCar.hooks.calculateRoutes.tap(
  'CachedRoutesPlugin',
  (source, target, routesList) => {
    const cachedRoute = cache.get(source, target);
    if (cachedRoute) routesList.add(cachedRoute);
  },
);
```

The class declaring these hooks need to call them:
类中声明的那些钩子需要被调用

```js
class Car {
  /**
   * You won't get returned value from SyncHook or AsyncParallelHook,
   * to do that, use SyncWaterfallHook and AsyncSeriesWaterfallHook respectively
   **/

  setSpeed(newSpeed) {
    // call(xx) 传参调用同步钩子的API
    // following call returns undefined even when you returned values
    this.hooks.accelerate.call(newSpeed);
  }

  useNavigationSystemPromise(source, target) {
    const routesList = new List();
    // 调用promise钩子(钩子返回一个promise)的API
    return this.hooks.calculateRoutes
      .promise(source, target, routesList)
      .then((res) => {
        // res is undefined for AsyncParallelHook
        return routesList.getRoutes();
      });
  }

  useNavigationSystemAsync(source, target, callback) {
    const routesList = new List();
    // 调用异步钩子API
    this.hooks.calculateRoutes.callAsync(source, target, routesList, (err) => {
      if (err) return callback(err);
      callback(null, routesList.getRoutes());
    });
  }
}
```

The Hook will compile a method with the most efficient way of running your plugins. It generates code depending on:
tapable 会用最有效率的方式去编译(构建)一个运行你的插件的方法,他生成的代码依赖于以下几点:

- The number of registered plugins (none, one, many)
  你注册的插件的个数.
- The kind of registered plugins (sync, async, promise)
  你注册插件的类型.
- The used call method (sync, async, promise)
  你使用的调用方法(call, promise, async) // 其实这个类型已经包括了
- The number of arguments
  钩子参数的个数 // 就是你 new xxxHook(['ooo']) 传入的参数
- Whether interception is used
  是否应用了拦截器(拦截器下面有讲)

This ensures fastest possible execution.
这些确定了尽可能快的执行.

## Hook types 钩子类型

Each hook can be tapped with one or several functions. How they are executed depends on the hook type:
每一个钩子都可以 tap 一个或者多个函数, 他们如何运行,取决于他们的钩子类型

- Basic hook (without “Waterfall”, “Bail” or “Loop” in its name). This hook simply calls every function it tapped in a row.
  基本的钩子, (钩子类名没有 waterfall, Bail, 或者 Loop 的 ), 这个钩子只会简单的调用每个 tap 进去的函数
- **Waterfall**. A waterfall hook also calls each tapped function in a row. Unlike the basic hook, it passes a return value from each function to the next function.
  Waterfall, 一个 waterfall 钩子,也会调用每个 tap 进去的函数,不同的是,他会从每一个函数传一个返回的值到下一个函数
- **Bail**. A bail hook allows exiting early. When any of the tapped function returns anything, the bail hook will stop executing the remaining ones.
  Bail, Bail 钩子允许更早的退出,当任何一个 tap 进去的函数,返回任何值, bail 类会停止执行其他的函数执行.(类似 Promise.race())
- **Loop**. When a plugin in a loop hook returns a non-undefined value the hook will restart from the first plugin. It will loop until all plugins return undefined.
  Loop, TODO(我.... 这里也没描述,应该是写文档得时候 还没想好这个要怎么写,我尝试看他代码去补全,不过可能需要点时间.)

Additionally, hooks can be synchronous or asynchronous. To reflect this, there’re “Sync”, “AsyncSeries”, and “AsyncParallel” hook classes:
此外,钩子可以是同步的,也可以是异步的,Sync, AsyncSeries 和 AsyncParallel ,从名字就可以看出,哪些是可以绑定异步函数的

- **Sync**. A sync hook can only be tapped with synchronous functions (using `myHook.tap()`).
  Sync, 一个同步钩子只能 tap 同步函数, 不然会报错.

- **AsyncSeries**. An async-series hook can be tapped with synchronous, callback-based and promise-based functions (using `myHook.tap()`, `myHook.tapAsync()` and `myHook.tapPromise()`). They call each async method in a row.
  AsyncSeries, 一个 async-series 钩子 可以 tap 同步钩子, 基于回调的钩子(我估计是类似 chunk 的东西)和一个基于 promise 的钩子(使用 myHook.tap(), myHook.tapAsync() 和 myHook.tapPromise().).他会按顺序的调用每个方法.

- **AsyncParallel**. An async-parallel hook can also be tapped with synchronous, callback-based and promise-based functions (using `myHook.tap()`, `myHook.tapAsync()` and `myHook.tapPromise()`). However, they run each async method in parallel.
  AsyncParallel, 一个 async-parallel 钩子跟上面的 async-series 一样 不同的是他会把异步钩子并行执行(并行执行就是把异步钩子全部一起开启,不按顺序执行).

The hook type is reflected in its class name. E.g., `AsyncSeriesWaterfallHook` allows asynchronous functions and runs them in series, passing each function’s return value into the next function.

## Interception 拦截器

All Hooks offer an additional interception API:
所有钩子都提供额外的拦截器 API

```js
myCar.hooks.calculateRoutes.intercept({
  call: (source, target, routesList) => {
    console.log('Starting to calculate routes');
  },
  register: (tapInfo) => {
    // tapInfo = { type: "promise", name: "GoogleMapsPlugin", fn: ... }
    console.log(`${tapInfo.name} is doing its job`);
    return tapInfo; // may return a new tapInfo object
  },
});
```

**call**: `(...args) => void` Adding `call` to your interceptor will trigger when hooks are triggered. You have access to the hooks arguments.
call:(...args) => void 当你的钩子触发之前,(就是 call()之前),就会触发这个函数,你可以访问钩子的参数.多个钩子执行一次

**tap**: `(tap: Tap) => void` Adding `tap` to your interceptor will trigger when a plugin taps into a hook. Provided is the `Tap` object. `Tap` object can't be changed.
tap: (tap: Tap) => void 每个钩子执行之前(多个钩子执行多个),就会触发这个函数

**loop**: `(...args) => void` Adding `loop` to your interceptor will trigger for each loop of a looping hook.
loop:(...args) => void 这个会为你的每一个循环钩子(LoopHook, 就是类型到 Loop 的)触发,具体什么时候没说

**register**: `(tap: Tap) => Tap | undefined` Adding `register` to your interceptor will trigger for each added `Tap` and allows to modify it.
register:(tap: Tap) => Tap | undefined 每添加一个 Tap 都会触发 你 interceptor 上的 register,你下一个拦截器的 register 函数得到的参数 取决于你上一个 register 返回的值,所以你最好返回一个 tap 钩子.

## Context 上下文

Plugins and interceptors can opt-in to access an optional `context` object, which can be used to pass arbitrary values to subsequent plugins and interceptors.
插件和拦截器都可以选择加入一个可选的 context 对象, 这个可以被用于传递随意的值到队列中的插件和拦截器.

```js
myCar.hooks.accelerate.intercept({
  context: true,
  tap: (context, tapInfo) => {
    // tapInfo = { type: "sync", name: "NoisePlugin", fn: ... }
    console.log(`${tapInfo.name} is doing it's job`);

    // `context` starts as an empty object if at least one plugin uses `context: true`.
    // 如果最少有一个插件使用 `context` 那么context 一开始是一个空的对象
    // If no plugins use `context: true`, then `context` is undefined.
    // 如过tap进去的插件没有使用`context` 的 那么内部的`context` 一开始就是undefined
    if (context) {
      // Arbitrary properties can be added to `context`, which plugins can then access.
      // 任意属性都可以添加到`context`, 插件可以访问到这些属性
      context.hasMuffler = true;
    }
  },
});

myCar.hooks.accelerate.tap(
  {
    name: 'NoisePlugin',
    context: true,
  },
  (context, newSpeed) => {
    if (context && context.hasMuffler) {
      console.log('Silence...');
    } else {
      console.log('Vroom!');
    }
  },
);
```

## HookMap

A HookMap is a helper class for a Map with Hooks
一个 HookMap 是一个 Hooks 映射的帮助类

```js
const keyedHook = new HookMap((key) => new SyncHook(['arg']));
```

```js
keyedHook.for('some-key').tap('MyPlugin', (arg) => {
  /* ... */
});
keyedHook.for('some-key').tapAsync('MyPlugin', (arg, callback) => {
  /* ... */
});
keyedHook.for('some-key').tapPromise('MyPlugin', (arg) => {
  /* ... */
});
```

```js
const hook = keyedHook.get('some-key');
if (hook !== undefined) {
  hook.callAsync('arg', (err) => {
    /* ... */
  });
}
```

## Hook/HookMap interface 钩子映射接口

Public:
权限公开的

```ts
interface Hook {
  tap: (name: string | Tap, fn: (context?, ...args) => Result) => void;
  tapAsync: (
    name: string | Tap,
    fn: (context?, ...args, callback: (err, result: Result) => void) => void,
  ) => void;
  tapPromise: (
    name: string | Tap,
    fn: (context?, ...args) => Promise<Result>,
  ) => void;
  intercept: (interceptor: HookInterceptor) => void;
}

interface HookInterceptor {
  call: (context?, ...args) => void;
  loop: (context?, ...args) => void;
  tap: (context?, tap: Tap) => void;
  register: (tap: Tap) => Tap;
  context: boolean;
}

interface HookMap {
  for: (key: any) => Hook;
  intercept: (interceptor: HookMapInterceptor) => void;
}

interface HookMapInterceptor {
  factory: (key: any, hook: Hook) => Hook;
}

interface Tap {
  name: string;
  type: string;
  fn: Function;
  stage: number;
  context: boolean;
  before?: string | Array;
}
```

Protected (only for the class containing the hook):
保护的权限,只用于类包含的(里面的)钩子

```ts
interface Hook {
  isUsed: () => boolean;
  call: (...args) => Result;
  promise: (...args) => Promise<Result>;
  callAsync: (...args, callback: (err, result: Result) => void) => void;
}

interface HookMap {
  get: (key: any) => Hook | undefined;
  for: (key: any) => Hook;
}
```

## MultiHook

A helper Hook-like class to redirect taps to multiple other hooks:
把其他的 Hook 重定向(转化)成为一个 MultiHook

```js
const { MultiHook } = require('tapable');

this.hooks.allHooks = new MultiHook([this.hooks.hookA, this.hooks.hookB]);
```
