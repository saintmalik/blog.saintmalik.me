---
slug: how-i-found-my-first-bug
title: Stored XSS on Private Bounty Program (My First Bug)
author: Saintmalik
author_title: Pentester
author_url: https://twitter.com/saintmalik_
author_image_url: https://raw.githubusercontent.com/saintmalik/saintmalik.me/master/static/images/saintmalik2.jpeg
image: /img/bypassauth.png
tags: [infosec, websec]
---

So I started participating in bug bounty not so long and after alot of readups and web app practice, I found a stored XSS on quite a big education platform which i was using for learnig web development last year.
<!--truncate-->

They have many users and also some big firms as their partner, this platform help users to learn how to code.

They joined Hackerone this year and i was invited to their private program, well i found nothing till they closed their bounty program off hackerone, sent in two reports though, one N/A the other got me a negative signal😭😀.

## How I Discovered The Stored XSS

On this very day, I logged into the platform to continue my studies, The platform contains Both FE Dev/BE Dev/Full Stack/Android and UI/UX courses, Unfortunately i wasn't in the mood to start looking at video tutorial neither am i ready to read anything because the course in my Track seems bulky.

So instead of learning, I said let me even test some of my web appsec skills on this platform, first I looked for any reflected XSS entry points like Searching Function(Search Box) on the website and improper error messages displayed.

And I had no luck 😦 , But sometimes misfortune is a blessing in disguise.

After digging well, Soon I found out that I can leave something on the profile dashboard.

Because the user profile dashboard has an option to edit, add your bio, add some texts, so I wrote somethings, and I started with ></" to see if they get sanitized, I inspected the text, i noticed it was not sanitized or filtered out. Then i gave the dashboard a good attention.

I got the common payload which is the "&lt;script&gt;alert(1)&lt;/script&gt;", you know thats the most common payload anyway. I typed this payload into the bio box and I saved it, to my suprise the bio box went blank😳, but on highlighting the text, it was showing.

Not that the payload isn't there but the website functionality made it looks like a white text, so i refreshed the page immediately to see if anything comes up, Well the Alert PoPup triggered.

The stored XSS triggered, Damm I was so happy, you know that feeling when you get your first bug😩😭😊✌️.

So whenever another user visits my profile page the xxs payload triggers on their browser also, meaning i could have done or chain the stored xss probably to an account tackover or somethng else.

But the anxiety in me made me report without thinking of some ways to make the bug more complex and critical, so I was rewarded with $$$ and atleast I was happy i got my first bug.
