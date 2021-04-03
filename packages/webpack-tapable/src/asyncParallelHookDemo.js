// let { AsyncParallelHook } = require('tapable');
let AsyncParallelHook = require('./AsyncParallelHook.js');

class Lesson {
  constructor() {
    this.hooks = {
      arch: new AsyncParallelHook(['name']),
    };
  }
  // 注册监听函数
  regist() {
    // this.hooks.arch.tapAsync('node', function (name, cb) {
    //   setTimeout(() => {
    //     console.log(name, ' learn node');
    //     cb();
    //   }, 1000);
    // });
    // this.hooks.arch.tapAsync('react', function (name, cb) {
    //   setTimeout(() => {
    //     console.log(name, ' learn react');
    //     cb();
    //   }, 1000);
    // });
    this.hooks.arch.tapPromise('webpack', (name) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          console.log('webpack', name);
          resolve();
        }, 1000);
      });
    });
    this.hooks.arch.tapPromise('typescript', (name) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          console.log('typescript', name);
          resolve();
        }, 1000);
      });
    });
  }
  // 启动
  start(...args) {
    // this.hooks.arch.callAsync('gornin', function () {
    //   console.log('end');
    // });
    // 1. 注册任务，使用tap/tapAsync/tapPromise等方法，内部维护一个数组保存这些task
    // 2. 本地start启动，会调用hook实例中的call/callAsync/promise等方法，
    // 3. 这些方法其实就是按规则执行tasks里注册的任务，完成后再执行回调或then中函数
    this.hooks.arch.promise('gornin').then(function () {
      console.log('end');
    });
  }
}

let lesson = new Lesson();
lesson.regist();
lesson.start();
