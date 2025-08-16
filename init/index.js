async function run() {
  const { CIHelper } = await import("../dist/index.js")
  const { execSync } = await import("child_process")

  const core = CIHelper.getActionsCore()

  // help dugite realize where `git` is...
  process.env.LOCAL_GIT_DIRECTORY = "/usr/"
  process.env.GIT_EXEC_PATH = "/usr/lib/git-core"

  console.log(`Git version: ${await CIHelper.git(["--version"])}`)
  console.log(`Git exec path: ${await CIHelper.git(["--exec-path"])}`)
  try {
    console.log(execSync("ls -la /usr/lib/git-core 2>&1").toString("utf-8"))
  } catch (e) {
    console.error(e)
  }
  try {
    console.log(
      execSync("ldd /usr/lib/git-core/git-remote-https 2>&1").toString("utf-8"),
    )
  } catch (e) {
    console.error(e)
  }
  try {
    console.log(`Git remote-https: ${await CIHelper.git(["remote-https"])}`)
  } catch (e) {
    console.error(e)
  }

  const config = await CIHelper.getConfig()
  console.log(
    `initializing work directory with config: ${JSON.stringify(config)}`,
  )
  await CIHelper.initializeWorkDir("git", config)
  console.log(`constructing CIHelper`)
  const ci = new CIHelper("git", config, true)
  console.log(`setup done`)

  ci.setAccessToken(
    "gitgitgadget",
    core.getInput("gitgitgadget-git-access-token"),
  )
  ci.setAccessToken("git", core.getInput("git-git-access-token"))
  ci.setAccessToken("dscho", core.getInput("dscho-git-access-token"))

  for (const user of ["dscho", "xyz"]) {
    console.log(`user ${user} allowed: ${await ci.isAllowed(user)}`)
  }
  // add a reaction to
  // https://github.com/dscho/git/pull/29#issuecomment-791608460
  await ci.github.addReaction("dscho", "git", 791608460, "laugh")
}

run()
