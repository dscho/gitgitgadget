async function run() {
  const { CIHelper } = await import("../dist/index.js")

  try {
    CIHelper.checkRun()
  } catch (e) {
    console.error(e)
    process.exitCode = 1
  }
}

run()
