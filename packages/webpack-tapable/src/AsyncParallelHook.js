class AsyncParallelHook {
  constructor(args) {
    this.tasks = [];
  }
  tapAsync(name, task) {
    this.tasks.push(task);
  }
  tapPromise(name, task) {
    this.tasks.push(task);
  }
  callAsync(...args) {
    let finalCB = args.pop();

    let index = 0;
    let cb = () => {
      index++;
      if (index === this.tasks.length) {
        finalCB();
      }
    };

    this.tasks.forEach((task) => {
      task(...args, cb);
    });
  }
  promise(...args) {
    let tasks = this.tasks.map((task) => task(...args));
    // 执行返回的是包含promise对象的数组，Promise.all() 保证全部执行完毕
    return Promise.all(tasks);
  }
}

module.exports = AsyncParallelHook;
