---
title: How to bulk convert images to webp
---

So webp images is the new thing in the content creation world, because they render fast and they are not heavy, making your websites load up fast.

And as you know images is one of the assets that drags down your webpage loading speeds.

So knowing we need to adopt webp images, how do we deal with those many images that we've uploaded or we will be uploading to our next blog posts?

That brings us to <a href="https://developers.google.com/speed/webp/docs/cwebp" target="_blank">Google WebP images Project</a>, this tool helps us compress any image files to WebP image.

So you need to install the <a href="https://developers.google.com/speed/webp/download" target="_blank">Webp Tool</a> NOTE: The tool comes along with both

- cwebp -- WebP encoder tool
- dwebp -- WebP decoder tool
- vwebp -- WebP file viewer
- webpmux -- WebP muxing tool
- gif2webp -- Tool for converting GIF images to WebP

So after installing Webp Tool for your specified OS, now it's time to write a bash script to automate the conversion process.

1. Create bash file

```bash
touch webpbulk.sh
```

2. Open the file you just created

```bash
nano webpbulk.sh
```
3. Then paste the below script there, where you will be replacing the "/Users/yourusername/" with your Directory paths, like, /Users/saintmalik/, just the way it is on your system.

```bash
for file in /Users/yourusername/$1/*;
    do cwebp -q 80 "$file" -o "${file%.*}.webp";
done
```
4. Save the file and get all your images ready in your images folders

5. Now run command below and it will bulk convert the image files to Webp format

```bash
bash webpbulk.sh /FOLDER-WHERE YOUR IMAGES ARE.
```
e.g

```bash
bash webpbulk.sh DevProjects/blog.saintmalik.me/static/bgimg
```

:::info
So at the end of the day, the directory path will look like this
:::

```bash
/Users/abdulmalik//DevProjects/blog.saintmalik.me/static/bgimg/IMAGES-GETTING-COMPRESSED
```

Also you can read the documentation to see some tweaks you can add to it, or which flag options can be useful to you <a href="https://developers.google.com/speed/webp/docs/cwebp" target="_blank">cwebp Encoder Docs</a>.

Thats all.

<br></br>
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