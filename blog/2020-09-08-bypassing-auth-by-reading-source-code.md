---
slug: bypassing-auth-by-reading-source-code
title: Bypassing Auth By Reading Source Code(JS files)
author: Saintmalik
author_title: Pentester
author_url: https://github.com/saintmalik
author_image_url: https://raw.githubusercontent.com/saintmalik/saintmalik.me/master/static/images/saintmalik2.jpeg
image: https://raw.githubusercontent.com/saintmalik/saintmalik.me/master/static/images/saintmalik2.jpeg
tags: [websec, infosec]
---

Yeah, just wanna share to a little story about the bypass of an authentication through source code reading.

Let's jump right in,
<!--truncate-->

Will be naming the target **redacted.com**, so just like everyone I digged into all the accessible assests(subdomains, cloud buckets etc.)that this target might own through my recon process.

So now I started visiting all the subdomains one after the other picking the juicy and attractive domains first.

So opening this domain named **records.redacted.com**. all I got was just a plain page with white background and a rectangular sign on button.

Clicked on the button, then it redirected me to login using my Gmail. Followed the whole process but I still couldn't get access.

All I got was a notification popup saying ***"you are not one of us"***. Meaning only internal member of the company can login this web app.

Well no problem, did directory search to see if there a signup page is hidden somewhere, but I got nothing.

Now when further to see what technology stack was used to develop the app, but I can't find any server side language or technology used🤔👀.

Definitely the whole Auth process was done from the client side(Frontend). Awesome.

Now I started reading the source code, knowing that only JavaScript can do this stuff on the Frontend. I went straight to reading the JS files.

![Source Code Auth](/img/sourcecodeauth.webp)

Reading the JS files, I saw this endpoint **/home** 🤗, then I read the function which this endpoint was appended too.

So I got to know that when the whole Auth process is done. Users are redirected to the **/home** page. Well no backend is handling this right? 

Then let me just try the endpoint out and see if I get a **401**,**403** or **500** errors but to my surprise I got a **200(OK)** response and the page loaded up.

![Awesome](/img/awesome.gif)

And yeah I can see all the internal members pictures and some other data's of employees without being an employee of the company.

So guys that's how reading Source Code(JS files) got me an awesome Auth bypass. Learn to read JS files, understanding how the application work.

Take care guys ✌️.
