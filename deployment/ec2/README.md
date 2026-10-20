# EC2 deployment and verification — D4 passed

Owner: Codex. Scope: one credit-funded instance, no account upgrade, paid service or automatic resource creation. The user has executed the initial deployment on the approved Ubuntu replacement; see `../D4-production-verification.md` for passed D4 evidence, attribution and operational limits. Commands below are reference procedures, not proof they ran. Further resource launches or destructive replacements require explicit user approval. Keep Render Free unchanged as fallback.

## Resource review before launch

Use the accepted assessment in `deployment/D4-ec2-credit-proposal.md`: Ohio (`us-east-2`, the available project region), one Canonical Ubuntu Server 24.04 LTS x86_64 AMI (approved replacement for the initial Amazon Linux host), `t3.micro`, CPU **Standard**, 20 GiB encrypted gp3 at baseline performance, one public IPv4, one instance. No Marketplace software, NAT gateway, load balancer, extra instance, snapshot plan or paid monitoring. Expected base is approximately $2.96 for seven days / $12.84 per 730 hours. Retain $20 credit reserve and stop/review if actual or forecast usage would consume it.

Initial launch/replacement approvals were provided in the session. Record the account's concrete region/AMI/instance/volume/IP quote and exact Free Plan expiration for any future launch review. User confirms Free Plan, $100 and 183 days; credit expiry is 2027-10-20 15:09 UTC, with EC2/VPC/Data Transfer applicability. Do not ask again for these facts. Any upgrade prompt or non-credit-supported product stops this procedure. Nothing here authorizes a Paid Plan upgrade, subscription, domain renewal or out-of-pocket payment.

Record resource IDs, exact source SHA, image digest, current/previous release tags and actual usage in `deployment/D4-production-verification.md` without credentials. No paid resource is created by recording a quote.

## Topology and DNS choice

The initial topology is **Cloudflare DNS only**, browser HTTPS/WSS directly to Caddy on EC2, then private HTTP/WebSocket to the Node container. Cloudflare is the DNS provider, not a trusted HTTP proxy in this configuration. Do not turn the record orange/proxied without separately reviewing source-address handling and origin protection. Keep `TRUST_RENDER_PROXY=false`.

User owns `prophumy.com`. Approved game hostname is `newstown.prophumy.com`; the user created its DNS-only A record to `3.20.0.241`. Keep this existing record; do not create duplicate records or allocate another IP. Do not add AAAA without verified IPv6 routing. No paid Cloudflare feature or Route 53 resource is needed. Caddy obtains a public certificate; preserve its `/data` volume for renewals. Domain registration alone is not HTTPS readiness.

AWS security group: inbound TCP 80/443 from internet; TCP 22 only from the user's current administrative IP. No inbound rule for 3000, including VPC/source-group rules. Require IMDSv2. Exactly one public address: if using an Elastic IP, avoid allocating a second automatic public IPv4. No open administrative port or private key is committed.

## Host prerequisites after launch approval

Use patched Docker Engine on Linux. Require Docker 28 or newer for the documented loopback-publishing behavior; older versions have a same-L2 exposure caveat. Keep default bridge NAT and direct routing disabled. Check actual bridge subnet does not overlap the VPC. Do not install paid tooling or create a separate builder. Retain bounded local logs and watch disk space.

Workspace Docker daemon access remains denied. The user supplied successful Ubuntu host build/start/validation results with Docker29.9.1 and Caddy2.11.7; see the verification record for exact evidence and limits. Do not mistake local daemon denial for an unexecuted remote deployment. A one-GiB host may need a bounded swap file inside the existing disk for build peaks; no extra volume is authorized. If build/runtime fails, diagnose or return to Render Free rather than silently resize or enable CPU Unlimited.

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


### Recorded first Ubuntu recovery baseline — procedure not executed

Verified source is `744cc55f56ee24c10ed3a144d893fa03b4744f36` (includes proxy patch `913775e`). User verified retained tag `news-town:recovery-744cc55` points to app image `sha256:d499b0634fb437381ed36299487c4bf4bec9d610a629106696b3fc93884b0245`. Host archive `~/news-town-744cc55.tar.gz` SHA256 is `0f6b4b315babd452397a5cd8f8bbc333b09918b0c621ea820b0940e13b3168d3`; same source/archive exists outside AWS on Arch/origin. Full source/lock digest is in the verification record. No previous Ubuntu release exists. Preserve this image and release directory; do not prune them before a replacement has passed. Local image retention does not survive disk loss.

The edge remains `news-town-edge`, Caddy2.11.7 at digest `sha256:685ae3d7c34d9b5f8caeddc5d14051db7bbd88ff1f5a2fa0c16bd8ca328fb7af`, host network, persistent `news-town-caddy-data` and `news-town-caddy-config`, read-only `~/news-town/releases/744cc55/deployment/ec2/Caddyfile`. Preserve those volumes/config and DNS-only topology.

**Reference only: do not run during evidence collection.** If a later replacement fails, obtain the applicable quiet-window authorization and check no active rooms need preserving: all rooms/reconnect state in the stopped process will be lost. First verify this recovery image still exists, the gateway is still the recorded172.17.0.1 and edge/config/volumes are unchanged. If any check fails, diagnose rather than remove the app. Then stop/remove only the identified app container and recreate the baseline:

```bash
sudo docker image inspect sha256:d499b0634fb437381ed36299487c4bf4bec9d610a629106696b3fc93884b0245 --format '{{.Id}}'
sudo docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}'
# After checking those outputs and the quiet window, run separately:
sudo docker stop news-town-app
sudo docker rm news-town-app
sudo docker run -d --name news-town-app --restart unless-stopped \
  --network bridge -p 127.0.0.1:3000:3000 \
  --log-driver local --log-opt max-size=10m --log-opt max-file=2 \
  -e NODE_ENV=production -e PORT=3000 -e AI_PROVIDER=none \
  -e TRUST_RENDER_PROXY=false -e TRUSTED_PROXY_ADDRESS=172.17.0.1 \
  sha256:d499b0634fb437381ed36299487c4bf4bec9d610a629106696b3fc93884b0245
```

Recheck image/source identity, safe startup, localhost3000, external3000 blocking, actual bridge peer, HTTPS redirect/certificate and the public five-round assets/WSS/reconnect/results smoke against a local744cc55 build. A restored process accepts new rooms; it cannot restore lost matches. This is a documented recovery procedure with a verified retained artifact, **not an executed rollback**. No alternate host or extra instance is created.

Render Free remains at its existing URL/configuration. No Render changes are part of this preparation. Before using it for the current release, deploy the reviewed candidate there under applicable staging authorization and run public smoke; its historical revision is not the D4 candidate. Render idle sleep and lost room state remain explicit limitations. Host switching cannot migrate live matches or reconnect credentials.

After seven days, review actual credits/usage before continuing. Agree a teardown date before Free Plan expiry; credit expiry in 2027 does not extend the plan. Stopping EC2 alone leaves EBS/retained IPv4 consumption. Approved final teardown includes terminating the instance, verifying the delete-on-termination root disk is gone, releasing its public Elastic IP and removing/repointing only the game's DNS record. Preserve requested release evidence first. No teardown or live DNS mutation is executed by this file.

Sources: [Docker port publication](https://docs.docker.com/engine/network/port-publishing/), [official Caddy image](https://hub.docker.com/_/caddy), [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Caddy HTTPS](https://caddyserver.com/docs/automatic-https), and the linked AWS sources in the credit assessment.
