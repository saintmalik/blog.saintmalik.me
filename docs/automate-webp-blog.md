---
title: Automate webp image github action
---
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

so i find myself doing this repeatedly everytime i write a content, because i pushed for using webp images on my blog.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/automate-webp.webp`} alt="automate-webp"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/automate-webp.jpg`} alt="automate-webp"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/automate-webp.jpg`} alt="automate-webp"/>
</picture>


hence when i write something on here, i need to convert the images to webp version too, so any browser that supports webp.

the users sees webp version of the image, and webp is know for its speed and good quality too, here is the manual process <a href="/docs/converting-images-to-webp/" target="_blank">How to bulk convert images to webp</a>

so this time i moved the automation to github, since at the end of the day, i use github to build and push to netlify, why not automate it there too.

so here is the workflow

```yaml title=".github/workflows/deploy-on-push.yml"

name: generate and push webp image version
on:

  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Checkout repo
      - uses: actions/checkout@v3

      - name: Check if there are any changes made in bgimg
        id: changed-files-specific
        uses: tj-actions/changed-files@v31
        with:
          files: |
            static/bgimg/*

      - name: Setup cwebp
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        run: |
          pwd
          sudo apt-get install libjpeg-dev libpng-dev libtiff-dev libgif-dev
          wget https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.2.4-linux-x86-64.tar.gz
          tar xzvf libwebp-1.2.4-linux-x86-64.tar.gz
          cd libwebp-1.2.4-linux-x86-64/bin
          mv cwebp ${{ github.workspace }}
          cd ../..
          rm -rf libwebp-1.2.4-linux-x86-64
          rm -rf libwebp-1.2.4-linux-x86-64.tar.gz
          sudo mv cwebp /bin
          ls

      - name: bash file to create the webp version of the images
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        run: |
         bash webp.sh /static/bgimg/

      - name: push the webp images to the folder
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        env:
          CI_COMMIT_MESSAGE: CI to buid webp version of the image
          CI_COMMIT_AUTHOR: Webp Image CI Bot
        run: |
          git config --global user.name "${{ env.CI_COMMIT_AUTHOR }}"
          git config --global user.email "saintmalik@users.noreply.github.com"
          git add .
          git commit -m "${{ env.CI_COMMIT_MESSAGE }}"
          git push
```

the line which says **Check if there are any changes made in bgimg** is where i check if there is any changes in my image folders to make decision on wheather i should run the workflow or note.

that way i avoid unneccesary build.

will update this soon to optimize for having to re download the cwebp tool

thats all for now