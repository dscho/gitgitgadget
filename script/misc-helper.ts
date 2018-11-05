import commander = require("commander");
import { CIHelper } from "../lib/ci-helper";
import { gitConfig } from "../lib/git";
import { GitNotes } from "../lib/git-notes";
import { IGitGitGadgetOptions } from "../lib/gitgitgadget";
import { GitHubGlue } from "../lib/github-glue";
import { toPrettyJSON } from "../lib/json-util";
import { IPatchSeriesMetadata } from "../lib/patch-series-metadata";

commander.version("1.0.0")
    .usage("[options] ( update-open-prs | inspect-pr | "
        + "lookup-upstream-commit | "
        + "annotate-commit <pr-number> <original> <git.git> )")
    .description("Command-line helper for GitGitGadget")
    .option("-w, --work-dir [directory]",
        "Use a different GitGitGadget working directory than '.'", ".")
    .parse(process.argv);

if (commander.args.length === 0) {
    commander.help();
}

async function getGitGitWorkDir(): Promise<string> {
    if (!commander.gitGitWorkDir) {
        commander.gitGitWorkDir = await gitConfig("gitgitgadget.workDir");
        if (!commander.gitGitWorkDir) {
            throw new Error(`Could not determine gitgitgadget.workDir`);
        }
    }
    return commander.gitGitWorkDir;
}

async function getCIHelper(): Promise<CIHelper> {
    return new CIHelper(await getGitGitWorkDir());
}

async function getNotes(): Promise<GitNotes> {
    return new GitNotes(await getGitGitWorkDir());
}

(async () => {
    const command = commander.args[0];
    if (command === "update-open-prs") {
        if (commander.args.length !== 1) {
            process.stderr.write(`${command}: does not accept arguments\n`);
            process.exit(1);
        }

        const ci = await getCIHelper();
        const gitHub = new GitHubGlue(ci.workDir);

        const options = await ci.notes.get<IGitGitGadgetOptions>("");
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
            const meta = await ci.getPRMetadata(pr.pullRequestURL);
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
                    const messageID = await ci.notes.getLastCommitNote(rev);
                    if (messageID &&
                        options.activeMessageIDs[messageID] === undefined) {
                        options.activeMessageIDs[messageID] = rev;
                        optionsChanged = true;
                    }
                }
            }
        }

        if (optionsChanged) {
            console.log(`Changed options:\n${ toPrettyJSON(options)}`);
            await ci.notes.set("", options, true);
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

        const ci = await getCIHelper();
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

        const ci = await getCIHelper();
        const result = await ci.updateCommitMapping(messageID);
        console.log(`Result: ${result}`);
    } else if (command === "annotate-commit") {
        if (commander.args.length !== 3) {
            process.stderr.write(`${command}: needs 2 parameters: ${
                ""}original and git.git commit\n`);
            process.exit(1);
        }

        const originalCommit = commander.args[1];
        const gitGitCommit = commander.args[2];

        const workDir = await getGitGitWorkDir();
        const glue = new GitHubGlue(workDir);
        const id = await glue.annotateCommit(originalCommit, gitGitCommit);
        console.log(`Created check with id ${id}`);
    } else if (command === "identify-merge-commit") {
        if (commander.args.length !== 3) {
            process.stderr.write(`${command}: needs 2 parameters: ${
                ""}upstream branch and tip commit\n`);
            process.exit(1);
        }
        const upstreamBranch = commander.args[1];
        const commit = commander.args[2];

        const ci = await getCIHelper();
        const result = await ci.identifyMergeCommit(upstreamBranch, commit);
        console.log(result);
    } else if (command === "get-gitgitgadget-options") {
        if (commander.args.length !== 1) {
            process.stderr.write(`${command}: no argument accepted\n`);
            process.exit(1);
        }

        const ci = await getCIHelper();
        console.log(toPrettyJSON(await ci.getGitGitGadgetOptions()));
    } else if (command === "get-mail-meta") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: need a Message-ID\n`);
            process.exit(1);
        }
        const messageID = commander.args[1];

        const workDir = await getGitGitWorkDir();
        const notes = new GitNotes(workDir);

        console.log(toPrettyJSON(await notes.get(messageID)));
    } else if (command === "get-pr-meta") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: need a Pull Request number\n`);
            process.exit(1);
        }
        const prNumber = commander.args[1];

        const pullRequestURL =
            `https://github.com/gitgitgadget/git/pull/${prNumber}`;
        const ci = await getCIHelper();
        console.log(toPrettyJSON(await ci.getPRMetadata(pullRequestURL)));
    } else if (command === "get-pr-commits") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: need a Pull Request number\n`);
            process.exit(1);
        }
        const prNumber = commander.args[1];

        const pullRequestURL =
            `https://github.com/gitgitgadget/git/pull/${prNumber}`;
        const ci = await getCIHelper();
        const prMeta = await ci.getPRMetadata(pullRequestURL);
        if (!prMeta) {
            throw new Error(`No metadata found for ${pullRequestURL}`);
        }
        console.log(toPrettyJSON(await ci.getOriginalCommitsForPR(prMeta)));
    } else if (command === "handle-pr") {
        if (commander.args.length !== 2) {
            process.stderr.write(`${command}: need a Pull Request number\n`);
            process.exit(1);
        }
        const prNumber = commander.args[1];

        const pullRequestURL =
            `https://github.com/gitgitgadget/git/pull/${prNumber}`;
        const ci = await getCIHelper();

        const meta = await ci.notes.get<IPatchSeriesMetadata>(pullRequestURL);
        if (!meta) {
            throw new Error(`No metadata for ${pullRequestURL}`);
        }

        const options = await ci.notes.get<IGitGitGadgetOptions>("");
        if (!options) {
            throw new Error("No GitGitGadget options?");
        }
        let optionsUpdated: boolean = false;
        if (!options.openPRs) {
            options.openPRs = {};
            optionsUpdated = true;
        }
        if (options.openPRs[pullRequestURL] === undefined) {
            if (meta.coverLetterMessageId) {
                options.openPRs[pullRequestURL] = meta.coverLetterMessageId;
                optionsUpdated = true;
            }
        }

        if (!options.activeMessageIDs) {
            options.activeMessageIDs = {};
            optionsUpdated = true;
        }

        let notesUpdated: boolean = false;
        if (meta.baseCommit && meta.headCommit) {
            for (const rev of await ci.getOriginalCommitsForPR(meta)) {
                const messageID = await ci.notes.getLastCommitNote(rev);
                if (messageID &&
                    options.activeMessageIDs[messageID] === undefined) {
                    options.activeMessageIDs[messageID] = rev;
                    optionsUpdated = true;
                    if (await ci.updateCommitMapping(messageID)) {
                        notesUpdated = true;
                    }
                }
            }
        }

        const [notesUpdated2, optionsUpdated2] =
            await ci.handlePR(pullRequestURL, options);
        if (notesUpdated2) {
            notesUpdated = true;
        }
        if (optionsUpdated || optionsUpdated2) {
            await ci.notes.set("", options, true);
            notesUpdated = true;
        }
        // if (result) {
        //     await git([
        //         "push",
        //         "https://github.com/gitgitgadget/git",
        //         ci.notes.notesRef,
        //     ]);
        // }
        console.log(notesUpdated);
    } else {
        process.stderr.write(`${command}: unhandled sub-command\n`);
        process.exit(1);
    }
})().catch((reason) => {
    process.stderr.write(`Caught error ${reason}:\n${reason.stack}\n`);
    process.exit(1);
});
