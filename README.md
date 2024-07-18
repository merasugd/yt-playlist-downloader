
# YouTube Playlist Downloader

A simple program to download YouTube playlists.

## Current Version
**v1.1.1-pre**

older versions can be downloaded thru releases

## Note
- The internet check might contribute to slowness. (it depends on your net, you can turn it off in the config).
- This program may be slow because it merges the audio and video downloads using `ffmpeg` and it also converts downloads to their specified format and edits the metadata of downloads using `ffmpeg`.
- The program can split downloads as an option on the config due to 'encoding errors,' videos without sound, unplayable videos, or because single-download quality is sh#t.

## Requires
- [FFmpeg](https://ffmpeg.org/)
- [Node.js 20+](https://nodejs.org/en)

## Installation

- Download the [repository](https://github.com/merasugd/yt-playlist-downloader/archive/refs/heads/main.zip) and extract it
- Install the required dependencies:
  - For Windows, run ```install.bat```
  - For Linux, run ```install.sh```
- To start the program
  - For Windows, run ```start.bat```
  - For Linux, run ```start.sh```
    
## Features

- **Audio Only Download**: Option to download only the audio from YouTube videos.
- **Multiple Playlists**: Supports downloading multiple playlists listed in `settings/download.json`.
- **YouTube Cookies**: Can use your own YouTube cookies stored in `settings/download.json` for downloading restricted content.
- **Simple Download**: Easy to use for downloading YouTube content.
- **Compression**: Option to compress downloads into a zip file or move them to a directory.
- **Split Download and Merging**: Downloads audio and video separately and merges them into a single file using `ffmpeg`.
- **Multi-Format**: Supports formats like `flac`, `ogg` and more.

## Supported Formats
#### Audio
- mp3 (MPEG Audio Layer 3)
- ogg (Ogg Vorbis)
- wav (Waveform Audio File Format)
- m4a (MPEG-4 Audio)
- flac (Free Lossless Audio Codec)
#### Video
- mp4 (MPEG-4 Part 14)
- mkv (Matroska Video)
- flv (Flash Video)
- avi (Audio Video Interleave)
- mov (QuickTime/MOV)

## Downloaders
- `split-v1`: Split Downloader V1
  - It uses purely ytdl-core and splits downloads to audio and video then merges it.

- `single-v1`: Single Downloader V1
  - It uses purely ytdl-core and downloads videos with attached audio to it. It doesnt need merging but sometimes the quality is sh#t.

- `split-v2`: Split Downloader V2
  - It uses fetch to gather sources, the difference between split v1 and v2 is v2 uses its own downloader [easydl]() and its incredibly fast.

- `single-v2`: Single Downloader V2
  - It uses ytdl-core to gather cources, single v2 also uses [easydl](https://www.npmjs.com/package/easydl).

- `anime-downloader`: Special Anime Downloader
  - It uses a provider to gather sources, this is a special downloader because it will never get updated again but still be fixed.
  - It is basically an anime downloader.

## Support

For support, create an issue on GitHub.

## Releases
v1.0.1
- Proper conversions
- Metadata for mp3 and clean mp4

v1.0.2
- Managed files.
- Metadata for mp4
- ~~Video Thumbnails~~
- Clean after merge and conversion
- Proxy support for ytdl-core

v1.0.3
- made `playlists.txt` and `cookies.txt` in a one `settings.json`
- moved proxy server setting and youtube identity token setting to `settings.json`
- Cleaned some dirty code

v1.0.4
- Fixed an error regarding split-download.
- Added exceptions and settings for certain video.
- Added a check if you are connected to internet.

v1.0.5
- Made prompt a little cleaner.
- Fixed video-specific settings prompt.
- Added checking for video-specific settings.
- Added confirmation prompt before proceed prompt in the video-specific settings prompt.
- Made the project structure more cleaner.
- renamed bin to .cache

v1.0.6
- Added `safe_download`. If error has occurred or you close the program when not finished, You can continue downloading it when you run the program again. (Puts it in the `config.json` where it defaults to `true`.)
- Made the logging centered.
- You can now optionally put a youtube url that contains list in the query instead of playlist ID (Note: you can still put a playlist ID).
- Made the downloader fixed.
- Storage optimization for moving the files.

v1.0.7
- New split downloader V2. (`split_download` must be false and `split_download_v2` defaults to `true`) (Note: this is currently in beta and also because of the ytdl-core 403 error, I plan to use yt-dlp in the future)
- Added support for other formats. (flv/mkv/wav/ogg)
- Added video support.
- Cleaned the code a little.
- Added medium for quality. (only in `split_download_v2`)

v1.0.8
- Modified V2 Downloaders (Using ytdl-core to search formats)
- New Cookie System.
- Organized files.
- No more support for V1 downloaders. More focused on V2 and an upcoming V3 downloader.
- Added default output dir. (Means you can skip output dir or dont provide any)

v1.0.9
- Split V2 Downloaders now downloads both audio and video at the same time.
- Split V2 uses own info fetcher, while Single V2 uses ytdl-core.
- Fixes cache downloaded file extensions.

v1.1.0
- Special downloader ('anime-downloader')
- Added installer script.
- Rearranged README

## Pre-Releases
v1.0.3-pre
- Removed **Split Download and Merging**
- Converting remains
- Video thumbnails is now more stable (since better mp4)

v1.0.3-pre2
- Brings back **Split Download and Merging** as an option in the config (defaults to false)

v1.0.5-pre
- Made "internet checking" an option on `config.json` (defaults to: true)

v1.0.5-pre2
- Fixed something in `README.md`
- Made `split_download` defaults to true.
- Added version checking.

v1.0.6-pre
- Renamed `settings.json` to `download.json`.
- Moved `config.json` and `download.json` to `settings` directory.
- Prompt is cleaner.
- Fixed `version checking`.

v1.0.7-pre
- Added proper metadata to mp3 (option in `config.json` as `music_metadata` which defaults to false and needs `acrcloud host, api key and secret` in the `download.json`).
- Proper video thumbnails.
- Added song cover for mp3.
- `split_download` defaults to `false` again.
- Skips downloaded playlist if same output path.

v1.0.8-pre
- Made the downloader into one config (eg. `downloader: 'split-v2'`) [Types are: single-v1, split-v1 and split-v2]
- Added more formats. (m4a/flac/mov/avi)
- Added list prompt for quality and format.
- Fixed video specific settings.

v1.1.1-pre
- Removed 2 providers
- Better m3u8 downloader
- Fixed bugs

## 🔗 Links
[![facebook](https://img.shields.io/badge/facebook-0A66C2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/profile.php?id=61554338001508)

[![youtube](https://img.shields.io/badge/youtube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/@merasu_gd)