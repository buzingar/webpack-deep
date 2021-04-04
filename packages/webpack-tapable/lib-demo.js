let SyncHook = require('./lib/SyncHook.js');

// 1-0
let hook = new SyncHook(['options']);

// 2-0
hook.tap('A', function (arg) {
  console.log('a', arg);
  return 'b'; // 除非你在拦截器上的 register 上调用这个函数,不然这个返回值你拿不到.
});
hook.tap('B', function () {
  console.log('b');
});
hook.tap('C', function () {
  console.log('c');
});
hook.tap('D', function () {
  console.log('d');
});
hook.tap(
  {
    name: 'E',
    before: 'A',
  },
  () => {
    console.log('I am E');
  },
);

// 3-0
hook.intercept({
  call: (...args) => {
    // 调用call时执行
    console.log(...args, '-------------intercept call');
  },
  register: (tap) => {
    // 会先执行这里
    console.log(tap, '------------------intercept register');
    return tap;
  },
  loop: (...args) => {
    console.log(...args, '-------------intercept loop');
  },
  tap: (tap) => {
    console.log(tap, '-------------------intercept tap');
  },
});
// 4-0 这里就是要执行tap添加的task，同步执行
hook.call(6);
