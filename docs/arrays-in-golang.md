---
title: Arrays in GoLang
---

Declaring arrays in GoLang, we need to declare the variable name first, the size of the array and the type of the array, see below

```go title="main.go"
var emails [3]string // this is a string array of  size 3 taking the variable name "emails"
```

Also here is how we can initialize array in GoLang

```go title="main.go"
package main

import "fmt"

func main() {
    nums := [4]int{1,2,3,4,5}
    fmt.Println(nums) // prints [1 2 3 4]
}
```

We can also look for an array using it's indexs

```go title="main.go"
package main

import "fmt"

func main() {
    nums := [4]int{1,2,3,4}
    fmt.Println("Number3 is:", nums[]3) // prints Number3 is: 4
}
```

We can also do Multi-Dimensional arrays in Golang.

```go title="main.go"
package main

import "fmt"

func main() {
    nums := [2][2]int {
        {2,3},
        {3,4}, // this last comma is important  else you get an error "syntax error: unexpected newline, expecting comma or }"
    }
       fmt.Println(nums)  // [[2 3] [3 4]]
}
```


Also it is said that arrays can not be resized in golang, but at the same time Go gives us a way to do this, here is an article that helped me understand ,a <a href="https://medium.com/gojekengineering/grab-a-slice-on-the-go-c606344186c1" target="_blank"> how to resize an array</a>