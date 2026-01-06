---
title: 📝 Android Signing
---

import Giscus from "@giscus/react";

keytool -list -v -keystore signing-key.keystore to verify that it is a valid keystore.

openssl base64 < signing-key.keystore | tr -d '\n' | tee signing-key.keystore.base64.txt //encrypt

base64 -d signing-key.keystore.base64.txt > signing-key.keystore  //decrypt


so you want to use the playstore app signing and you want to upload your own key certificate, i mean the one you used in signing your android app via the build stage.

run the following command to generate the certificate.pem from your keystore
```
sudo keytool -export -rfc -keystore signing-key.keystore -alias YOURKEYSTOREALIAS -file upload_certificate.pem
```


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