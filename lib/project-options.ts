import { revParse } from "./git.js";
import { IConfig } from "./project-config.js";

export class ProjectOptions {
    public static async get(
        config: IConfig,
        workDir: string,
        headCommit: string,
        cc: string[],
        baseCommit: string,
        basedOn?: string,
    ): Promise<ProjectOptions> {
        const to = `--to=${config.project.to}`;
        const midUrlPrefix = config.project.urlPrefix;
        cc.push(...config.project.cc);

        // Hard-code a check for gitgitgadget/git whether this is a Git GUI PR
        // and hence needs the Git GUI maintainer to be Cc:ed
        if (
            `${config.repo.owner}/${config.repo.name}` === "gitgitgadget/git" &&
            (await revParse(`${baseCommit}:git-gui.sh`, workDir)) !== undefined
        ) {
            // Git GUI
            cc.push("Johannes Sixt <j6t@kdbg.org>");
        }

        return new ProjectOptions(headCommit, basedOn, to, cc, midUrlPrefix, workDir, baseCommit);
    }

    public readonly headCommit: string;
    public readonly baseCommit: string;
    public readonly basedOn?: string;
    public readonly workDir: string;

    public readonly to: string;
    public readonly cc: string[];
    public readonly midUrlPrefix: string;

    protected constructor(
        headCommit: string,
        basedOn: string | undefined,
        to: string,
        cc: string[],
        midUrlPrefix: string,
        workDir: string,
        baseCommit: string,
    ) {
        this.headCommit = headCommit;

        this.baseCommit = baseCommit;

        this.basedOn = basedOn;
        this.workDir = workDir;

        this.to = to;
        this.cc = cc;
        this.midUrlPrefix = midUrlPrefix;
    }
}
