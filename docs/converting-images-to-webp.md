---
title: How to bulk convert images to webp
---

So webp is the new thing in content creation world, because they render fast and they are not heavy, so your websites loads up fast.

And as you know images is one of the assets that drags down your webpage loading speeds.

So knowing we need to adopt webp images, how do we deal with those much images that we've uploaded or we will be uploading to your blog posts next?

That brings us to <a href="https://developers.google.com/speed/webp/docs/cwebp" target="_blank">Google WebP images Project</a>, this tools helps us compress an image file to a WebP file.

So you need to install the <a href="https://developers.google.com/speed/webp/download" target="_blank">Webp Tool</a> first, the tool comes along with both

- cwebp -- WebP encoder tool
- dwebp -- WebP decoder tool
- vwebp -- WebP file viewer
- webpmux -- WebP muxing tool
- gif2webp -- Tool for converting GIF images to WebP

So after installing it for your specified OS, now its time to write a bash script to automate the process.

1. create bash file

```bash
touch webpbulk.sh
```

2. open the file you just created

```bash
nano webpbulk.sh
```
3. then paste the below script there, where you will be replacing the "/Users/yourusername/" with your Directory paths, like, /Users/saintmalik/, just the way it is on your system.

```bash
for file in /Users/yourusername/$1/*; 
    do cwebp -q 80 "$file" -o "${file%.*}.webp"; 
done
```
4. save the file and get all your images ready in your images folders

5. now run this below command and it will bulk convert the files to webp

```bash
bash webpbulk.sh /FOLDER-WHERE YOUR IMAGES ARE.
```
e.g 

```bash
bash webpbulk.sh DevProjects/blog.saintmalik.me/static/bgimg
```

At the end of the day the directory path will look like this 

```bash
/Users/abdulmalik//DevProjects/blog.saintmalik.me/static/bgimg/IMAGES-GETTING-COMPRESSED
```

Also you can read the documentation to see some tweaks you can add to it, or which flag options can be useful to you <a href="https://developers.google.com/speed/webp/docs/cwebp" target="_blank">cwebp Encoder Docs</a>.

Thats all.