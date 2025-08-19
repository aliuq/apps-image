export interface GitCommitInfo {
  /** 提交信息 */
  commitMessage: string
  /** 提交作者 */
  commitAuthor: string
  /** 提交日期 */
  commitDate: string
  /** 修改的文件数量 */
  changedFiles: number
  /** 添加的行数 */
  additions: number
  /** 删除的行数 */
  deletions: number
  /** 最近的提交记录 */
  recentCommits: string[]
}
