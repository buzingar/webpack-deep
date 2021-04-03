// let { SyncWaterfallHook } = require('tapable');
let SyncWaterfallHook = require('./SyncWaterfallHook.js');

class Lesson {
  constructor() {
    this.hooks = {
      arch: new SyncWaterfallHook(['name']),
    };
  }
  // 用来注册，监听函数
  regist() {
    this.hooks.arch.tap('node', function (name) {
      console.log(name, 'learn node');
      return 'node is great';
    });
    this.hooks.arch.tap('react', function (data) {
      console.log(data, ', react is also great.');
    });
  }
  // 启动
  start() {
    this.hooks.arch.call('gornin');
  }
}

let lesson = new Lesson();
lesson.regist(); // 注册两个事件
lesson.start(); // 启动钩子
