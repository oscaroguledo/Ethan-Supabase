#!/bin/bash

# Change to the script's directory
cd "$(dirname "$0")"

output=$(deno run --allow-env --allow-net --env-file=.env login.ts 2>&1)

ACCESS_TOKEN=$(echo "$output" | grep "✅ Access Token:" | awk '{print $NF}')
USER_JSON=$(echo "$output" | grep -A 10 "🧑 User:" | tail -n +2)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token from login.ts"
  echo "Full output:"
  echo "$output"
  exit 1
fi

echo "✅ Access Token: $ACCESS_TOKEN"
# echo "🧑 User info:"
# echo "$USER_JSON"

curl -X POST 'https://zwdmpmdembbqqrglqdsj.functions.supabase.co/getSignedUrl' \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Content-Type: application/json' \
  -d '{"filePath":"uploads/abc.pdf"}'

echo ""
