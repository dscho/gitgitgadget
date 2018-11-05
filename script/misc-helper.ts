import commander = require("commander");
import { CIHelper } from "../lib/ci-helper";
import { gitConfig } from "../lib/git";
import { GitNotes } from "../lib/git-notes";
import { GitGitGadget, IGitGitGadgetOptions } from "../lib/gitgitgadget";
import { GitHubGlue } from "../lib/github-glue";
import { toJSON } from "../lib/json-util";
import { IPatchSeriesMetadata } from "../lib/patch-series-metadata";

commander.version("1.0.0")
    .usage("[options] ( update-open-prs | inspect-pr | "
        + "lookup-upstream-commit | "
        + "annotate-commit <pr-number> <original> <git.git> )")
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

async function getNotes(): Promise<GitNotes> {
    return new GitNotes(await getWorkDir());
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
                console.log(`No meta found for ${pr.pullRequestURL}`);
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
            await notes.set("", options, true);
        }
    } else if (command === "inspect-pr") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: needs one argument\n`);
            process.exit(1);
        }
        const pullRequestURL = commander.args[1];
        const notes = await getNotes();

        const data = await notes.get<IPatchSeriesMetadata>(pullRequestURL);
        console.log(`${pullRequestURL}:\n\n${JSON.stringify(data, null, 4)}`);
    } else if (command === "lookup-upstream-commit") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: needs one argument\n`);
            process.exit(1);
        }
        const commit = commander.args[1];

        const ci = new CIHelper(await getWorkDir());
        const upstreamCommit = await ci.identifyUpstreamCommit(commit);
        console.log(`Upstream commit for ${commit}: ${upstreamCommit}`);
    } else if (command === "set-previous-iteration") {
        if (commander.args.length !== 9) {
            process.stderr.write(`${command}: needs PR URL, iteration, ${
                ""}cover-letter Message ID, latest tag, ${
                ""}base commit, base label, head commit, head label\n`);
            process.exit(1);
        }
        const pullRequestURL = commander.args[1];
        const iteration = parseInt(commander.args[2], 10);
        const coverLetterMessageId = commander.args[3];
        const latestTag = commander.args[4];
        const baseCommit = commander.args[5];
        const baseLabel = commander.args[6];
        const headCommit = commander.args[7];
        const headLabel = commander.args[8];

        const notes = await getNotes();
        // await notes.update();

        const data = await notes.get<IPatchSeriesMetadata>(pullRequestURL);
        if (data !== undefined) {
            process.stderr.write(`Found existing data for ${pullRequestURL}: ${
                JSON.stringify(data, null, 4)}`);
            process.exit(1);
        }
        const newData = {
            baseCommit,
            baseLabel,
            coverLetterMessageId,
            headCommit,
            headLabel,
            iteration,
            latestTag,
            pullRequestURL,
        } as IPatchSeriesMetadata;
        console.log(`data: ${JSON.stringify(newData, null, 4)}`);
        await notes.set(pullRequestURL, newData);
    } else if (command === "update-commit-mapping") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: needs Message-ID\n`);
            process.exit(1);
        }

        const messageID = commander.args[1];

        const workDir = await getWorkDir();
        const ci = new CIHelper(workDir);
        const result = await ci.updateCommitMapping(messageID);
        console.log(`Result: ${result}`);
    } else if (command === "annotate-commit") {
        if (commander.args.length !== 4) {
            process.stderr.write(`${command}: needs 3 parameters: ${
                ""}PR number, original and git.git commit\n`);
            process.exit(1);
        }

        const prNumber = commander.args[1];
        const originalCommit = commander.args[2];
        const gitGitCommit = commander.args[3];

        const workDir = await getWorkDir();
        const branchName = `refs/pull/${prNumber}/head`;
        const glue = new GitHubGlue(workDir);
        const id = await glue.annotateCommit(branchName,
            originalCommit, gitGitCommit);
        console.log(`Created check with id ${id}`);
    } else if (command === "identify-merge-commit") {
        if (commander.args.length !== 3) {
            process.stderr.write(`${command}: needs 2 parameters: ${
                ""}upstream branch and tip commit\n`);
            process.exit(1);
        }
        const upstreamBranch = commander.args[1];
        const commit = commander.args[2];

        const workDir = await getWorkDir();
        const ci = new CIHelper(workDir);

        const result = await ci.identifyMergeCommit(upstreamBranch, commit);
        console.log(result);
    } else if (command === "get-gitgitgadget-options") {
        if (commander.args.length !== 1) {
            process.stderr.write(`${command}: no argument accepted\n`);
            process.exit(1);
        }

        const workDir = await getWorkDir();
        const notes = new GitNotes(workDir);

        console.log(toJSON(await notes.get("")));
    } else if (command === "get-mail-meta") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: need a Message-ID\n`);
            process.exit(1);
        }
        const messageID = commander.args[1];

        const workDir = await getWorkDir();
        const notes = new GitNotes(workDir);

        console.log(toJSON(await notes.get(messageID)));
    } else if (command === "get-pr-meta") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: need a Pull Request number\n`);
            process.exit(1);
        }
        const prNumber = commander.args[1];

        const pullRequestURL =
            `https://github.com/gitgitgadget/git/pull/${prNumber}`;
        const workDir = await getWorkDir();
        const ci = new CIHelper(workDir);

        console.log(toJSON(await ci.getPRMeta(pullRequestURL)));
    } else {
        process.stderr.write(`${command}: unhandled sub-command\n`);
        process.exit(1);
    }
})().catch((reason) => {
    process.stderr.write(`Caught error ${reason}:\n${reason.stack}\n`);
    process.exit(1);
});
