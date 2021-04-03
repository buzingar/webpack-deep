// let { SyncBailHook } = require('tapable');
let SyncBailHook = require('./SyncBailHook.js');

class Lesson {
  constructor() {
    this.hooks = {
      arch: new SyncBailHook(['name']),
    };
  }
  // 注册监听函数
  regist() {
    this.hooks.arch.tap('node', function (name) {
      console.log(name, ' learn node');
      return 'pause'; // 非 undefined 都会导致流程中断
    });
    this.hooks.arch.tap('react', function (name) {
      console.log(name, ' learn react');
    });
  }
  // 启动
  start(...args) {
    this.hooks.arch.call('gornin');
  }
}

let lesson = new Lesson();

lesson.regist();

lesson.start();
