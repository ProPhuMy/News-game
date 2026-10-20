# D4 EC2 Free Plan proposal — not approved for provisioning

Prepared 2026-10-20 on `codex/visual-d4`. User authorizes evaluation only. Paid hosting, account upgrades and provisioning remain unauthorized. Keep the existing Render Free service available and unchanged as fallback.

## Recommendation

Conditionally use one Linux `t3.small` in `us-east-1` (Northern Virginia), with 2 vCPUs, 2 GiB RAM, one encrypted 20 GiB gp3 root volume and exactly one public IPv4 address. The two GiB size provides more build/runtime headroom than a one GiB micro without changing architecture; actual capacity remains to be tested. AWS lists t3.small as eligible for the post-July-2025 credit-based Free Plan. This is credit consumption at ordinary rates, not an assertion that instance-hours are intrinsically free.

Use CPU **Standard**, explicitly overriding the T3 Unlimited default. Standard mode throttles to baseline when earned CPU credits run out instead of consuming surplus CPU credit charges. Build time and sustained load may therefore be slower. Do not change to Unlimited or a larger instance automatically.

For comparison only, t3.micro would reduce compute to $7.592/month and the same base setup to $12.842/month, but halves RAM and baseline CPU. It is not the selected proposal; do not silently substitute it.

## Proposed topology and controls

- One first-party Amazon Linux 2023 x86_64 AMI, shared-tenancy On-Demand EC2, one existing public subnet with an internet gateway. No Spot interruptions, Savings Plan, reservation, Marketplace AMI, load balancer, NAT gateway, database, extra instance or cross-AZ service.
- One 20 GiB encrypted gp3 root disk, baseline 3,000 IOPS / 125 MB/s, delete on termination. Use default AWS-managed encryption; do not create a customer-managed KMS key. No snapshots in this estimate; record immutable source SHA and retain previous image/build locally for rollback.
- Exactly one public IPv4. Prefer one Elastic IP for a stable DNS target, with automatic public-IP assignment disabled so a second address is not allocated. Confirm the operation is allowed on the actual Free Plan before proceeding. Release the address during final teardown; an idle Elastic IP still consumes credits. If Elastic IP is unavailable without upgrading, stop and review an automatically assigned address instead.
- Caddy on the same host terminates HTTPS/WSS for an existing, confirmed domain/subdomain. Bind the Node 24 production container to host loopback only, with restart supervision and bounded local logs. Security group admits public TCP 80/443; administrative SSH only from the user's specified IP. Application port 3000 is not public. Require IMDSv2.
- `AI_PROVIDER=none`, no provider keys. Keep `TRUST_RENDER_PROXY=false`: this is not Render's managed edge.
- **Deployment adaptation required before acceptance:** current `src/server/proxy.ts` only understands direct peers or the trusted Render header. Behind same-host Caddy, false mode sees the proxy's address and shares the creation budget across users. Reproduce this with a server regression, then propose the smallest separately reviewed local-proxy address boundary: only trust the host-controlled proxy path, overwrite incoming forwarded headers, and reject spoofing/direct-port access. Do not turn on the Render flag or trust arbitrary forwarded headers to bypass the issue. This proposal does not implement that change or authorize a gameplay-contract change.
- Use an existing DNS provider/domain if available. The user's expired domain is **unconfirmed**; restoration/renewal costs are outside this estimate and not authorized. No Route 53 hosted zone or domain purchase is included. HTTPS/domain availability is a release prerequisite, not assumed solved by the EC2 hostname.
- Basic EC2 metrics and bounded local logs only. No paid detailed monitoring, custom metrics, log ingestion, backup service or registry service is included. Re-evaluate costs before adding one.

## Credit estimate

USD gross usage value for 730 running hours/month, one instance, one 20 GiB disk, one IPv4 and no other AWS workload. Ordinary rates are included even where an account-specific free allowance might reduce actual consumption; no legacy 750-hour or 30-GB entitlement is assumed. Confirm eligible credit coverage for each line before launch.

| Item | Assumption | Estimated credits/month |
| --- | --- | ---: |
| EC2 t3.small Linux | 730 h × $0.0208/h | $15.184 |
| EBS gp3 | 20 GiB × $0.08/GiB-month; baseline IOPS/throughput | $1.600 |
| Public IPv4 | 730 h × $0.005/h | $3.650 |
| Internet ingress | Standard internet ingress | $0.000 |
| Internet egress up to unused allowance | First 100 GB/month shared across AWS services/regions | $0.000 |
| **Base** | Before excess transfer / unrelated usage | **$20.434 ≈ $20.43** |

AWS's regional Linux pricing feed retrieved during this evaluation reports $0.0208/hour for t3.small and $0.0104 for t3.micro, publication 2026-10-15. The T3 marketing table currently displays $0.0209 for small; using it changes the base by only $0.073/month to $20.507. Reserve **$25 credits/month** for the proposed base, rather than treat a rounded estimate as a hard ceiling. Recheck the console quote in the account's supported region before provisioning; do not activate advanced features to unlock a region.

Assuming the shared 100-GB outbound allowance is otherwise unused and the initial $0.09/GB overage tier applies:

| Total internet egress/month | Additional credit estimate | Total credit estimate |
| --- | ---: | ---: |
| 10 GB | $0.00 | $20.43 |
| 100 GB | $0.00 | $20.43 |
| 200 GB | $9.00 | $29.43 |
| 500 GB | $36.00 | $56.43 |

