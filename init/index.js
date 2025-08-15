async function run() {
  const { CIHelper } = await import("../dist/index.js")

  const core = CIHelper.getActionsCore()

  // help dugite realize where `git` is...
  process.env.LOCAL_GIT_DIRECTORY = "/usr/"

  const config = await CIHelper.getConfig()
  await CIHelper.initializeWorkDir("git", config)
  const ci = new CIHelper("git", config, true)

  ci.setAccessToken("gitgitgadget", core.getInput("gitgitgadget-git-token"))
  ci.setAccessToken("git", core.getInput("git-git-token"))
}

run()
