// let { AsyncSeriesWaterfallHook } = require('tapable');
let AsyncSeriesWaterfallHook = require('./AsyncSeriesWaterfallHook.js');

class Lesson {
  constructor() {
    this.hooks = {
      arch: new AsyncSeriesWaterfallHook(['name']),
    };
  }
  regist() {
    this.hooks.arch.tapAsync('node', function (name, cb) {
      setTimeout(() => {
        console.log('node', name);
        cb(null, 'result');
      }, 2000);
    });
    this.hooks.arch.tapAsync('react', function (data, cb) {
      setTimeout(() => {
        console.log('react', data);
        cb();
      }, 1000);
    });
    // this.hooks.arch.tapPromise('node', function (name) {
    //   return new Promise((resolve, reject) => {
    //     setTimeout(() => {
    //       console.log('node', name);
    //       resolve();
    //     }, 2000);
    //   });
    // });
    // this.hooks.arch.tapPromise('react', function (name) {
    //   return new Promise((resolve, reject) => {
    //     setTimeout(() => {
    //       console.log('react', name);
    //       resolve();
    //     }, 1000);
    //   });
    // });
  }
  start() {
    this.hooks.arch.callAsync('gornin', function () {
      console.log('end');
    });
    // this.hooks.arch.promise('gornin').then(function () {
    //   console.log('end');
    // });
  }
}

let lesson = new Lesson();

lesson.regist();
lesson.start();
