11:34:57 AM: "path" field must not start with "/.netlify"
11:34:57 AM: ​
11:34:57 AM: ❯ Current directory
11:34:57 AM:   /opt/build/repo
11:34:57 AM: ​
11:34:57 AM: ❯ Config file
11:34:57 AM:   /opt/build/repo/netlify.toml
11:34:57 AM: ​
11:34:57 AM: ❯ Context
11:34:57 AM:   production
11:34:57 AM: ​
11:34:57 AM: build.command from netlify.toml                               
11:34:57 AM: ────────────────────────────────────────────────────────────────
11:34:57 AM: ​
11:34:57 AM: $ npm run build
11:34:57 AM: > codepush@0.0.0 build
11:34:57 AM: > tsc -b && vite build
11:35:02 AM: Failed during stage 'building site': Build script returned non-zero exit code: 2 (https://ntl.fyi/exit-code-2)
11:35:01 AM: src/components/AutoPatchModal.tsx:8:3 - error TS6133: 'ArrowRight' is declared but its value is never read.
11:35:01 AM: 8   ArrowRight,
11:35:01 AM:     ~~~~~~~~~~
11:35:01 AM: src/components/AutoPatchModal.tsx:9:3 - error TS6133: 'ShieldCheck' is declared but its value is never read.
11:35:01 AM: 9   ShieldCheck,
11:35:01 AM:     ~~~~~~~~~~~
11:35:01 AM: src/components/AutoPatchModal.tsx:10:3 - error TS6133: 'Zap' is declared but its value is never read.
11:35:01 AM: 10   Zap,
11:35:01 AM:      ~~~
11:35:01 AM: src/components/AutoPatchModal.tsx:11:3 - error TS6133: 'Activity' is declared but its value is never read.
11:35:01 AM: 11   Activity,
11:35:01 AM:      ~~~~~~~~
11:35:01 AM: src/components/AutoPatchModal.tsx:13:3 - error TS6133: 'Code2' is declared but its value is never read.
11:35:01 AM: 13   Code2,
11:35:01 AM:      ~~~~~
11:35:01 AM: src/components/AutoPatchModal.tsx:15:3 - error TS6133: 'Layers' is declared but its value is never read.
11:35:01 AM: 15   Layers,
11:35:01 AM:      ~~~~~~
11:35:01 AM: src/components/MeshAnalyticsCard.tsx:4:3 - error TS6133: 'Wifi' is declared but its value is never read.
11:35:01 AM: 4   Wifi,
11:35:01 AM:     ~~~~
11:35:01 AM: src/components/MeshAnalyticsCard.tsx:5:3 - error TS6133: 'Share2' is declared but its value is never read.
11:35:01 AM: 5   Share2,
11:35:01 AM:     ~~~~~~
11:35:01 AM: src/components/MeshAnalyticsCard.tsx:6:3 - error TS6133: 'HardDrive' is declared but its value is never read.
11:35:01 AM: 6   HardDrive,
11:35:01 AM:     ~~~~~~~~~
11:35:01 AM: src/components/MeshAnalyticsCard.tsx:7:3 - error TS6133: 'CheckCircle2' is declared but its value is never read.
11:35:01 AM: 7   CheckCircle2,
11:35:01 AM:     ~~~~~~~~~~~~
11:35:01 AM: src/components/MeshAnalyticsCard.tsx:8:3 - error TS6133: 'ShieldCheck' is declared but its value is never read.
11:35:01 AM: 8   ShieldCheck,
11:35:01 AM:     ~~~~~~~~~~~
11:35:01 AM: src/components/MeshAnalyticsCard.tsx:9:3 - error TS6133: 'Zap' is declared but its value is never read.
11:35:01 AM: 9   Zap,
11:35:01 AM:     ~~~
11:35:01 AM: src/components/MeshAnalyticsCard.tsx:10:3 - error TS6133: 'ArrowDownToLine' is declared but its value is never read.
11:35:01 AM: 10   ArrowDownToLine,
11:35:01 AM:      ~~~~~~~~~~~~~~~
11:35:01 AM: src/components/MeshAnalyticsCard.tsx:11:3 - error TS6133: 'Layers' is declared but its value is never read.
11:35:01 AM: 11   Layers,
11:35:01 AM:      ~~~~~~
11:35:01 AM: src/components/MeshAnalyticsCard.tsx:22:17 - error TS6133: 'setStats' is declared but its value is never read.
11:35:01 AM: 22   const [stats, setStats] = useState<MeshSwarmStats>(() => MeshRelayService.getSwarmStats());
11:35:01 AM:                    ~~~~~~~~
11:35:01 AM: src/components/TimeTravelScrubber.tsx:10:3 - error TS6133: 'Clock' is declared but its value is never read.
11:35:01 AM: 10   Clock,
11:35:01 AM:      ~~~~~
11:35:01 AM: src/components/TimeTravelScrubber.tsx:12:3 - error TS6133: 'Activity' is declared but its value is never read.
11:35:01 AM: 12   Activity,
11:35:01 AM:      ~~~~~~~~
11:35:01 AM: src/components/TimeTravelScrubber.tsx:13:3 - error TS6133: 'AlertTriangle' is declared but its value is never read.
11:35:01 AM: 13   AlertTriangle,
11:35:01 AM:      ~~~~~~~~~~~~~
11:35:01 AM: src/components/TimeTravelScrubber.tsx:14:3 - error TS6133: 'Compass' is declared but its value is never read.
11:35:01 AM: 14   Compass,
11:35:01 AM:      ~~~~~~~
11:35:01 AM: src/components/TimeTravelScrubber.tsx:15:3 - error TS6133: 'CheckCircle2' is declared but its value is never read.
11:35:01 AM: 15   CheckCircle2,
11:35:01 AM:      ~~~~~~~~~~~~
11:35:01 AM: src/utils/wasmBridge.ts:73:26 - error TS2339: Property 'instance' does not exist on type 'Instance'.
11:35:01 AM: 73         instance: result.instance,
11:35:01 AM:                             ~~~~~~~~
11:35:01 AM: src/utils/wasmBridge.ts:74:25 - error TS2339: Property 'instance' does not exist on type 'Instance'.
11:35:01 AM: 74         exports: result.instance.exports,
11:35:01 AM:                            ~~~~~~~~
11:35:02 AM: Found 22 errors.
11:35:02 AM: ​
11:35:02 AM: "build.command" failed                                        
11:35:02 AM: ────────────────────────────────────────────────────────────────
11:35:02 AM: ​
11:35:02 AM:   Error message
11:35:02 AM:   Command failed with exit code 2: npm run build (https://ntl.fyi/exit-code-2)
11:35:02 AM: ​
11:35:02 AM:   Error location
11:35:02 AM:   In build.command from netlify.toml:
11:35:02 AM:   npm run build
11:35:02 AM: ​
11:35:02 AM:   Resolved config
11:35:02 AM:   build:
11:35:02 AM:     command: npm run build
11:35:02 AM:     commandOrigin: config
11:35:02 AM:     environment:
11:35:02 AM:       - CODEPUSH_API_KEY
11:35:02 AM:       - VITE_ACCESS_TOKEN
11:35:02 AM:       - VITE_FIREBASE_API_KEY
11:35:02 AM:       - VITE_FIREBASE_APP_ID
11:35:02 AM:       - VITE_FIREBASE_AUTH_DOMAIN
11:35:02 AM:       - VITE_FIREBASE_DATABASE_URL
11:35:02 AM:       - VITE_FIREBASE_MESSAGING_SENDER_ID
11:35:02 AM:       - VITE_FIREBASE_PROJECT_ID
11:35:02 AM:       - VITE_FIREBASE_STORAGE_BUCKET
11:35:02 AM:       - VITE_REFRESH_TOKEN
11:35:02 AM:       - VITE_REFRESH_TOKEN_EXPIRY_DAYS
11:35:02 AM:       - VITE_REFRESH_TOKEN_EXPIRY_HOURS
11:35:02 AM:       - VITE_TOKEN_EXPIRY_DAYS
11:35:02 AM:       - VITE_TOKEN_EXPIRY_HOURS
11:35:02 AM:       - VITE_TOKEN_EXPIRY_MINUTES
11:35:02 AM:       - VITE_TOKEN_EXPIRY_SECONDS
11:35:02 AM:     publish: /opt/build/repo/dist
11:35:02 AM:     publishOrigin: config
11:35:02 AM:   functionsDirectory: /opt/build/repo/netlify/functions
11:35:02 AM:   redirects:
11:35:02 AM:     - from: /*
11:35:02 AM:       status: 200
11:35:02 AM:       to: /index.html
11:35:02 AM:   redirectsOrigin: config
11:35:02 AM: Build failed due to a user error: Build script returned non-zero exit code: 2
11:35:02 AM: Failing build: Failed to build site
11:35:02 AM: Finished processing build request in 17.713s