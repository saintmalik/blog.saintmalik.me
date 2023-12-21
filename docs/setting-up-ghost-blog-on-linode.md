---
title: Lazy way of setting up a ghost blog on linode/digital ocean
---
import Giscus from "@giscus/react";

Well,  a week ago i couldnt pay up my DO bill and my droplets got deleted, meaning all the service i have on the droplet got cleaned out.

And now that i got back on my feet financially, i paid up the DO bills and then messaged their support for help with my droplets if it can still be recovered back, but unfortunately the answer was NO, it cant be retrieved.

Which means i have start every project afresh, that got me angry actially and i have moved to the linode platform as at the time of wrting.

Now i have to resetup a blog i host for an organization on DO using ghost cms back on linode, but due to improper documentation of how i did it the first development.

Then i had to create linode servers and delete them all over again for more than 3-5 times due to errors i was encountering. but yeah now that i have fully set the Ghost CMS up on linode, i will share with you all on how i got it done.

Firstly, you need to create a Linode account, using  my referral link, you get $100 Linode Credit Free.

After creating you account, login into your account and create a Linode, after that login into your linode server via SSH

and then  run the below commands

## Adding new user

```bash
adduser <user>
```

e.g
```bash
adduser saintmalik
```

## Give the user some elevated permission

```bash
usermod -aG sudo ghost-user
```

## Now login as the user

```bash
su - ghost-user
```

## Next is to update the dependencies and other packages

```bash
sudo apt-get update && sudo apt-get upgrade
```

## After this you need to install nginx

```bash
sudo apt-get install nginx
```

## Now open the firewall to allows HTTP and HTTPS connection

```bash
sudo ufw allow 'Nginx Full'
```

## Then we instal MySQL server

```bash
sudo apt-get install mysql-server
```

## Add the NodeSource APT repository for Node 14

```bash
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash
```

## Now we install NodeJS

```bash
sudo apt-get install -y nodejs
```

## And here we are, Install the Ghost CLI globally

```bash
sudo npm install ghost-cli@latest -g
```

## Now its time install the ghost CMS, but it has to be in its own directory with proper permission.

```bash
sudo mkdir -p /var/www/sitename
```

// creating the directory and replace the 'sitename' with whatever name you like.

```bash
sudo chown <user>:<user> /var/www/sitename
```

// this command is to set the user of the directory

``bash
sudo chmod 775 /var/www/sitename
```

// now we need to set the corect permissions

```bash
cd /var/www/sitename
```

// now we move into the directory folder , this is where we are going to install the ghost

## Installation of Ghost

```bash
ghost install
```

then when the commands runs and you are reach the installation questions


### Enter your blog URL:

Put the exact blog url http://example.com , you might be wondering why not https://example.com, you dont worry i will still exlain that soon.

### Enter your MySQL hostname:

Leave the hostname as 'localhost", just press the enter button and proceed to the next question.

### Enter your MySQL username:

Enter "root" as the MySQL username

###  Enter your MySQL password:

Enter your MySQL password here.

### Enter your Ghost database name:

Leave this as default , just press the enter button to proceed, because ghost automatically generates the the database name for you, but incase you are using the non-root MySQl, then you need to enter your own MySQL database name.

###  Do you wish to set up "ghost" mysql user?

Enter yes here and proceed or just hit the enter button.

### Do you wish to set up Nginx?

Enter yes, and hit the enter button to proceed.

### Setting up SSL

You will notice this one is being skipped, dont worry, we will solve it just hold on.

### Do you wish to set up Systemd?

Enter "yes" or hit the ENTER buttopn to proceed.

### Do you want to start Ghost?

Enter "yes" or hit the ENTER buttopn to proceed.


Now that we have everything set up, you might be wondering how are we going to add the SSL, we will be using Cloudflare SSL.

# Adding SSL to Ghost CMS using CloudFlare

Okay if you dont have a cloudflare account yet, then open one here.


Now connect your domain to cloudflare and make sure, its connected correctly and then to go the SSL Option and then Select the "Flexible Option" of Cloudflare SSL.

Then you have successfully added SSL to your Ghost CMS, easy and stress free.

# Ressting/Updating your  Ghost Password using Console/terminal

So goto your user that control ghost, the user, we added earlier, use the command

```bash
su - user
```

e.g

```bash
su - saintmalik
```

Then navigate to the directory where the ghost is installed,

```bash
cd /var/www/sitename
```

then run the following commands

```bash
mysql -u root -p
```

You will be promted to enter your MySQL password, which set earlier at the top.

now run

```bash
use YOUR DATABASE NAME
```

to switch to your database, after that, run

```bash
SELECT * from users;
```

to see all the users that are available in your database, give a closeer look and see the email of the user you want to change their password is present there.

after that, goto <a href="https://passwordhashing.com/BCrypt" target="_blank"> https://passwordhashing.com/BCrypt</a> and enter your new password that will be hashed back into the BCrypt format, because ghost stores passwords in Bcrypt format.

after generating the Bcypt hash, your will be in this format

"$2b$10$ZEzovaKWYtzBWNy7AQuYgefGVlpxn/nrovC3Er/gv6/E6CrALoOe."

now in the mysql, we are going to run the following commands

```bash
update users
```
```bash
set password='$2b$10$ZEzovaKWYtzBWNy7AQuYgefGVlpxn/nrovC3Er/gv6/E6CrALoOe.'
```

// Replace this Bcrypt hash with your own generated hash

and lastly enter this command also

```bash
where email = myownmail@gmail.com;
```

//Replace the email with the email of the user you want to chnage their password

if the operation gets successful, you should see a response like this

> Query OK, 1 row affected (0.01 sec)
> Rows matched: 1  Changed: 1  Warnings: 0

Thats all for now, will update the guide soon also, this is just to pour out the process before i forget. ✌️

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