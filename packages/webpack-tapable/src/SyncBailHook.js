// bail 保释，安全
class SyncBailHook {
  constructor() {
    this.tasks = [];
  }
  tap(name, task) {
    this.tasks.push(task);
  }
  call(...args) {
    let flag; // 当前返回值
    let index = 0;
    while (flag === undefined && index < this.tasks.length) {
      flag = this.tasks[index++](...args);
    }
  }
}

module.exports = SyncBailHook;
