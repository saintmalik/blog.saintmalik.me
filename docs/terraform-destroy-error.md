---
title: 📝 Terraform Destroy Error
---

import Giscus from "@giscus/react";

gotten an error like this when you ran terraform destroy?

```
│ Error: deleting EC2 Subnet (subnet-xxxxxxxxxxx): DependencyViolation: The subnet 'subnet-xxxxxxxxxxx' has dependencies and cannot be deleted.
│       status code: 400, request id: f8f8890b-3617-43f1-a5b9-xxxxxxxx
```
You might want to discover the aws services that are the dependant of this services, we can use a simple bash script for the discovery instead of blindly scrolling the aws console.

```discover.sh
#!/bin/bash
vpc="vpc-xxxxxxxxxx"
myregion="us-west-2"
aws ec2 describe-internet-gateways --region $myregion --filters 'Name=attachment.vpc-id,Values='$vpc | grep InternetGatewayId
aws ec2 describe-subnets --region $myregion --filters 'Name=vpc-id,Values='$vpc | grep SubnetId
aws ec2 describe-route-tables --region $myregion --filters 'Name=vpc-id,Values='$vpc | grep RouteTableId
aws ec2 describe-network-acls --region $myregion --filters 'Name=vpc-id,Values='$vpc | grep NetworkAclId
aws ec2 describe-vpc-peering-connections --region $myregion --filters 'Name=requester-vpc-info.vpc-id,Values='$vpc | grep VpcPeeringConnectionId
aws ec2 describe-vpc-endpoints --region $myregion --filters 'Name=vpc-id,Values='$vpc | grep VpcEndpointId
aws ec2 describe-nat-gateways --region $myregion --filter 'Name=vpc-id,Values='$vpc | grep NatGatewayId
aws ec2 describe-security-groups --region $myregion --filters 'Name=vpc-id,Values='$vpc | grep GroupId
aws ec2 describe-instances --region $myregion --filters 'Name=vpc-id,Values='$vpc | grep InstanceId
aws ec2 describe-vpn-connections --region $myregion --filters 'Name=vpc-id,Values='$vpc | grep VpnConnectionId
aws ec2 describe-vpn-gateways --region $myregion --filters 'Name=attachment.vpc-id,Values='$vpc | grep VpnGatewayId
aws ec2 describe-network-interfaces --region $myregion --filters 'Name=vpc-id,Values='$vpc | grep NetworkInterfaceId
```

And you should get the output of all the depending services, and you can easily delete them and rerun the terraform destroy command

Refrences
- https://bobcares.com/blog/the-vpc-has-dependencies-and-cannot-be-deleted-error/

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