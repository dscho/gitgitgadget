import { expect, test } from "@jest/globals";
import { MailArchiveGitHelper } from "../lib/mail-archive-helper";
import { parseMBox } from "../lib/send-mail";

const mbox0 =
    `From 566155e00ab72541ff0ac21eab84d087b0e882a5 Mon Sep 17 00:00:00 2001
Message-Id: <pull.12345.v17.git.gitgitgadget@example.com>
From:   =?utf-8?B?w4Z2YXIgQXJuZmrDtnLDsA==?= Bjarmason <avarab@gmail.com>
Date: Fri Sep 21 12:34:56 2001
Subject: [PATCH 0/3] My first Pull Request!
Fcc: Sent
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit
MIME-Version: 1.0
To: reviewer@example.com
Cc: Some Body <somebody@example.com>,
 And Somebody Else <somebody@else.org>

This Pull Request contains some really important changes that I would love to
have included in git.git.

Contributor (1):
  B

Developer (1):
  C

GitGitGadget (1):
  A

 A.t | 1 +
 B.t | 1 +
 C.t | 1 +
 3 files changed, 3 insertions(+)
 create mode 100644 A.t
 create mode 100644 B.t
 create mode 100644 C.t


base-commit: 0ae4d8d45ce43d7ad56faff2feeacf8ed5293518
--${" "}
2.17.0.windows.1
`;

test("parse mbox", () => {
    const parsed = parseMBox(mbox0);
    expect(parsed.from).toEqual("Ævar Arnfjörð Bjarmason <avarab@gmail.com>");
    expect(parsed.cc).toEqual([
        "Some Body <somebody@example.com>",
        "And Somebody Else <somebody@else.org>",
    ]);
    expect(parsed.subject).toEqual("[PATCH 0/3] My first Pull Request!");
    expect(parsed.headers).toEqual([
        { key: "Content-Type", value: "text/plain; charset=UTF-8" },
        { key: "Content-Transfer-Encoding", value: "8bit" },
        { key: "MIME-Version", value: "1.0" },
    ]);
    expect(parsed.to).toEqual("reviewer@example.com");
});

test("test quoted printable", () => {
    const mbox =
    `From 566155e00ab72541ff0ac21eab84d087b0e882a5 Mon Sep 17 00:00:00 2001
Message-Id: <pull.12345.v17.git.gitgitgadget@example.com>
From:   =?utf-8?B?w4Z2YXIgQXJuZmrDtnLDsA==?= Bjarmason <avarab@gmail.com>
Date: Fri Sep 21 12:34:56 2001
Subject: [PATCH 0/3] My first Pull Request!
Fcc: Sent
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: quoted-printable
MIME-Version: 1.0
To: reviewer@example.com
Cc: Some Body <somebody@example.com>,
 And Somebody Else <somebody@else.org>

Test the various length utf-8 characters.
=31=32=33=34
two byte /=[CDcd][0-9A-Fa-f]/=c2=a9
three byte /=[Ee][0-9A-Fa-f]/=e1=99=ad
four byte /=[Ff][0-7]/=f0=90=8d=88
`;

    const parsed = parseMBox(mbox);
    const body = MailArchiveGitHelper.mbox2markdown(parsed);
    expect(body).toMatch(/1234/);
    expect(body).toMatch(/©/);
    expect(body).toMatch(/᙭/);
    expect(body).toMatch(/𐍈/);
});

test("test quoted printable ascii", () => {
    const mbox =
    `From 566155e00ab72541ff0ac21eab84d087b0e882a5 Mon Sep 17 00:00:00 2001
Message-Id: <pull.12345.v17.git.gitgitgadget@example.com>
From:   =?utf-8?B?w4Z2YXIgQXJuZmrDtnLDsA==?= Bjarmason <avarab@gmail.com>
Date: Fri Sep 21 12:34:56 2001
Subject: [PATCH 0/3] My first Pull Request!
Fcc: Sent
Content-Type: text/plain
Content-Transfer-Encoding: quoted-printable
MIME-Version: 1.0
To: reviewer@example.com
Cc: Some Body <somebody@example.com>,
 And Somebody Else <somebody@else.org>

This Pull Request contains some really important changes that I would love to
have included in git.git.
=31=32=33=34
2.17.0.windows.1
`;

    const parsed = parseMBox(mbox);
    const body = MailArchiveGitHelper.mbox2markdown(parsed);
    expect(body).toMatch(/1234/);
});

test("test base64", () => {
    const mailBody = "Base 64 Data";
    const mbox =
    `From 566155e00ab72541ff0ac21eab84d087b0e882a5 Mon Sep 17 00:00:00 2001
Message-Id: <pull.12345.v17.git.gitgitgadget@example.com>
From:   =?utf-8?B?w4Z2YXIgQXJuZmrDtnLDsA==?= Bjarmason <avarab@gmail.com>
Date: Fri Sep 21 12:34:56 2001
Subject: [PATCH 0/3] My first Pull Request!
Fcc: Sent
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: BaSe64
MIME-Version: 1.0
To: reviewer@example.com
Cc: Some Body <somebody@example.com>,
 And Somebody Else <somebody@else.org>

${Buffer.from(mailBody).toString("base64")}`;

    const parsed = parseMBox(mbox);
    const body = MailArchiveGitHelper.mbox2markdown(parsed);
    expect(body).toMatch(mailBody);
});

test("test empty body", () => {
    const mbox =
    `From 566155e00ab72541ff0ac21eab84d087b0e882a5 Mon Sep 17 00:00:00 2001
Message-Id: <pull.12345.v17.git.gitgitgadget@example.com>
From:   =?utf-8?B?w4Z2YXIgQXJuZmrDtnLDsA==?= Bjarmason <avarab@gmail.com>
Date: Fri Sep 21 12:34:56 2001
Subject: [PATCH 0/3] My first Pull Request!
Fcc: Sent
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: BaSe64
MIME-Version: 1.0
To: reviewer@example.com
Cc: Some Body <somebody@example.com>,
 And Somebody Else <somebody@else.org>

`;

    const parsed = parseMBox(mbox);
    const body = MailArchiveGitHelper.mbox2markdown(parsed);
    expect(body).toMatch(/^$/);
});
