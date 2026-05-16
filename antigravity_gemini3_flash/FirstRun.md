First run
1. README not complete with instructions to run
2. Startup had error that needed to be resolved
[0] D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\path-to-regexp\dist\index.js:108
[0]                     throw new PathError(`Missing parameter name at index ${index}`, str);
[0]                     ^
[0]
[0] PathError [TypeError]: Missing parameter name at index 7: /:path*; visit https://git.new/pathToRegexpError for info
[0]     at consumeUntil (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\path-to-regexp\dist\index.js:108:27)
[0]     at parse (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\path-to-regexp\dist\index.js:140:26)
[0]     at process (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\path-to-regexp\dist\index.js:263:56)
[0]     at pathToRegexp (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\path-to-regexp\dist\index.js:274:5)
[0]     at Object.match (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\path-to-regexp\dist\index.js:225:30)
[0]     at matcher (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\router\lib\layer.js:86:23)
[0]     at new Layer (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\router\lib\layer.js:93:62)
[0]     at router.route (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\router\index.js:428:17)
[0]     at app.route (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\express\lib\application.js:257:22)
[0]     at app.<computed> [as get] (D:\retrospective-board-eval\antigravity_gemini3_flash\server\node_modules\express\lib\application.js:478:22) {
[0]   originalPath: '/:path*'
3. The homepage at startup didn't show any content that needed to be resolved

4. Docker run failed due to incompatible sqlite3 and node:20-slim versions 
/app/server/node_modules/bindings/bindings.js:121
        throw e;
        ^

Error: /lib/x86_64-linux-gnu/libm.so.6: version `GLIBC_2.38' not found (required by /app/server/node_modules/sqlite3/build/Release/node_sqlite3.node)
    at Module._extensions..node (node:internal/modules/cjs/loader:1661:18)
    at Module.load (node:internal/modules/cjs/loader:1266:32)
    at Module._load (node:internal/modules/cjs/loader:1091:12)
    at Module.require (node:internal/modules/cjs/loader:1289:19)
    at require (node:internal/modules/helpers:182:18)
    at bindings (/app/server/node_modules/bindings/bindings.js:112:48)
    at Object.<anonymous> (/app/server/node_modules/sqlite3/lib/sqlite3-binding.js:1:37)
    at Module._compile (node:internal/modules/cjs/loader:1521:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1623:10)
    at Module.load (node:internal/modules/cjs/loader:1266:32) {
  code: 'ERR_DLOPEN_FAILED'
}

