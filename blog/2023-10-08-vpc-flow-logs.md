---
slug: vpc-flow-logs-via-terraform
title: Applying Network Security using VPC Flow Logs with Terraform
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/vpc-flow.webp
tags: [appsec, devsecops]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

You have deployed resources on AWS and hardened the application layer, but the network layer is often overlooked. If an EC2 instance or Redis node ends up in a public subnet by mistake, VPC Flow Logs are the fastest way to detect unexpected traffic.

<!--truncate-->

## What you will build

1. An S3 bucket for durable flow log storage.
2. A VPC Flow Log sending traffic metadata to that S3 bucket.
3. An Athena database and table for querying the logs.
4. A sample query to find traffic hitting a specific port or IP.

## What VPC Flow Logs capture

VPC Flow Logs record:

- Source and destination IP addresses and ports
- Protocol numbers
- Packet and byte counts
- Start and end times
- Action (`ACCEPT`, `REJECT`, or `ALL`)

They do **not** log traffic to privately hosted zones, instance metadata queries, or DNS traffic.

## Prerequisites

- AWS account
- Existing VPC (or the default VPC)
- Terraform basics

## Terraform setup

Create a folder and two files: `provider.tf` and `main.tf`.

### `provider.tf`

```hcl
provider "aws" {
  region  = "us-east-1"
  profile = "default"
}

terraform {
  required_version = ">= 1.5.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.18.1"
    }
  }

  backend "s3" {
    bucket = "iac-terraform"
    key    = "vpcflowlogs/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### `main.tf`: S3 bucket and flow log

```hcl
resource "aws_s3_bucket" "vpc_flow_logs" {
  bucket = "vpc-flow-logs-book"

  versioning {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_flow_log" "appsec-preprod" {
  log_destination      = aws_s3_bucket.vpc_flow_logs.arn
  log_destination_type = "s3"
  traffic_type         = "ALL"
  vpc_id               = "vpc-xxxxxxxx"

  log_format = "$${version} $${vpc-id} $${subnet-id} $${instance-id} $${interface-id} $${account-id} $${type} $${srcaddr} $${dstaddr} $${srcport} $${dstport} $${protocol} $${packets} $${bytes} $${start} $${end} $${action} $${tcp-flags}"

  tags = {
    Name = "vpc_flow_logs"
  }
}
```

Replace `vpc-xxxxxxxx` with your VPC ID. Set `traffic_type` to `ACCEPT` or `REJECT` if you only need one direction.

### `main.tf`: Athena database and table

```hcl
resource "aws_athena_database" "appsec" {
  name   = "appsec"
  bucket = aws_s3_bucket.vpc_flow_logs.id
}

resource "aws_athena_named_query" "create_table" {
  name      = "vpc_appsec_logs"
  workgroup = "primary"
  database  = aws_athena_database.appsec.name
  query     = <<EOF
CREATE EXTERNAL TABLE IF NOT EXISTS vpc_appsec_flow_logs (
  version int,
  account string,
  interfaceid string,
  sourceaddress string,
  destinationaddress string,
  sourceport int,
  destinationport int,
  protocol int,
  numpackets int,
  numbytes bigint,
  starttime int,
  endtime int,
  action string,
  logstatus string
)
PARTITIONED BY (dt string)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ' '
LOCATION 's3://vpc-flow-logs-book/AWSLogs/YOUR_AWS_ACCOUNT_ID/vpcflowlogs/us-east-1'
TBLPROPERTIES ("skip.header.line.count"="1");
EOF
}
```

Replace the bucket name, account ID, and region in the `LOCATION` string.

## Deploy and query

Run:

```bash
terraform init
terraform plan
terraform apply -auto-approve
```

After a few minutes, open the Athena console, run the saved query to create the table, then query the logs:

```sql
-- Traffic to a specific IP range
SELECT * FROM vpc_appsec_flow_logs WHERE destinationaddress LIKE '172.24%';

-- Traffic on Redis port 6379
SELECT * FROM vpc_appsec_flow_logs WHERE destinationport = 6379;
```

## Completion criterion

The setup is complete when:

1. `terraform apply` succeeds and creates the S3 bucket, flow log, and Athena resources.
2. Flow log files appear in the S3 bucket after a few minutes.
3. The Athena table is created and returns results.
4. You can run a query that shows accepted or rejected traffic for a specific port or IP range.

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
