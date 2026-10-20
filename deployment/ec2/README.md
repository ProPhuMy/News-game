# EC2 deployment preparation — do not launch yet

Owner: Codex. Scope: one credit-funded instance, no account upgrade, paid service or automatic resource creation. These are reviewable operator instructions, not an executed deployment. Resource launch and DNS changes require explicit user approval. Keep Render Free unchanged as fallback.

## Resource review before launch

Use the accepted assessment in `deployment/D4-ec2-credit-proposal.md`: one first-party Amazon Linux 2023 x86_64 AMI, `t3.micro`, CPU **Standard**, 20 GiB encrypted gp3 at baseline performance, one public IPv4, one instance. No Marketplace software, NAT gateway, load balancer, extra instance, snapshot plan or paid monitoring. Expected base is approximately $2.96 for seven days / $12.84 per 730 hours. Retain $20 credit reserve and stop/review if actual or forecast usage would consume it.

Record the account's concrete region/AMI/instance/volume/IP quote and exact Free Plan expiration before asking for launch approval. User confirms Free Plan, $100 and 183 days; credit expiry is 2027-10-20 15:09 UTC, with EC2/VPC/Data Transfer applicability. Do not ask again for these facts. Any upgrade prompt or non-credit-supported product stops this procedure. Nothing here authorizes a Paid Plan upgrade, subscription, domain renewal or out-of-pocket payment.

Record resource IDs, exact source SHA, image digest, current/previous release tags and actual usage in `deployment/D4-production-verification.md` without credentials. No paid resource is created by recording a quote.

## Topology and DNS choice

The initial topology is **Cloudflare DNS only**, browser HTTPS/WSS directly to Caddy on EC2, then private HTTP/WebSocket to the Node container. Cloudflare is the DNS provider, not a trusted HTTP proxy in this configuration. Do not turn the record orange/proxied without separately reviewing source-address handling and origin protection. Keep `TRUST_RENDER_PROXY=false`.

User owns `prophumy.com`. Proposed game hostname is `newstown.prophumy.com`; confirm the hostname before creating its DNS record. After the approved instance has its single stable IPv4, create one DNS-only A record for that name pointing to it. Do not add AAAA without verified IPv6 routing. No paid Cloudflare feature or Route 53 resource is needed. Caddy obtains a public certificate; preserve its `/data` volume for renewals. Domain registration alone is not HTTPS readiness.

AWS security group: inbound TCP 80/443 from internet; TCP 22 only from the user's current administrative IP. No inbound rule for 3000, including VPC/source-group rules. Require IMDSv2. Exactly one public address: if using an Elastic IP, avoid allocating a second automatic public IPv4. No open administrative port or private key is committed.

## Host prerequisites after launch approval

Use patched Docker Engine on Linux. Require Docker 28 or newer for the documented loopback-publishing behavior; older versions have a same-L2 exposure caveat. Keep default bridge NAT and direct routing disabled. Check actual bridge subnet does not overlap the VPC. Do not install paid tooling or create a separate builder. Retain bounded local logs and watch disk space.

Local Docker daemon access is currently denied; Docker/Caddy/container commands below have not been validated here. Install and validate the approved host runtime before accepting production. A one-GiB host may need a bounded swap file inside the existing disk for build peaks; no extra volume is authorized. If build/runtime fails, diagnose or return to Render Free rather than silently resize or enable CPU Unlimited.

## Build and pin the exact candidate

Build only a reviewed, committed source SHA. Transfer an archive of that SHA over the approved administrative channel, verify the archive hash, extract into its own release directory and record the SHA there. Never transfer `.env`, browser storage, reconnect tokens or untracked files. If using `git archive`, remember that archive output omits Git metadata; supply and record the full SHA separately.

From the extracted release directory on the host, set `NEWS_TOWN_RELEASE` to that full reviewed SHA and build the existing Dockerfile:

```bash
test -n "$NEWS_TOWN_RELEASE"
docker build --label "org.opencontainers.image.revision=$NEWS_TOWN_RELEASE" -t "news-town:$NEWS_TOWN_RELEASE" .
docker image inspect "news-town:$NEWS_TOWN_RELEASE" --format '{{.Id}}'
docker pull caddy:2
NEWS_TOWN_CADDY_IMAGE="$(docker image inspect caddy:2 --format '{{index .RepoDigests 0}}')"
test -n "$NEWS_TOWN_CADDY_IMAGE"
```

Retain the resolved Caddy digest in the release record and use that immutable reference thereafter. A mutable `caddy:2` tag is only used to resolve a reviewed runtime, not silently change a running release. No Docker registry service is provisioned. Record the build output and Node 24 runtime version without environment dumps.

## Explicit proxy trust and private backend

`TRUSTED_PROXY_ADDRESS` enables only a single exact immediate proxy peer, which may supply a valid single `X-Real-IP`. It is mutually exclusive with Render trust. Caddy overwrites that header from its actual direct remote peer; it must never copy a user-supplied header. Names/headlines, engine rules, per-IP limits and protocol are unchanged.

Caddy uses host networking. The app uses Docker's default bridge and is published only on loopback. Its immediate peer will normally be the actual bridge gateway; derive it rather than assume `172.17.0.1`. Verify this on the actual host. If runtime packets use a different peer, diagnose before changing trust; never trust a CIDR, all peers or arbitrary forwarded chains.

