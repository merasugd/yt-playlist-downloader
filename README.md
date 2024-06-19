
# YouTube Playlist Downloader

A simple program to download YouTube playlists.

## Current Version
**v1.0.3**

older versions can be downloaded thru releases

## Updates
v1.0.1
- Proper conversions
- Metadata for mp3 and clean mp4

v1.0.2
- Managed files.
- Metadata for mp4
- ~~Video Thumbnails~~
- Clean after merge and conversion
- Proxy support for ytdl-core

## Note
- This program may be slow because it converts and edits the metadata of downloads using `ffmpeg`S
- The case listed from  here is only for v1.0.2 below
- ~~This program may be slow because it merges the audio and video downloads using `ffmpeg` and it also converts videos to their specified format.~~
- ~~The program splits downloads due to 'encoding errors,' videos without sound, or unplayable videos.~~

## Requires
- FFmpeg
- Node.js 20+

## Installation

1. Download the [repository](https://github.com/merasugd/yt-playlist-downloader/archive/refs/heads/main.zip) and extract it
2. Install the required dependencies by running:
```bash
  npm install
```
3. To start the program

- For Windows, run ```start.bat```
- For linux, run ```start.sh```
    
## Features

- **Audio Only Download**: Option to download only the audio from YouTube videos.
- **Multiple Playlists**: Supports downloading multiple playlists listed in `playlists.txt`.
- **YouTube Cookies**: Can use YouTube cookies stored in `cookies.txt` for downloading restricted content.
- **Simple Download**: Easy to use for downloading YouTube content.
- **Compression**: Option to compress downloads into a zip file or move them to a directory.
- ~~Split Download and Merging: Downloads audio and video separately and merges them into a single file using `ffmpeg`.~~


## Support

For support, create an issue on GitHub.


## 🔗 Links
[![youtube](https://img.shields.io/badge/youtube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/@merasu_gd)
[![facebook](https://img.shields.io/badge/facebook-0A66C2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/profile.php?id=61554338001508)

