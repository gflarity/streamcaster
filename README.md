# Quick Start

1. Install Deno
## Streamcaster

```bash
cd static
curl -O  http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
cd ..
deno run --allow-net --allow-read streamcaster.ts
```
## Thumbnailer
```bash
brew install ffmpeg imagemagick
deno run --unstable --allow-run --allow-read --allow-write thumbnailer.ts ../static/video
```

