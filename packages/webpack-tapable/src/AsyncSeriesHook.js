class AsyncSeriesHook {
  constructor() {
    this.tasks = [];
  }
  tapAsync(name, task) {
    this.tasks.push(task);
  }
  tapPromise(name, task) {
    this.tasks.push(task);
  }
  callAsync(...args) {
    let finalCb = args.pop();
    let index = 0;

    let next = () => {
      if (this.tasks.length === index) {
        return finalCb();
      }
      this.tasks[index++](...args, next);
    };

    next();
  }
  promise(...args) {
    let [first, ...others] = this.tasks;
    // 串行，前一个task执行完返回promise，then中继续执行下一个task
    // reduce 累加器
    return others.reduce((p, n) => {
      return p.then(() => n(...args));
    }, first(...args));
  }
}

module.exports = AsyncSeriesHook;
