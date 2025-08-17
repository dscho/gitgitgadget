## Workflows to add

- handle-pr-comment
  - **replaces**:
    1. [GitGitGadget PR Handler](https://dev.azure.com/gitgitgadget/git/_build?definitionId=3)
    2. [GitGitGadget PR Handler (git)](https://dev.azure.com/gitgitgadget/git/_build?definitionId=13)
    3. [GitGitGadget PR Handler (dscho)](https://dev.azure.com/gitgitgadget/git/_build?definitionId=12)
  - **triggers on**: PR comments by allowed users
  - **needs**: SMTP credentials
- handle-pr-push
  - **replaces**:
    1. [GitGitGadget PR Handler](https://dev.azure.com/gitgitgadget/git/_build?definitionId=3)
    2. [GitGitGadget PR Handler (git)](https://dev.azure.com/gitgitgadget/git/_build?definitionId=13)
    3. [GitGitGadget PR Handler (dscho)](https://dev.azure.com/gitgitgadget/git/_build?definitionId=12)
  - **triggers on**: PR pushes
- handle-new-mails
  - **replaces**:
    1. [Mirror Git List to GitGitGadget's PRs](https://dev.azure.com/gitgitgadget/git/_build?definitionId=5)
  - **triggers on**: `git-mailing-list-mirror` updates
  - **needs**: git-mailing-list checkout
- update-prs
  - **replaces**:
    1. [Update GitGitGadget's PRs](https://dev.azure.com/gitgitgadget/git/_build/index?definitionId=2)
  - **triggers on**: `seen` updates
  - runs: updateOpenPrs(), updateCommitMappings() and handleOpenPRs()
- update-mail-to-commit-notes
  - **replaces**:
    1. [Update GitGitGadget's commit to mail notes](https://dev.azure.com/gitgitgadget/git/_build?definitionId=9)
  - **triggers on**: `seen` updates
  - TODO: convert from using `gitster/seen` to `upstream/seen`
  - **needs**: git-mailing-list checkout
  - **runs**:
    ```
    rev="$(git -C "$GITGIT_DIR" rev-parse refs/notes/commit-to-mail)"
    ./gitgitgadget/script/lookup-commit.sh --notes update
    if test "$rev" != "$(git -C "$GITGIT_DIR" rev-parse refs/notes/commit-to-mail)"
    then
      ./gitgitgadget/script/update-mail-to-commit-notes.sh

      git -C "$GITGIT_DIR" push https://git-for-windows-ci:$(git-for-windows-ci.github.token)@github.com/gitgitgadget/git refs/notes/commit-to-mail refs/notes/mail-to-commit ||
      die "Could not push notes"

      no_match="$(git -C "$GITGIT_DIR"/ show refs/notes/commit-to-mail | grep -B2 no\ match | sed -ne 's/\///g' -e 's/^\+\+\+ b//p')"
      test -z "$no_match" ||
      die "Could not find mail(s) for: $no_match"
    fi
    ```