Run these only for the approved initial deployment, with `NEWS_TOWN_RELEASE` and `NEWS_TOWN_DOMAIN` explicitly set:

```bash
test -n "$NEWS_TOWN_RELEASE"
test -n "$NEWS_TOWN_DOMAIN"
NEWS_TOWN_PROXY_ADDRESS="$(docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}')"
test -n "$NEWS_TOWN_PROXY_ADDRESS"
docker run -d --name news-town-app --restart unless-stopped \
  --network bridge -p 127.0.0.1:3000:3000 \
  --log-driver local --log-opt max-size=10m --log-opt max-file=2 \
  -e NODE_ENV=production -e PORT=3000 -e AI_PROVIDER=none \
  -e TRUST_RENDER_PROXY=false -e "TRUSTED_PROXY_ADDRESS=$NEWS_TOWN_PROXY_ADDRESS" \
  "news-town:$NEWS_TOWN_RELEASE"
docker run --rm --network none \
  -e "NEWS_TOWN_DOMAIN=$NEWS_TOWN_DOMAIN" \
  -v "$PWD/deployment/ec2/Caddyfile:/etc/caddy/Caddyfile:ro" \
  "$NEWS_TOWN_CADDY_IMAGE" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker run -d --name news-town-edge --restart unless-stopped --network host \
  --log-driver local --log-opt max-size=10m --log-opt max-file=2 \
  -e "NEWS_TOWN_DOMAIN=$NEWS_TOWN_DOMAIN" \
  -v "$PWD/deployment/ec2/Caddyfile:/etc/caddy/Caddyfile:ro" \
  -v news-town-caddy-data:/data -v news-town-caddy-config:/config \
  "$NEWS_TOWN_CADDY_IMAGE"
```

`NEWS_TOWN_DOMAIN` is a bare approved hostname, not a URL or credentials. No real API key is required. Caddy validation must pass before starting the edge. Do not run these initial-name commands over an existing installation; use the recorded rollback/replacement procedure instead. Keep the referenced release directory while the edge uses its bind mount.

## Acceptance before publishing the URL

1. Confirm actual source SHA/image ID/runtime, single instance, CPU Standard, disk/IP count, Free Plan status and remaining credits. Check logs for safe startup; do not export raw environment values or private packets.
2. Verify host localhost can reach app port 3000 and an external/VPC peer cannot reach it. Check actual Docker port bindings and security-group rules, not just the README. Confirm a hostile client-supplied `X-Real-IP` cannot override Caddy's direct peer. Validate separate real external client budgets without retaining client IPs or private packets in committed evidence.
3. Verify public certificate, HTTPS redirects and WSS. Caddy handles WebSocket upgrade automatically. Do not expose the dev harness or add a production test route.
4. On the local workspace, build the identical committed candidate. Run `node deployment/D3-production-smoke.mjs https://APPROVED-HOST --remote --out deployment/D4-smoke-result.json`. Probe verifies asset bytes/MIME, separate seats, full five-round match, submitted investigation recovery, recipient privacy, final rendering, fonts and actual WSS. View shared-helper home/final PNGs directly. Keep SHA/deploy IDs in host evidence; sidecars exclude tokens/private packets.
5. Verify actual micro memory, CPU credit balance, disk and network consumption during the real match. Native 118-MiB idle RSS is not a loaded-container certificate. A failing check keeps D4 open. Do not resize or change CPU mode to manufacture a pass.
6. Obtain Claude's C4 review of the changed server/deployment boundary and final production evidence; resolve required findings before D4 closure. No launch claim is made by these instructions.

## Replacement, rollback, fallback and teardown

Before replacing an accepted release, retain the previous exact image ID/tag, archive SHA, environment/proxy settings and Caddy digest/config outside the retiring release directory. Use a quiet window: stopping the app loses all in-memory matches. Build/check the next image before touching the running app. Replacement runs one app container, never a second EC2 instance or replica.

If replacement fails, remove only the identified failed app container and recreate `news-town-app` using the recorded known-good image and the same private publication/proxy settings. Retain the edge and its certificate volume. Recheck actual SHA, assets, HTTPS/WSS and fresh match/reconnect. Do not call this an executed rollback until it has been exercised. Local images cannot survive host/disk loss; keep recoverable source/release metadata outside AWS before expiration.

Render Free remains at its existing URL/configuration. No Render changes are part of this preparation. Before using it for the current release, deploy the reviewed candidate there under applicable staging authorization and run public smoke; its historical revision is not the D4 candidate. Render idle sleep and lost room state remain explicit limitations. Host switching cannot migrate live matches or reconnect credentials.

After seven days, review actual credits/usage before continuing. Agree a teardown date before Free Plan expiry; credit expiry in 2027 does not extend the plan. Stopping EC2 alone leaves EBS/retained IPv4 consumption. Approved final teardown includes terminating the instance, verifying the delete-on-termination root disk is gone, releasing its public Elastic IP and removing/repointing only the game's DNS record. Preserve requested release evidence first. No teardown or live DNS mutation is executed by this file.

Sources: [Docker port publication](https://docs.docker.com/engine/network/port-publishing/), [official Caddy image](https://hub.docker.com/_/caddy), [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Caddy HTTPS](https://caddyserver.com/docs/automatic-https), and the linked AWS sources in the credit assessment.
