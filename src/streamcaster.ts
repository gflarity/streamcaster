import { Application, Router } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router()
router.get('/', async ctx => {
    ctx.response.body = await Deno.readTextFile('../static/index.html')
    ctx.response.type = 'html'
})
router.get('/video', async ctx => {
    ctx.response.headers.set("Content-Type", 'video/mp4')

    // this tells video players that they can jump around
    ctx.response.headers.set("Accept-Ranges", "bytes")
    ctx.response.body = await Deno.readFile('../static/BigBuckBunny.mp4')
})

app.use(async (ctx, next) => {
    await next();
})

app.use(router.routes())
console.log('http://localhost:3000')
await app.listen({ port: 3000 });

