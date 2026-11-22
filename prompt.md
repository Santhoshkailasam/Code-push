11:43:01 AM: Deploy site                                                   
11:43:01 AM: ────────────────────────────────────────────────────────────────
11:43:01 AM: ​
11:43:01 AM: Starting to deploy site from 'frontend/dist'
11:43:01 AM: Calculating files to upload
11:43:01 AM: 0 new file(s) to upload
11:43:01 AM: 17 new function(s) to upload
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate
11:43:02 AM: Failed during stage 'building site': Build script returned non-zero exit code: 2 (https://ntl.fyi/exit-code-2)
11:43:02 AM: Failed to upload file: report-status
11:43:02 AM: Failed to upload file: store
11:43:02 AM: Failed to upload file: report-crash
11:43:02 AM: Failed to upload file: remote-config
11:43:02 AM: Failed to upload file: auto-patch
11:43:02 AM: Failed to upload file: send-alert
11:43:02 AM: Failed to upload file: github-webhook
11:43:02 AM: Failed to upload file: publish-release
11:43:02 AM: Failed to upload file: download-bundle
11:43:02 AM: Failed to upload file: projects
11:43:02 AM: Failed to upload file: send-push-notification
11:43:02 AM: Failed to upload file: releases
11:43:02 AM: Failed to upload file: mesh-relay
11:43:02 AM: Failed to upload file: auth
11:43:02 AM: Failed to upload file: db
11:43:02 AM: Failed to upload file: geoResolver
11:43:02 AM: Failed to upload file: check-update
11:43:02 AM: Section completed: deploying
11:43:02 AM: ​
11:43:02 AM: Error deploying                                               
11:43:02 AM: ────────────────────────────────────────────────────────────────
11:43:02 AM: ​
11:43:02 AM:   Error message
11:43:02 AM:   Deploy did not succeed with HTTP Error 400: [PUT /deploys/{deploy_id}/functions/{name}][400] uploadDeployFunction default  &{Code:400 Message:Failed to create function: invalid parameter for function creation: Your environment variables exceed the 4KB limit imposed by AWS Lambda. Please consider reducing them or upgrading from Lambda compatibility mode to remove this limitation: https://ntl.fyi/functions-migrate}
11:43:02 AM: ​
11:43:02 AM:   Error location
11:43:02 AM:   At deploy the stage with HTTP status code '400'
11:43:02 AM: ​
11:43:02 AM:   Resolved config
11:43:02 AM:   build:
11:43:02 AM:     base: /opt/build/repo/frontend
11:43:02 AM:     command: npm run build
11:43:02 AM:     commandOrigin: config
11:43:02 AM:     environment:
11:43:02 AM:       - CODEPUSH_API_KEY
11:43:02 AM:       - DATABASE_URL
11:43:02 AM:       - DB_HOST
11:43:02 AM:       - DB_NAME
11:43:02 AM:       - DB_PASSWORD
11:43:02 AM:       - DB_PORT
11:43:02 AM:       - DB_SCHEMA
11:43:02 AM:       - DB_USER
11:43:02 AM:       - FIREBASE_SERVICE_ACCOUNT
11:43:02 AM:       - RBAC_DB_NAME
11:43:02 AM:       - VITE_ACCESS_TOKEN
11:43:02 AM:       - VITE_FIREBASE_API_KEY
11:43:02 AM:       - VITE_FIREBASE_APP_ID
11:43:02 AM:       - VITE_FIREBASE_AUTH_DOMAIN
11:43:02 AM:       - VITE_FIREBASE_DATABASE_URL
11:43:02 AM:       - VITE_FIREBASE_MESSAGING_SENDER_ID
11:43:02 AM:       - VITE_FIREBASE_PROJECT_ID
11:43:02 AM:       - VITE_FIREBASE_STORAGE_BUCKET
11:43:02 AM:       - VITE_REFRESH_TOKEN
11:43:02 AM:       - VITE_REFRESH_TOKEN_EXPIRY_DAYS
11:43:02 AM:       - VITE_REFRESH_TOKEN_EXPIRY_HOURS
11:43:02 AM:       - VITE_TOKEN_EXPIRY_DAYS
11:43:02 AM:       - VITE_TOKEN_EXPIRY_HOURS
11:43:02 AM:       - VITE_TOKEN_EXPIRY_MINUTES
11:43:02 AM:       - VITE_TOKEN_EXPIRY_SECONDS
11:43:02 AM:     publish: /opt/build/repo/frontend/dist
11:43:02 AM:     publishOrigin: config
11:43:02 AM:   functionsDirectory: /opt/build/repo/frontend/netlify/functions
11:43:02 AM:   redirects:
11:43:02 AM:     - from: /*
11:43:02 AM:       status: 200
11:43:02 AM:       to: /index.html
11:43:02 AM:   redirectsOrigin: config
11:43:02 AM: Build failed due to a user error: Build script returned non-zero exit code: 2
11:43:02 AM: Failing build: Failed to build site