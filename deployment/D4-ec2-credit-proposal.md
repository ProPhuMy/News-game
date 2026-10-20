# D4 EC2 Free Plan proposal — not approved for provisioning

Updated 2026-10-20 on `codex/visual-d4`. User confirms Free Plan, 183 days remaining and $100 credits remaining (user relay, not independent account access). Credit-specific expiry/applicable products and other AWS usage are not yet confirmed. User authorizes evaluation only. Paid hosting, account upgrades and provisioning remain unauthorized. Keep the existing Render Free service available and unchanged as fallback.

## Recommendation

Conditionally use one Linux **t3.micro** in us-east-1 (Northern Virginia): 2 vCPUs, 1 GiB RAM, one encrypted 20 GiB gp3 root disk and exactly one public IPv4. This revises the earlier t3.small recommendation after the user confirmed a $100/183-day budget. AWS lists t3.micro as credit-based Free Plan eligible. No resource has been created or resized.

At approximately $12.84/month, the micro configuration uses about $77.26 over 183 days, leaving about $22.74 before excess transfer or other AWS usage. The earlier small configuration would use about $122.94 over the same period and cannot fit $100 for the whole window. Reserve at least $20 of credits; review consumption weekly and sooner if traffic rises. These are estimates, not spending enforcement.

Use CPU **Standard**, explicitly overriding T3 Unlimited. Earned CPU credits and Free Plan dollar credits are different. Standard throttles to baseline when CPU credits run out instead of incurring surplus CPU charges; do not change to Unlimited or resize automatically.

A local idle native production-server check (AI none, no players, Node v26.12.0) starts/closes successfully and measures 118 MiB RSS / 24 MiB used JS heap. This supports testing a one-GiB host, not a capacity certification: Docker/OS/Caddy, build peaks and concurrent matches are unmeasured. Browser rendering happens on clients. Deploy first as a seven-day evaluation. Prefer transferring a verified image built without new paid infrastructure; if building on the micro, use a bounded swap file within the existing disk and prove build success/memory behavior before accepting release. Build time may be slow in CPU Standard mode. No second builder instance, paid CI or remote registry is assumed.

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
| EC2 t3.micro Linux | 730 h × $0.0104/h | $7.592 |
| EBS gp3 | 20 GiB × $0.08/GiB-month; baseline IOPS/throughput | $1.600 |
| Public IPv4 | 730 h × $0.005/h | $3.650 |
| Internet ingress | Standard internet ingress | $0.000 |
| Internet egress up to unused allowance | First 100 GB/month shared across AWS services/regions | $0.000 |
| **Base** | Before excess transfer / unrelated usage | **$12.842 ≈ $12.84** |

AWS's regional Linux pricing feed was rechecked: t3.micro $0.0104/hour, t3.small $0.0208/hour. The T3 marketing page's small-rate discrepancy is irrelevant to the micro estimate. Recheck the launch quote in the account's available region before provisioning; do not activate advanced features to unlock a region. A $15/month planning allowance is reasonable for a short evaluation, but spending $15 every month would leave only about $9.75 after 183 days, below the preferred $20 reserve. Target the $12.84 base and keep excess usage near zero if preserving the full window.

Assuming the shared 100-GB outbound allowance is otherwise unused and the initial $0.09/GB overage tier applies:

| Total internet egress/month | Additional credit estimate | Total credit estimate |
| --- | ---: | ---: |
| 10 GB | $0.00 | $12.84 |
| 100 GB | $0.00 | $12.84 |
| 200 GB | $9.00 | $21.84 |
| 500 GB | $36.00 | $48.84 |

Other AWS services share the allowance. If they already use all 100 GB, this game's 100 GB adds about $9 instead of $0. Use actual remaining allowance, not a separate 100 GB allocation per instance. WebSocket snapshots, reloads, bots/scanners and ordinary asset downloads all count toward transfer. Asset storage in current dist/client is about 4.64 MB, measured locally; this is not measured per-session traffic or an estimate of WebSocket usage. No concurrent-player or bandwidth capacity is certified.

