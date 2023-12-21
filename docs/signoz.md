---
title: Signoz on Kubernetes Errors
---

## Error from server (NotFound): jobs.batch "signoz-schema-migrator" not found

An ```helm upgrade``` would fix this issue.

## Error:"2023-10-24T06:46:53.083Z ERROR clickhouseReader/reader.go:137 failed to initialize ClickHouse: error connecting to primary db: code: 516, message: admin: Authentication failed: password is incorrect, or there is no user with such name." timestamp: "2023-10-24T06:46:53.083173036Z

Fix: https://github.com/SigNoz/charts/issues/63#issuecomment-1209071122