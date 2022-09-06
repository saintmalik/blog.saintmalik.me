---
title: Easy Access to Pentesting VPS with via VS Code
---
import Giscus from "@giscus/react";

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

Am a big fan of using VPS as my workspace (pentesting/development/and basic tasks) and have been using it for a long period of time now,.

If you dont know how to setup a VPS for Pentesting or Development sake, feel free to check this <a href="https://blog.saintmalik.me/linux-vps-for-offensive-security-pentesting/" target="_blank">step by step guide on Setting Up Ubuntu Linux VPS For Offensive Security and Pentesting</a>

Everything with an advantage will also have a disadvantage, and some of the disadavantages of using a VPS as a workspace are;

1. The movement of files from my local system to my VPS, vice versa
2. Spinning up nano everytime to write and searching through files for a pattern and all that and more.

Although i do find my way around this issues via Terminal, but having a nice way to access this thing can be helpful and speed up work rate.

That brings us to the VS Code Software and its awesome Extension named <a href="https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh"> Remote -SSH  </a>

With this you can access your VPS environment through a nice Interface good for navigation, can be handy when doing Android App Pentest.

Where you decompile Apks and grep through th files or looking through manually.

Creating files and editing files easily, so when you are done with installation, here is how to get your things up and running.


1. Enable the Remote - SSH Extension after installation, you might also be prompted to install another Extension name Remote - SSH Editing Configuration Files, install and enable it also.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/remote-ssh.webp`} alt="Remote SSH Extensiont"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/remote-ssh.jpg`} alt="Remote SSH Extension"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/remote-ssh.jpg`} alt="Remote SSH Extension"/>
</picture>

2. If you are on Windows, press F1 button to spin up a command box on VS Code For Mac users, press, Shift + Comand + P

Then  enter the "remote-ssh" in the box, it will show you all the Remote SSH options.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/remote-ssh-box-vscode.webp`} alt="Remote SSH Box"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/remote-ssh-box-vscode.jpg`} alt="Remote SSH Box"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/remote-ssh-box-vscode.jpg`} alt="Remote SSH Box"/>
</picture>

Then you pick the "Remote-SSH: Connect to Host..." Option, that should spin up another box, asking you to input your VPS username and host, in this format username@host, e.g saintmalik@209.97.157.7.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enter-username-host.webp`} alt="Remote SSH Box"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enter-username-host.jpg`} alt="Remote SSH Box"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enter-username-host.jpg`} alt="Remote SSH Box"/>
</picture>

3. It's time to input your VPS Password

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enter-your-password.webp`} alt="Remote SSH Box"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enter-your-password.jpg`} alt="Remote SSH Box"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enter-your-password.jpg`} alt="Remote SSH Box"/>
</picture>

4. Now that we are in, let's play inside our VPS environment

## Creating folders inside our Ubuntu VPS

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/create-folder-remote-vps.webp`} alt="Remote SSH Box"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/create-folder-remote-vps.jpg`} alt="Remote SSH Box"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/create-folder-remote-vps.jpg`} alt="Remote SSH Box"/>
</picture>

## Seeing the folder realtime on our VPS environment via our Terminal

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/create-folder-terminal-vps.webp`} alt="Remote SSH Box"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/create-folder-terminal-vps.jpg`} alt="Remote SSH Box"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/create-folder-terminal-vps.jpg`} alt="Remote SSH Box"/>
</picture>


- Creating files inside our Ubuntu VPS via VS Code and seeing it realtime on our VPS environment via our Terminal.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/vps-check-terminal-file..webp`} alt="Remote SSH Box"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/vps-check-terminal-file..jpg`} alt="Remote SSH Box"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/vps-check-terminal-file..jpg`} alt="Remote SSH Box"/>
</picture>

- Writing inside our created file in VPS via VS Code and seeing it real time via terminal

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/write-file-terminal-vps.webp`} alt="Remote SSH Box"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/write-file-terminal-vps.jpg`} alt="Remote SSH Box"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/write-file-terminal-vps.jpg`} alt="Remote SSH Box"/>
</picture>

- Drag and dropping files from my local system into my Ubuntu VPS Environment

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/moving-files-in-vps-to-local-system.webp`} alt="Remote SSH Box"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/moving-files-in-vps-to-local-system.jpg`} alt="Remote SSH Box"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/moving-files-in-vps-to-local-system.jpg`} alt="Remote SSH Box"/>
</picture>

- Deleting files on our VPS Environment Easily

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/delete-files-vps-remote.webp`} alt="Remote SSH Box"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/delete-files-vps-remote.jpg`} alt="Remote SSH Box"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/delete-files-vps-remote.jpg`} alt="Remote SSH Box"/>
</picture>

:::info
Before i knew about this, i do use the  ``` scp -P 22 username@127.0.0.1 ``` to upload and download files between my local system and VPS Environent
:::
✌️.

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