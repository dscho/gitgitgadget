import commander = require("commander");
import { CIHelper } from "../lib/ci-helper";
import { gitConfig } from "../lib/git";
import { GitGitGadget, IGitGitGadgetOptions } from "../lib/gitgitgadget";
import { GitHubGlue } from "../lib/github-glue";

commander.version("1.0.0")
    .usage("[options] ( update-open-prs | lookup-upstream-commit )")
    .description("Command-line helper for GitGitGadget")
    .option("-w, --work-dir [directory]",
        "Use a different working directory than '.'", ".")
    .parse(process.argv);

if (commander.args.length === 0) {
    commander.help();
}

async function getWorkDir(): Promise<string> {
    if (!commander.workDir) {
        commander.workDir = await gitConfig("gitgitgadget.workDir");
        if (!commander.workDir) {
            throw new Error(`Could not determine gitgitgadget.workDir`);
        }
    }
    return commander.workDir;
}

(async () => {
    const command = commander.args[0];
    if (command === "update-open-prs") {
        if (commander.args.length !== 1) {
            process.stderr.write(`${command}: does not accept arguments\n`);
            process.exit(1);
        }

        const gitGitGadget = await GitGitGadget.get(commander.workDir);
        const gitHub = new GitHubGlue(commander.workDir);
        const notes = gitGitGadget.notes;
        if (!notes.workDir) {
            throw new Error(`GitNotes without a workDir?`);
        }
        const ci = new CIHelper(notes.workDir);

        const options = await notes.get<IGitGitGadgetOptions>("");
        if (!options) {
            throw new Error(`no GitGitGadget options yet?`);
        }
        let optionsChanged: boolean = false;
        if (!options.openPRs) {
            options.openPRs = {};
            optionsChanged = true;
        }
        if (!options.activeMessageIDs) {
            options.activeMessageIDs = {};
            optionsChanged = true;
        }

        const pullRequests = await gitHub.getOpenPRs();
        for (const pr of pullRequests) {
            const meta = await gitGitGadget.getPRMetadata(pr.pullRequestURL);
            if (!meta) {
                continue;
            }

            const url: string = pr.pullRequestURL;
            if (meta.coverLetterMessageId &&
                options.openPRs[url] === undefined) {
                options.openPRs[url] = meta.coverLetterMessageId;
                optionsChanged = true;
            }

            if (meta.baseCommit && meta.headCommit) {
                for (const rev of await ci.getOriginalCommitsForPR(meta)) {
                    const messageID = await notes.getLastCommitNote(rev);
                    if (messageID &&
                        options.activeMessageIDs[messageID] === undefined) {
                        options.activeMessageIDs[messageID] = rev;
                        optionsChanged = true;
                    }
                }
            }
        }

        if (optionsChanged) {
            console.log(`Changed options:\n${
                JSON.stringify(options, null, 4)}`);
            // await notes.set("", options, true);
        }
    } else if (command === "lookup-upstream-commit") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: needs one argument\n`);
            process.exit(1);
        }
        const commit = commander.args[1];

        const ci = new CIHelper(await getWorkDir());
        const upstreamCommit = await ci.identifyUpstreamCommit(commit);
        console.log(`Upstream commit for ${commit}: ${upstreamCommit}`);
    } else {
        process.stderr.write(`${command}: unhandled sub-command\n`);
        process.exit(1);
    }
})().catch((reason) => {
    process.stderr.write(`Caught error ${reason}:\n${new Error().stack}\n`);
    process.exit(1);
});
