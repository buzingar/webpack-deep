// let { AsyncSeriesHook } = require('tapable');
let AsyncSeriesHook = require('./AsyncSeriesHook.js');

class Lesson {
  constructor() {
    this.hooks = {
      arch: new AsyncSeriesHook(['name']),
    };
  }
  regist() {
    // this.hooks.arch.tapAsync('node', function (name, cb) {
    //   console.log('node', name);
    //   cb();
    // });
    // this.hooks.arch.tapAsync('react', function (name, cb) {
    //   console.log('react', name);
    //   cb();
    // });
    this.hooks.arch.tapPromise('node', function (name) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          console.log('node', name);
          resolve();
        }, 2000);
      });
    });
    this.hooks.arch.tapPromise('react', function (name) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          console.log('react', name);
          resolve();
        }, 1000);
      });
    });
  }
  start() {
    // this.hooks.arch.callAsync('gornin', function () {
    //   console.log('end');
    // });
    this.hooks.arch.promise('gornin').then(function () {
      console.log('end');
    });
  }
}

let lesson = new Lesson();

lesson.regist();
lesson.start();
