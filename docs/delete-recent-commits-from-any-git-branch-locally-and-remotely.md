---
title: Delete recent commits from any git branch locally and remotely
---

import Giscus from "@giscus/react";

So you've committed some secrets to github mistakenly and you want to clear it off?

run ```git log``` to see your commit history, copy commit id of the version that comes before the commit of the secret that was pushed.

Now run ```git revert COMMIT ID```

After that you will notice there are some untracked changes now if you run ```git status```

also checking your ```git log``` again, you will see that the commit where you've pushed the secret is gone.

Now its time to take it off the github repo commit history too, now you will run ```git push origin main -f```

This is a brutal way of getting your secret off github repo though, not really recommended, haha, but you can also read the <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository" target="_blank"> github docs</a> on other ways to go about it.

<br/>
<h2>Comments</h2>
<Giscus
id="comments"
repo="saintmalik/blog.saintmalik.me"
repoId="MDEwOlJlcG9zaXRvcnkzOTE0MzQyOTI="
category="General"
categoryId="DIC_kwDOF1TQNM4CQ8lN"
mapping="title"
term="Comments"
reactionsEnabled="1"
emitMetadata="0"
inputPosition="top"
theme="preferred_color_scheme"
lang="en"
loading="lazy"
crossorigin="anonymous"
    />