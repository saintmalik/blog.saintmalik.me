---
title: Variables in GoLang
---

The `var` keyword is what we use in declaring variables in GoLang

```go title="main.go"
package main

import "fmt"

func main() {
    var name = "SaintMalik" 
    var name string = "Saintmalik" // type declaration for string 
    var myNumIs int  = 3 // type declaration for integers
    fmt.Println(myNumIs)
}
```

## Shorthand Variables

You can also declare variables in short hand using `:=`

```go title="main.go"
package main

import "fmt"

func main() {
    name := "SaintMalik" 
    fmt.Println(name)
}
```

## Global and Local Variables

Also notice the variables declared in the main function `func main()` is regarded as local variables, the variables can only be called within that main function.

Lets talk about Global variables too,

```go title="main.go"
package main

import "fmt"

var name = "SaintMalik" // declaring global variables

func main() {
    fmt.Println(name)
}
```

You can't declare global variables using shorthand form of declaring variables, short hand variables can only be declared inside a function which makes them a local variable.

## Shadowing in GoLang Variables

Shadowing is a feature in Go that helps you in situation where you can declare a variable name in a block and also declare another variable with the same name in an inner block without having errors.

here's an example

```go title="main.go"
package main

import "fmt"

func main() {
    name := "Saintmalik"
{
    name := "malik"
    fmt.Println(name)
}
    fmt.Println(name)
}
```

However this wont work if you attempt to declare variables of the same name in the same block

```go title="main.go"
package main

import "fmt"

func main() {
    name := "Saintmalik"
    name := "malik"
    fmt.Println(name) // no new variables on left side of :=
}
```