For the confirmed 183 days (4,392 hours), using 730-hour monthly equivalents:

| Resource | Credit estimate for 183 days |
| --- | ---: |
| Micro compute | $45.68 |
| One public IPv4 | $21.96 |
| 20 GiB gp3 | about $9.63 |
| **Base total** | **about $77.26** |
| **Balance left from $100** | **about $22.74** |

Storage prorating follows billing calendars, so totals are approximate. If 200 GB egress/month persists instead, the total is about $131.41 over 183 days and does not fit $100. Once the $20 reserve is preserved, only about $2.74 remains above the low-transfer base for the whole window; unrelated workloads and transfer can consume that quickly. The traffic target is to stay inside the unused shared 100-GB allowance, with headroom, not to treat it as a guaranteed application cap. Alerts and billing totals can lag. Stop/review earlier rather than upgrade or promise all 183 days at any traffic level.

Actual remaining service time is limited by the Free Plan expiry, the applicable credit expiry and actual burn. Treat the 183 days as the user-confirmed current reading, not an exact expiration timestamp; record the exact console date before launch. No extra earned credits are assumed.

## Plan preservation and account checks

AWS's credit-based Free Plan ends at its time limit or credit exhaustion. Resources become unavailable when it ends; credits do not make EC2 perpetual free hosting. Maintain fallback access before that date. Do not upgrade to recover a suspended account. Do not join/create Organizations, configure Control Tower or activate advanced features, purchase a reservation/Savings Plan or accept an upgrade/service prompt. If an operation requires a Paid Plan, stop and return to the user.

Before approval, obtain only non-secret account facts:

1. Free Plan, $100 remaining and 183 days remaining are now user-confirmed. Record the exact expiration date/time before scheduling teardown; do not ask again for already-confirmed plan type/balance.
2. Active credit details: estimated remaining amount, expiration date and applicable products, including EC2, EBS and public IPv4/VPC. Reconcile current-month usage; the older Amount remaining column may lag.
3. Current shared outbound allowance consumption, supported region/AMI/instance/address permissions without any upgrade, and any existing AWS workloads consuming the same credits.
4. Confirmed usable domain/subdomain and DNS control, or a separately reviewed no-purchase HTTPS alternative. Domain restoration/renewal price remains the user's investigation.

Read-only console paths: Console Home → Cost and Usage widget (balance/plan expiry/days); newer experience: settings.aws.com → Billing → Current Plan / Credits remaining. Older Billing and Cost Management → Credits → individual credit details; Bills → Savings for current estimates. Compare Free Plan expiry with individual credit expiry. Do not click Upgrade Plan or Activate advanced features.

Propose a first seven-day evaluation window, with a review before continuing. Expected micro base for seven days is about $2.96, before extra transfer/other usage. Check balances/usage daily and retain a reserve for teardown. Budget/email notifications are monitoring, not a guaranteed real-time hard cutoff; do not create paid budget actions or automation as part of this proposal. Agree an explicit teardown date before account/credit expiry. Stopping compute alone leaves storage and retained IPv4 consumption; full teardown includes root volume and address release after approved artifact retention.

## Render fallback

Keep `https://news-town-staging.onrender.com/` and its existing Free configuration unchanged. No upgrade, deletion or redeployment is performed by this evaluation. Its historical revision is not the D4 candidate. Before using it as the release fallback, deploy the reviewed candidate there under existing staging authorization and repeat public smoke checks. Render Free idle sleep/restarts and lost in-memory rooms remain limitations; it is not an always-on equivalent. Switching hosts cannot transfer running matches or reconnect credentials.

## Evidence and next gate

Public AWS/Caddy/Render documentation and regional pricing feed were read. Local repository was clean at evaluation start; built asset size and arithmetic were checked. AWS CLI is not installed here; no AWS account access, independent plan/balance verification, credentials, provisioning, account change, domain change, deployment or application code edit occurred. A native idle production-server start/memory/close check succeeded; it is not a container or loaded-server test. No new app tests are required for this documentation-only evaluation; earlier D4 verification remains separate.

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
