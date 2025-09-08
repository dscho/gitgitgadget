import { revParse } from "./git.js";
import { IConfig, projectInfo } from "./project-config.js";

// For now, only the Git, Cygwin and BusyBox projects are supported
export class ProjectOptions {
    public static async get(
        config: IConfig,
        workDir: string,
        branchName: string,
        cc: string[],
        baseCommit: string,
        basedOn?: string,
        publishToRemote?: string,
    ): Promise<ProjectOptions> {
        let to: string;
        let midUrlPrefix = " Message-ID: ";

        if (Object.prototype.hasOwnProperty.call(config, "project")) {
            const project = config.project as projectInfo;
            to = `--to=${project.to}`;
            midUrlPrefix = project.urlPrefix;
            for (const user of project.cc) {
                cc.push(user);
            }
            // Hard-code a check for gitgitgadget/git whether this is a Git GUI PR
            // and hence needs the Git GUI maintainer to be Cc:ed
            if (
                `${config.repo.owner}/${config.repo.name}` === "gitgitgadget/git" &&
                (await revParse(`${baseCommit}:git-gui.sh`, workDir)) !== undefined
            ) {
        } else if ((await revParse(`${baseCommit}:winsup`, workDir)) !== undefined) {
            // Cygwin
            to = "--to=cygwin-patches@cygwin.com";
            midUrlPrefix = "https://www.mail-archive.com/search?l=cygwin-patches@cygwin.com&q=";
        } else if ((await revParse(`${baseCommit}:include/busybox.h`, workDir)) !== undefined) {
            // BusyBox
            to = "--to=busybox@busybox.net";
            midUrlPrefix = "https://www.mail-archive.com/search?l=busybox@busybox.net&q=";
        } else {
            throw new Error("Unrecognized project");
        }

        return new ProjectOptions(branchName, basedOn, publishToRemote, to, cc, midUrlPrefix, workDir, baseCommit);
    }

    public readonly branchName: string;
    public readonly baseCommit: string;
    public readonly basedOn?: string;
    public readonly publishToRemote?: string;
    public readonly workDir: string;

    public readonly to: string;
    public readonly cc: string[];
    public readonly midUrlPrefix: string;

    protected constructor(
        branchName: string,
        basedOn: string | undefined,
        publishToRemote: string | undefined,
        to: string,
        cc: string[],
        midUrlPrefix: string,
        workDir: string,
        baseCommit: string,
    ) {
        this.branchName = branchName;

        this.baseCommit = baseCommit;

        this.basedOn = basedOn;
        this.publishToRemote = publishToRemote;
        this.workDir = workDir;

        this.to = to;
        this.cc = cc;
        this.midUrlPrefix = midUrlPrefix;
    }
}
