#!/usr/bin/env bash
# Smoke test of the built app against the stand-in HubSpot and Supertext APIs
# (CI runs it; locally: npm run build && bash scripts/smoke.sh).
# Installs the app through OAuth, saves the settings, translates a website page
# and a marketing email from the app and checks the drafts in the stand-in.
set -euo pipefail
cd "$(dirname "$0")/.."
work=$(mktemp -d)
jar="$work/cookies"
app=http://127.0.0.1:8080
hs=http://127.0.0.1:8766
cleanup() { kill $(jobs -p) 2>/dev/null || true; }
trap cleanup EXIT

# One process (not npx tsx, whose child would outlive the cleanup).
node --import tsx tests/standin/server.ts > "$work/standin.log" 2>&1 &
HUBSPOT_CLIENT_ID=ci HUBSPOT_CLIENT_SECRET=ci-secret HUBSPOT_APP_BASE=$hs HUBSPOT_API_BASE=$hs \
SUPERTEXT_API_ENDPOINT=http://127.0.0.1:8765/v1/ SUPERTEXT_API_KEY=ci-key SUPERTEXT_REPORT_URL=http://127.0.0.1:8765/report \
APP_URL=$app SESSION_SECRET=ci-session PORT=8080 \
  node dist/server.js > "$work/app.log" 2>&1 &
for i in $(seq 1 30); do curl -fs $app/health > /dev/null && curl -s -o /dev/null $hs/oauth/authorize && break; sleep 1; done

fail() { echo "FAILED: $1"; echo '--- app.log'; cat "$work/app.log"; echo '--- standin.log'; cat "$work/standin.log"; exit 1; }

start=$(curl -fs -c "$jar" -b "$jar" $app/)
grep -q 'Connect HubSpot' <<< "$start" || fail 'connect page'
curl -fs -L -c "$jar" -b "$jar" -o /dev/null $app/oauth/start || fail 'OAuth flow'
settings=$(curl -fs -c "$jar" -b "$jar" $app/settings)
grep -q 'swiss-chocolate.example' <<< "$settings" || fail 'settings page after connecting'
csrf=$(grep -o 'data-csrf="[^"]*"' <<< "$settings" | head -1 | sed -E 's/data-csrf="([^"]*)"/\1/')
curl -fs -c "$jar" -b "$jar" -o /dev/null -X POST $app/settings \
  --data-urlencode "csrf=$csrf" -d sourceLanguage=en -d target=de-ch -d target=fr-ch -d tone=default -d versionReports=1 || fail 'saving settings'
curl -fs -o /dev/null $app/static/app.js || fail 'static files'

page=$(curl -fs -c "$jar" -b "$jar" "$app/?kind=site-page")
grep -q 'About us' <<< "$page" || fail 'page list'

run_job() { # kind itemId
  local job status
  job=$(curl -fs -c "$jar" -b "$jar" -X POST $app/api/jobs -H "X-CSRF-Token: $csrf" -H 'Content-Type: application/json' \
    -d "{\"kind\":\"$1\",\"itemId\":\"$2\",\"languages\":[\"de-ch\",\"fr-ch\"]}" | sed -E 's/.*"id":"([^"]+)".*/\1/')
  for i in $(seq 1 30); do
    status=$(curl -fs -c "$jar" -b "$jar" "$app/api/jobs/$job")
    grep -q '"status":"running"' <<< "$status" || break
    sleep 1
  done
  grep -q 'Done: 2 created, 0 updated, 0 kept, 0 failed.' <<< "$status" || fail "$1 job: $status"
}
run_job site-page 101
run_job email 401

# Look at the drafts in the stand-in with a token of our own.
token=$(curl -fs -X POST $hs/oauth/2026-09/token -d grant_type=authorization_code -d code=standin-code -d client_id=ci -d client_secret=x -d redirect_uri=x \
  | sed -E 's/.*"access_token":"([^"]+)".*/\1/')
# The translations are in the drafts of the new versions (nothing is published).
draft_of() { # path language sourceField sourceId
  local id
  id=$(curl -fs "$hs$1?limit=50" -H "Authorization: Bearer $token" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d).results.find(x=>x.language==='$2'&&String(x['$3'])==='$4');process.stdout.write(r?String(r.id):'')})")
  [ -n "$id" ] || fail "no $2 version of $4 in $1"
  curl -fs "$hs$1/$id/draft" -H "Authorization: Bearer $token"
}
grep -q 'Über uns' <<< "$(draft_of /cms/pages/2026-09/site-pages de-ch translatedFromId 101)" || fail 'German page variant in HubSpot'
grep -q 'Nos chocolats d’automne sont arrivés' <<< "$(draft_of /marketing/emails/2026-09 fr-ch clonedFrom 401)" || fail 'French email clone in HubSpot'

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST $app/api/jobs -H 'Content-Type: application/json' -d '{}')
[ "$code" = "401" ] || fail "API without a session answered $code"
echo 'Smoke test passed.'
