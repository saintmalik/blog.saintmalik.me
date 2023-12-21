---
title: Confirm if a file is sourced in Bash
---

You could be working on a project and then you are meant to source the file, you did it and yet you arent seeing changes, it happens.

For example you have an env file that holds some environment variable, and you want to make sure this values remain in your shell even after the scripts entrypoint execution.

To satisfy your curiousity or should we say debug your issue, you would have to do the following

create a bash script with ```nano src.sh``` and copy paste the below script.

```bash
source $1 0 2>/dev/null && sourced=1 || sourced=0
if [ $sourced -eq 0 ]; then
  echo "ERROR, this script is yet to be sourced.  Retry 'source $1'"
  exit 1
fi
```

then run it against the file you want to source with the following command ```sh src.sh myfile.env```

More Explanation about the Script

- 0 - standard input (stdin)
- 1 - standard output (stdout)
- 2 - standard err (stderr)

- '>' - passing the command outcome to whatever file is put along

And we know that ```/dev/null``` is a dead hole in linux, whatever you pass in there cant be read again

so now if the command ```source OURFILE``` runs successfully then the  value ***1*** would be set for the variable ***sourced***

but if the command ```source OURFILE``` fails, this means ```sourced=1``` wont run, which signifies failure, hence ```sourced=0``` runs, the value ***0*** would be set for the variable ***sourced***

Then the value of ***sourced*** is what we are playing with in the if statement, so we know that when ***sourced*** = ***0***, the operation isnt sucessful, hence spit out the error message.

```Command A && Command B || Command C```

**Command B** only runs if **Command A** succeeds, and if **Command B** doesnt run which signifies failure, **Command C** runs

And we are done with our validation

####  References

<a href="https://stackoverflow.com/questions/2683279/how-to-detect-if-a-script-is-being-sourced" target="_blank"> https://stackoverflow.com/questions/2683279/how-to-detect-if-a-script-is-being-sourced</a>