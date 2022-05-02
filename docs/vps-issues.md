---
title: VPS related issues
---

adduser // add ne user to your linux shell

usermod -aG saintmalik 

usermod -aG sudo saintmalik // add saintmalik as a user to the sudoers group, the -aG, the -a makes sure the user is not removed from other groups while adding the user to another group you will be specifying after the -G, <a href="https://linuxize.com/post/usermod-command-in-linux/">read more about usermod</a>


MAILTO="redacted@gmail.com" // mailto work in cron to pass cron job output to mail

SHELL=/bin/bash //cron....

HOME=/

"- * * * * /home/saintmalik/track.sh "  // you point from root when executing in shell, else it might not execute

sudo /etc/init.d/cron stop // stop cron jobs
