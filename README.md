| 命令            | 解释                                                       |
| --------------- | ---------------------------------------------------------- |
| lerna bootstrap | 安装依赖                                                   |
| lerna clean     | 删除各个包下的 node_modules                                |
| lerna init      | 创建新的 lerna 库                                          |
| lerna list      | 显示 package 列表                                          |
| lerna changed   | 显示自上次 relase tag 以来有修改的包， 选项通 list         |
| lerna diff      | 显示自上次 relase tag 以来有修改的包的差异， 执行 git diff |
| lerna exec      | 在每个包目录下执行任意命令                                 |
| lerna run       | 执行每个包 package.json 中的脚本命令                       |
| lerna add       | 添加一个包的版本为各个包的依赖                             |
| lerna import    | 引入 package                                               |
| lerna link      | 链接互相引用的库                                           |
| lerna create    | 新建 package                                               |
| lerna publish   | 发布                                                       |
