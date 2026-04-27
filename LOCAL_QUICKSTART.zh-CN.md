# Ralph 本机速用指南

这份说明是按这台电脑当前环境整理的。

已确认可用：
- `git`
- `jq`
- `node`
- `claude`（Claude Code 已登录）

当前最适合你的使用方式是：`Claude Code + Ralph`。

## Ralph 是什么

Ralph 不是一个应用本身，而是一套“反复调用 AI 编码工具完成 PRD 任务”的自动循环。

它的工作方式很简单：
1. 读取 `prd.json`
2. 找到最高优先级且 `passes: false` 的故事
3. 启动一个全新的 Claude Code 会话，只做这一件事
4. 跑类型检查/测试
5. 成功后提交代码，并把该故事标记为完成
6. 继续下一轮，直到全部完成

重点是：**每一轮都是全新的上下文**。它依赖 `git` 历史、`progress.txt` 和 `prd.json` 作为“长期记忆”。

## 最适合的使用场景

适合：
- 已经存在的项目仓库
- 明确、可拆分的小需求
- 有基本反馈回路，比如 `typecheck`、`test`、`lint`

不太适合：
- 一个故事里塞进整块大功能
- 项目没有测试/检查命令
- 你希望它一次性“从零做完整个产品”

## 第一次使用的推荐方式

假设你有一个自己的项目目录，例如：

```bash
cd /path/to/your-project
```

先确保它本身是一个 git 仓库：

```bash
git status
```

然后把 Ralph 的核心文件放进你的项目：

```bash
mkdir -p scripts/ralph
cp /Users/xuan/Desktop/ralph/ralph.sh scripts/ralph/
cp /Users/xuan/Desktop/ralph/CLAUDE.md scripts/ralph/
chmod +x scripts/ralph/ralph.sh
```

接着在你的项目里准备一个 `prd.json`：

```bash
cp /Users/xuan/Desktop/ralph/prd.json.example scripts/ralph/prd.json
```

然后编辑 `scripts/ralph/prd.json`，把里面的项目名、分支名、需求描述、用户故事改成你的真实任务。

## `prd.json` 怎么写

一个最小可运行的 Ralph 任务，至少要包含：

- `project`
- `branchName`
- `description`
- `userStories`

每个 `userStories` 条目建议满足：
- 只做一件事
- 能在一轮 Claude Code 会话里完成
- 验收条件可检查
- 默认 `passes` 设为 `false`

一个好故事的例子：

```json
{
  "id": "US-001",
  "title": "Add status field to tasks table",
  "description": "As a developer, I need to store task status in the database.",
  "acceptanceCriteria": [
    "Add status column to tasks table",
    "Generate and run migration successfully",
    "Typecheck passes"
  ],
  "priority": 1,
  "passes": false,
  "notes": ""
}
```

## 在你的项目里运行 Ralph

进入你的项目后执行：

```bash
cd /path/to/your-project/scripts/ralph
./ralph.sh --tool claude 5
```

这里的 `5` 表示最多跑 5 轮。第一次我建议从 `3` 到 `5` 开始。

如果你省略轮数，默认是 `10`。

## 运行后你会看到什么

Ralph 会：

1. 根据 `branchName` 切换或创建分支
2. 读取最高优先级未完成故事
3. 调用 Claude Code 执行该故事
4. 通过后提交 commit
5. 把该故事的 `passes` 更新为 `true`
6. 把经验写进 `progress.txt`

关键文件：
- `scripts/ralph/prd.json`
- `scripts/ralph/progress.txt`

你可以随时查看进度：

```bash
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'
```

看最近做了什么：

```bash
cat scripts/ralph/progress.txt
git log --oneline -10
```

## 你这台机器上的最短实践路径

最建议这样开始：

1. 找一个你自己的小项目仓库
2. 只写 2 到 3 个很小的 user stories
3. 每个 story 都加上 `Typecheck passes`
4. 如果是前端改动，再加 `Verify in browser using dev-browser skill`
5. 先运行 `./ralph.sh --tool claude 3`
6. 跑完后检查 commit、`progress.txt` 和 `prd.json`

## 常见坑

- 故事太大：Ralph 最容易失败的原因就是 story 太胖。
- 验收条件太虚：像“体验更好”“正常工作”这种不够可验证。
- 项目没有检查命令：没有 `typecheck/test/lint` 时，自动循环容易把错误积累起来。
- 把 Ralph 当成“全自动产品经理 + 程序员”：它更像一个强执行循环器，不负责替你定义完整战略。

## 这台机器当前结论

你现在已经具备直接试用 Ralph 的基础条件：
- 本地仓库已拉取到 `/Users/xuan/Desktop/ralph`
- `claude` 命令可用
- Claude Code 已登录
- `jq` 已安装

差的不是环境，而是“要喂给 Ralph 的目标项目”和“拆得够小的 `prd.json`”。

## 一个实用建议

第一次不要拿核心业务功能试。先拿一个低风险的小需求，例如：
- 给列表页加一个筛选器
- 给表单补一个字段
- 给设置页增加一个开关
- 给已有接口补一个校验

这样你能很快判断这套模式是否适合你的项目。
