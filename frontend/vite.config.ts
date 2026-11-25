import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function netlifyFunctionsPlugin(): Plugin {
  return {
    name: 'netlify-functions-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/.netlify/functions/')) {
          return next()
        }

        try {
          const parsedUrl = new URL(req.url, 'http://localhost')
          const functionName = parsedUrl.pathname.replace('/.netlify/functions/', '').split('/')[0]
          const functionPath = path.resolve(process.cwd(), `netlify/functions/${functionName}.cjs`)

          if (!fs.existsSync(functionPath)) {
            return next()
          }

          let bodyBuffer = ''
          if (typeof (req as any).body === 'string') {
            bodyBuffer = (req as any).body
          } else if (typeof (req as any).body === 'object' && (req as any).body !== null) {
            bodyBuffer = JSON.stringify((req as any).body)
          }

          const method = (req.method || 'GET').toUpperCase()
          const hasBody = method !== 'GET' && method !== 'HEAD' && (Boolean(req.headers['content-length']) || Boolean(req.headers['transfer-encoding']))

          const runHandler = async () => {
            try {
              const queryParams: Record<string, string> = {}
              parsedUrl.searchParams.forEach((val, key) => {
                queryParams[key] = val
              })

              const event = {
                httpMethod: req.method || 'GET',
                headers: req.headers,
                queryStringParameters: Object.keys(queryParams).length > 0 ? queryParams : null,
                body: bodyBuffer || null,
                path: parsedUrl.pathname,
              }

              // Load and execute the handler
              delete require.cache[require.resolve(functionPath)]
              const fn = require(functionPath)

              const result = await fn.handler(event, {})
              res.statusCode = result.statusCode || 200
              if (result.headers) {
                for (const [k, v] of Object.entries(result.headers)) {
                  res.setHeader(k, v as string)
                }
              }
              res.end(result.body || '')
            } catch (err: any) {
              console.error('[Netlify Dev Middleware Error]:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          }

          if (!hasBody || req.complete || (req as any).readableEnded) {
            runHandler()
          } else {
            let isHandled = false
            const safeRunHandler = () => {
              if (isHandled) return
              isHandled = true
              runHandler()
            }

            const timer = setTimeout(safeRunHandler, 1000)

            req.on('data', (chunk: any) => {
              bodyBuffer += chunk
            })
            req.on('end', () => {
              clearTimeout(timer)
              safeRunHandler()
            })
            req.on('error', () => {
              clearTimeout(timer)
              safeRunHandler()
            })
            req.resume()
          }
        } catch (err: any) {
          console.error('[Netlify Dev Middleware Fatal Error]:', err)
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  envDir: '..',
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      clientPort: 5173,
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  plugins: [react(), tailwindcss(), netlifyFunctionsPlugin()],
})

