#!/bin/bash

# Load environment variables
set -a
source .env
set +a

# Extract project ref from SUPABASE_URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^\.]+)\.supabase\.co.*|\1|')

# Run login.ts and extract access token
output=$(deno run --allow-env --allow-net --env-file=.env login.ts 2>&1)
ACCESS_TOKEN=$(echo "$output" | grep "✅ Access Token:" | awk '{print $NF}')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token from login.ts"
  echo "Full output:"
  echo "$output"
  exit 1
fi

echo "✅ Access Token: $ACCESS_TOKEN"

# Construct dynamic function URL
FUNCTION_URL="https://${PROJECT_REF}.functions.supabase.co/getSignedUrl"

# Make the API call
curl -X POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Content-Type: application/json' \
  -d '{"filePath":"uploads/abc.pdf"}'

echo ""

echo "✅ Access Token: $ACCESS_TOKEN"
# echo "🧑 User info:"
# echo "$USER_JSON"

curl -X POST 'https://zwdmpmdembbqqrglqdsj.functions.supabase.co/getSignedUrl' \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Content-Type: application/json' \
  -d '{"filePath":"uploads/abc.pdf"}'

echo ""
