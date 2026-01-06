---
slug: embedding-static-files-in-go-cli
title: How to Use //go:embed to embed static files in CLI
description: Here's how to use //go:embed to embed static files into Go programs or Go binaries
authors: Saintmalik
image: /bgimg/go-embed.jpeg
tags: [golang, cli]
---

import Giscus from "@giscus/react";

For someone who just started writing Go, I have no idea about //go:embed feature which came with the released version: 1.16.

A project I was working on recently led to discoveries.

<!--truncate-->

## So what is //go:embed?

The embed package allows us to embed static/templates or directories into our Go program

## When should you use //go:embed in your project?
//go:embed can be used in situations where the file or assets won't change or be modified after build, don't shoot yourself in the leg by embedding files that are subjected to modifications e.g ```config.json``` and all types of files similar to this

examples of assets that you use ```//go:embed``` for are ```templates/css``` files and anything similar to this

## How to use it in CLI programs?

If you are writing your CLI tool using frameworks like cobra, and urfave-cli, you will know that your commands files e.g ```root.go``` and the likes are always in a "cmd" folder

```mdx
hello_cobra
├─ cmd
│  ├─ config.go
│  ├─ root.go
│  └─ run.go
├─ go.mod
├─ go.sum
├─ main.go
└─ templates
   ├─ config.html
   ├─ creds.html
   └─ index.html
```

and the rule that comes with ```//go:embed``` is that you can only embed via your root folder, so let's say you have your template folder inside your main project folder, just the way my project folder is above

Then you can easily embed using main.go file in your root folder or any other Go file in the root folder

but in a situation where your template files are needed or are called inside the "cmd" folder, you need to embed the template from your cmd folder using the ```config.go``` file.

It becomes tricky from there. you get it right? meaning  ```//go:embed``` won't work, it will start spitting errors like ```pattern ****/: no matching files found```

because you can only use ```//go:embed``` from the root files and now you need to call it from a file inside the **cmd**, which isn't available in the root.

I was stuck man, spent two to three days thinking and searching the internet for a solution, and pushing my project depends on getting the static/template assets files to embed.

Now you probably thinking why don't I move my template folder into the "cmd" folder?

yes i did that too, but using   ```//go:embed templates/*.html``` wasn't working still.

but at last, I stumbled upon <a href="https://github.com/plentico/plenti">https://github.com/plentico/plenti repo</a>, the guy did what I have been trying to do, in fact, he has a lot of static files

but what he did is different from what every article I have come across did and shared, he used this syntax ```//go:embed all:yourfolders/*``` while other content out there states to use this ```//go:embed yourfolders/*```

don't get me wrong both are correct, but ```//go:embed all:yourfolders/*```  works well for embedding from files that are not in the root folder, in situations where your folder is like this

```mdx
hello_cobra
├─ cmd
│  ├─ config.go
│  ├─ root.go
│  └─ run.go
└─ templates
   ├─ config.html
   ├─ creds.html
   └─ index.html
├─ go.mod
├─ go.sum
├─ main.go
```

and that's how I embed the templates in my config.go

```go title="hello_cobra/cmd/config.go"
package cmd

import (
    "embed"
    "fmt"
    "net/http"
    "text/template"

    "github.com/spf13/cobra"
)

//go:embed all:templates/*.html   //this means, embedding all files ending with ".html"  in the templates folder even when ignored

var TempFs embed.FS //assign the variable TempFs to embed.FS, FS means (File System)

var tmpl *template.Template //tmpl is a type pointer to template.Template,


func init() {
    rootCmd.AddCommand(configCmd)
    tmpl = template.Must(template.ParseFS(TempFs, "templates/*.html"))
}

func myTempl(w http.ResponseWriter, _ *http.Request) {

///you can do all your codes here,
    err = tmpl.ExecuteTemplate(w, "creds.html", nil) //Executing the template
    if err != nil {
        log.Fatal("Error loading index template: ", err) //log an error, if the template cant be started
    }
}
```

And that's all, If you want to learn more about //go:embed read over here <a href="https://pkg.go.dev/embed" target="_blank">Go Dev Embed Docs</a>.

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