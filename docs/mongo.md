---
title: MongoDB user is not allowed to do action [find]
---
import Giscus from "@giscus/react";


```
{ "message": "user is not allowed to do action [find] on [test.users]" }
```

if you get this error, check your permissions for the mongo user you are trying to use to connect

```
"MongoError: bad auth : aws sts call has response 403",
```

if this is happening in eks, check the that the secretkey and sessiontoken returned by the assumedeks role via the SA is encoded encodeURIComponent, or ensure the exported region in your env is same as the region the iam role used, also mak sure the isnt any other default ACCESS_KEY in your env, that would cause issue for the access renewal.

