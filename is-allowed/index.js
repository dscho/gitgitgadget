async function run() {
  const { CIHelper } = await import("../dist/index.js")

  const login = CIHelper.getActionsCore().getInput("login")

  const ci = new CIHelper()
  await ci.setupGitHubAction()
  console.log(
    `User '${login}' is ${(await ci.isAllowed(login)) ? "" : "not "}allowed to use GitGitGadget.`,
  )
}

run()
