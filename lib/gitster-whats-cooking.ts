/*
 * A helper to watch https://github.com/git/git/commits/todo/whats-cooking.txt
 * for mentions of the active branches.
 */
export class GitsterWhatsCooking {
    public readonly workDir: string;

    public constructor(workDir: string) {
        this.workDir = workDir;
    }
}
