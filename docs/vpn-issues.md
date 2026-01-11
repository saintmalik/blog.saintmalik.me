---
title: VPN Troubleshooting (Warp Conflict & Packet Drops)
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

## Cloudflare Warp Conflicts with OpenVPN (Split Tunneling Fix)

**The Issue:**

When Cloudflare Warp is active, connection to internal AWS clusters via OpenVPN drops. This happens because Warp installs a broad routing table rule (Zero Trust) that hijacks traffic intended for the private VPN tunnel.

**The Fix:**

You must configure Warp to **exclude** your private subnets so OpenVPN can handle them.

1. Open **Cloudflare Warp Preferences** > **Split Tunnels**.
2. Set mode to **"Exclude IPs and domains"**.
3. Add your AWS VPC CIDRs:
   - `19.0.0.0/16` (cluster 1)
   - `10.24.0.0/16` (Cluster 2)

## Yarn Install / SSL Errors on VPN (MTU Mismatch)

**The Problem (Symptoms):**
*   **Kubernetes/EKS:** `kubectl` fails with `TLS handshake timeout` or `Unable to connect to the server`.
*   **Yarn/Downloads:** Large downloads freeze or fail with `Bad Record MAC`.
*   **Browsers:** Some websites just spin forever.

**The Reason:**

Your data packets are too fat for the tunnel.
Specifically for **Kubernetes**, the **TLS Handshake ("ClientHello")** is a very large packet. If it's bigger than the tunnel allows, it gets dropped silently. The server never hears you say "Hello," so it times out.

**The Analogy:**

Imagine the internet is a series of tunnels. Your VPN traffic is like a **Transport Truck** moving data.

*   **Standard Internet Tunnel height:** 1500 units.
*   **VPN Truck height:** 1500 units.

Normally, the truck fits snugly. But some company networks add extra layers of security (like "double wrapping" the data), effectively **lowering the ceiling** of the tunnel. When your 1500-unit VPN truck tries to enter this smaller tunnel, it crashes (packet drop).

**The Fix:**

Force OpenVPN to use smaller TCP segments by adding `mssfix` to the server config.

**"Plain English" Explanation of Fix:**

Setting `tun-mtu 1200` is like permanently chopping the top off your truck so it is only **1200 units tall**. It now fits easily through *any* tunnel, no matter how low the ceiling is.

```tf
# openvpn.tf > user_data
cat > /etc/openvpn/server.conf <<SERVER_CONF
...
explicit-exit-notify 1
tun-mtu 1200 <-- Added this line
mssfix 1360  <-- Added this line
SERVER_CONF