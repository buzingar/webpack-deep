// let { SyncHook } = require('tapable');
let SyncHook = require('./SyncHook.js');

class Lesson {
  constructor() {
    this.hooks = {
      arch: new SyncHook(['name']),
    };
  }
  // 用来注册，监听函数
  regist() {
    this.hooks.arch.tap('node', function (name) {
      console.log(name, 'learn node');
    });
    this.hooks.arch.tap('react', function (name) {
      console.log(name, 'learn react');
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
