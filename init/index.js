async function run() {
  const { CIHelper } = await import("../dist/index.js")
  const { execSync } = await import("child_process")

  const core = CIHelper.getActionsCore()

  // help dugite realize where `git` is...
  process.env.LOCAL_GIT_DIRECTORY = "/usr/"

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
  console.log(
    `Git remote-https -h: ${await CIHelper.git(["remote-https", "-h"])}`,
  )

  const config = await CIHelper.getConfig()
  await CIHelper.initializeWorkDir("git", config)
  const ci = new CIHelper("git", config, true)

  ci.setAccessToken("gitgitgadget", core.getInput("gitgitgadget-git-token"))
  ci.setAccessToken("git", core.getInput("git-git-token"))
  ci.setAccessToken("dscho", core.getInput("dscho-git-token"))

  // add a reaction
  await ci.github.addReaction("dscho", "git", 791752382, "heart")
}

run()
