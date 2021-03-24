import { walk, WalkEntry, WalkOptions } from "https://deno.land/std@0.88.0/fs/mod.ts";

// hardcoded here for now
const FPS = 1;
const SCALED_WIDTH = 180;
const TILES_PER_ROW = 10;

 export interface FFProbeInfo {
    streams: Stream[];
    format:  Format;
}

export interface Format {
    filename:         string;
    nb_streams:       number;
    nb_programs:      number;
    format_name:      string;
    format_long_name: string;
    start_time:       string;
    duration:         string;
    size:             string;
    bit_rate:         string;
    probe_score:      number;
    tags:             FormatTags;
}

export interface FormatTags {
    major_brand:       string;
    minor_version:     string;
    compatible_brands: string;
    creation_time:     Date;
}

export interface Stream {
    index:                 number;
    codec_name:            string;
    codec_long_name:       string;
    profile:               string;
    codec_type:            'audio' | 'video';
    codec_time_base:       string;
    codec_tag_string:      string;
    codec_tag:             string;
    sample_fmt?:           string;
    sample_rate?:          string;
    channels?:             number;
    channel_layout?:       string;
    bits_per_sample?:      number;
    r_frame_rate:          string;
    avg_frame_rate:        string;
    time_base:             string;
    start_pts:             number;
    start_time:            string;
    duration_ts:           number;
    duration:              string;
    bit_rate:              string;
    max_bit_rate?:         string;
    nb_frames:             string;
    disposition:           { [key: string]: number };
    tags:                  StreamTags;
    width?:                number;
    height?:               number;
    coded_width?:          number;
    coded_height?:         number;
    closed_captions?:      number;
    has_b_frames?:         number;
    sample_aspect_ratio?:  string;
    display_aspect_ratio?: string;
    pix_fmt?:              string;
    level?:                number;
    chroma_location?:      string;
    refs?:                 number;
    is_avc?:               string;
    nal_length_size?:      string;
    bits_per_raw_sample?:  string;
}

export interface StreamTags {
    creation_time: Date;
    language:      string;
    handler_name:  string;
}

export class VideoInfo {
    ffprobeInfo: FFProbeInfo;
    public readonly height: number = 0
    public readonly width: number = 0 
    public readonly duration: number = 0

    constructor(ffprobeInfo: FFProbeInfo) {
        this.ffprobeInfo = ffprobeInfo
        this.duration = parseFloat(ffprobeInfo.format.duration)
        for (const stream of this.ffprobeInfo.streams) {
            if (stream.codec_type = 'video') {
                this.height = stream.height as number;
                this.width = stream.width as number;
            }
        }
    }
}

async function getVideoInfo(entry: WalkEntry) /*: Promise<VideoInfo>*/ {
    // get video info by calling ffprobe and parsing the json output
    const p = Deno.run({cmd: ["ffprobe", "-v", "quiet",  "-print_format", "json", "-show_format", "-show_streams", entry.path],  stdout: "piped"/*, stderr: "null"*/});
    const status = await p.status();
    const outputString = new TextDecoder().decode(await p.output());
    const ffprobeInfo = JSON.parse(outputString) as FFProbeInfo;
    const v: VideoInfo = new VideoInfo(ffprobeInfo)
    return v
}

async function generateThumbnails(entry: WalkEntry, videoInfo: VideoInfo, tempDir: string): Promise<string> {

    //ffmpeg -i BigBuckBunny.mp4 -vf fps=1,scale=320:-1  capture-%10d.pn
    const p = Deno.run({cmd: ["ffmpeg", "-i", entry.path, "-vf", `fps=${FPS},scale=${SCALED_WIDTH}:-1`, `${tempDir}/${entry.name}-%10d.png`], stderr: "null", stdout:"null"});
    const status = await p.status();

    // this is the mask of thumbnail files
    return `${tempDir}/${entry.name}-*.png`
}

async function createMontage(entry: WalkEntry, videoInfo: VideoInfo, thumbnailMask: string, tempDir: string): Promise<string> {

    const thumbnailsJPG = `${tempDir}/${entry.name}.thumbnails.jpg`
    let p = Deno.run({cmd: ["magick", "montage", "-geometry", "+0+0", "-tile",  `${TILES_PER_ROW}x`, thumbnailMask, thumbnailsJPG]})
    await p.status()

    return thumbnailsJPG
}

async function computeThumbnailOptions(entry: WalkEntry, videoInfo: VideoInfo, tempDir: string): Promise<string>  {
    const totalThumbnails = Math.floor(videoInfo.duration);
    const rows = Math.floor(totalThumbnails/TILES_PER_ROW);
    const scaledWidth = SCALED_WIDTH;
    const scaledHeight = Math.floor((SCALED_WIDTH/videoInfo.width)*videoInfo.height)
    console.log(`scaled width: ${scaledWidth} scaled height: ${scaledHeight} rows: ${rows}`)

    await new Promise((resolve, reject) => { resolve(123)})
    return ''
}

async function processVideo(entry: WalkEntry) {

    const tempDir = await Deno.makeTempDir()
    console.log("tempDir: " + tempDir)

    // get video info
    const videoInfo = await getVideoInfo(entry)    
    // run ffmpeg

    const thumbNailMask = await generateThumbnails(entry, videoInfo, tempDir)

    // get the settings needed for the video.js thumbnail plugin
    const thumbNailOptions = await computeThumbnailOptions(entry, videoInfo, tempDir)

    // run imagemagick montage
    const thumbnailsFile = await createMontage(entry, videoInfo, thumbNailMask, tempDir)
    console.log(thumbnailsFile)
    
    // clean up the tempDir
    //await Deno.remove(tempDir, {recursive: true})
 }


const root = Deno.args[0]


const walker = walk(root, { match: [new RegExp("(mp4|mkv|mov)$")] })
for await (const entry of walker) {
    // for now just skip directories
    if (!entry.isFile) {
        continue
    }

    const videoInfo = await processVideo(entry)

 }
