class SyncHook {
  constructor(args) {
    // args => ['name']
    this.tasks = [];
  }
  tap(name, task) {
    this.tasks.push(task);
  }
  call(...args) {
    this.tasks.forEach((task) => {
      task(...args);
    });
  }
}

module.exports = SyncHook;
