class SyncWaterfallHook {
  constructor() {
    this.tasks = [];
  }
  // tap 其实干的事挺简单，就是把新task加入tasks队列中去
  tap(name, task) {
    this.tasks.push(task);
  }
  call(...args) {
    // let result = args;
    // let index = 0;
    // do {
    //   result = this.tasks[index++](result);
    // } while (index < this.tasks.length);
    let [first, ...other] = this.tasks;
    let result = first(...args);
    other.reduce((a, b) => {
      return b(a);
    }, result);
  }
}

module.exports = SyncWaterfallHook;