Other AWS services share the allowance. If they already use all 100 GB, this game's 100 GB adds about $9 instead of $0. Use actual remaining allowance, not a separate 100 GB allocation per instance. WebSocket snapshots, reloads, bots/scanners and ordinary asset downloads all count toward transfer. Asset storage in current dist/client is about 4.64 MB, measured locally; this is not measured per-session traffic or an estimate of WebSocket usage. No concurrent-player or bandwidth capacity is certified.

At the low-transfer base, $100 of entirely available applicable credits covers approximately **4.89 average months**, and six average months consumes about **$122.60**. $200 covers the six-month maximum with approximately $77.40 left before unrelated usage, overage and eligibility differences. Actual remaining service time is the minimum of remaining Free Plan time, each applicable credit's validity and remaining credits divided by actual burn. Do not assume the user has $100/$200 remaining or has earned additional credits.

## Plan preservation and account checks

AWS's credit-based Free Plan ends at its time limit or credit exhaustion. Resources become unavailable when it ends; credits do not make EC2 perpetual free hosting. Maintain fallback access before that date. Do not upgrade to recover a suspended account. Do not join/create Organizations, configure Control Tower or activate advanced features, purchase a reservation/Savings Plan or accept an upgrade/service prompt. If an operation requires a Paid Plan, stop and return to the user.

Before approval, obtain only non-secret account facts:

1. Current plan label explicitly Free Plan, current eligible estimated balance and Free Plan expiry/date or days remaining. A credit balance alone does not establish plan type.
2. Active credit details: estimated remaining amount, expiration date and applicable products, including EC2, EBS and public IPv4/VPC. Reconcile current-month usage; the older Amount remaining column may lag.
3. Current shared outbound allowance consumption, supported region/AMI/instance/address permissions without any upgrade, and any existing AWS workloads consuming the same credits.
4. Confirmed usable domain/subdomain and DNS control, or a separately reviewed no-purchase HTTPS alternative. Domain restoration/renewal price remains the user's investigation.

Read-only console paths: Console Home → Cost and Usage widget (balance/plan expiry/days); newer experience: settings.aws.com → Billing → Current Plan / Credits remaining. Older Billing and Cost Management → Credits → individual credit details; Bills → Savings for current estimates. Compare Free Plan expiry with individual credit expiry. Do not click Upgrade Plan or Activate advanced features.

Propose a first seven-day evaluation window, with a review before continuing. Expected base for seven days is about $4.70, before extra transfer/other usage. Check balances/usage daily and retain a reserve for teardown. Budget/email notifications are monitoring, not a guaranteed real-time hard cutoff; do not create paid budget actions or automation as part of this proposal. Agree an explicit teardown date before account/credit expiry. Stopping compute alone leaves storage and retained IPv4 consumption; full teardown includes root volume and address release after approved artifact retention.

## Render fallback

Keep `https://news-town-staging.onrender.com/` and its existing Free configuration unchanged. No upgrade, deletion or redeployment is performed by this evaluation. Its historical revision is not the D4 candidate. Before using it as the release fallback, deploy the reviewed candidate there under existing staging authorization and repeat public smoke checks. Render Free idle sleep/restarts and lost in-memory rooms remain limitations; it is not an always-on equivalent. Switching hosts cannot transfer running matches or reconnect credentials.

## Evidence and next gate

Public AWS/Caddy/Render documentation and regional pricing feed were read. Local repository was clean at evaluation start; built asset size and arithmetic were checked. AWS CLI is not installed here; no AWS account access, plan/balance verification, credentials, provisioning, account change, domain change, deployment or application code edit occurred. No new app tests are required for this documentation-only evaluation; earlier D4 verification remains separate.

Show this conditional setup and estimate to the user, resolve account/domain facts, then obtain explicit provisioning approval for the concrete resources. D4 remains incomplete until actual deployment/container/proxy/public-match/rollback evidence and C4 review pass. No account upgrade is ever authorized by approving EC2 credit usage.

## Sources checked

- [AWS EC2 Free Tier eligibility](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html)
- [AWS plan rules and automatic-upgrade triggers](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)
- [Free Plan duration and expiry](https://aws.amazon.com/free/free-tier-faqs/)
- [Regional Linux compute price feed](https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/ec2-ondemand-without-sec-sel/US%20East%20%28N.%20Virginia%29/Linux/index.json) and [T3 specifications/pricing](https://aws.amazon.com/ec2/instance-types/t3/)
- [EBS pricing](https://aws.amazon.com/ebs/pricing/) and [regional gp3 example](https://aws.amazon.com/blogs/storage/migrate-your-amazon-ebs-volumes-from-gp2-to-gp3-and-save-up-to-20-on-costs/)
- [IPv4 pricing](https://aws.amazon.com/vpc/pricing/)
- [EC2 transfer allowance/pricing](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Credit balance, estimates, validity and applicable products](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/useconsolidatedbilling-credits.html)
- [New AWS Settings billing interface](https://docs.aws.amazon.com/accounts/latest/reference/view-billing-information.html) and [Console Home plan tracking](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-FAQ.html)
- [CPU Standard mode](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html)
- [Caddy HTTPS](https://caddyserver.com/docs/automatic-https) and [WebSocket reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Render Free limits](https://render.com/docs/free)
