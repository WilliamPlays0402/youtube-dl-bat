const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const audio = require('fluent-ffmpeg/lib/options/audio');

// const folderpath = 'c:/Users/pelto/Desktop/youtube-downloader/'

async function prompt(text) {
  return new Promise((resolve, reject) => {
    process.stdout.write(text);
    process.stdin.resume();
    process.stdin.once('data', data => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

let previousDownloaded = [];
let eta = 0;

async function progresshandler(chunkLength, downloaded, total) {
  const percent = downloaded / total;
  const barLength = 30;
  const bar = '█'.repeat(Math.round(percent * barLength));
  const empty = '░'.repeat(barLength - bar.length);
  const downloadedM = (downloaded / 1024 / 1024).toFixed(2);
  const totalM = (total / 1024 / 1024).toFixed(2);
  const percentDisplay = (percent * 100).toFixed(2);
  const downloadedDisplay = `${Math.round(downloadedM)}MB/${Math.round(totalM)}MB`;
  previousDownloaded.unshift(downloaded / 1024 / 1024);
  if (previousDownloaded.length > 10) {
    previousDownloaded.pop();
  }
  // calculate eta
  const averageDownloaded = previousDownloaded.reduce((a, b) => a + b, 0) / previousDownloaded.length;
  eta = Math.round((totalM - averageDownloaded) / (averageDownloaded / previousDownloaded.length));
  process.stdout.write(`\r[${bar}${empty}] ${Math.round(percent * 100)}% ${downloadedDisplay} ${eta}s left`.padEnd(100, ' ') + '\r');
}

async function merge(folderpath, vidpath, audpath, videoName) {
  // use ffmpeg to merge the video and audio
  ffmpeg()
    .addInput(vidpath)
    .addInput(audpath)
    .addOptions([ '-c:v copy', '-c:a aac', '-b:a 192k' ])
    .format('mp4')
    .on('error', (err) => {
      console.log('An error occurred: ' + err.message);
    })
    .on('progress', (progress) => {
      process.stdout.write(`\rProcessing: ${Math.round(progress.percent*10)/10}% done`);
    })
    .on('end', () => {
      console.log('\nProcessing finished !');
      // delete temp files
      fs.unlinkSync(vidpath);
      fs.unlinkSync(audpath);
    })
    .saveToFile(path.join(folderpath, `${videoName}.mp4`))
}


async function main() {
  const folderpath = process.argv[2] || await prompt('Enter a folder path: ');
  const url = await prompt('Enter a YouTube video URL: ');
  const info = await ytdl.getInfo(url);
  console.log(`Title: ${info.videoDetails.title}`);
  console.log(`Author: ${info.videoDetails.author.name}`);
  console.log(`Length: ${info.videoDetails.lengthSeconds}s`);
  const download = await prompt('Download Audio, Video or both?: (a/v/b) ');
  let videoQualities = new Set(info.formats.filter(format => format.container === 'mp4').map(format => format.qualityLabel).filter(qualityString => qualityString !== 'unknown' || qualityString !== ''));
  const wantedQuality = await prompt(`Enter a quality (${Array.from(videoQualities).join(', ')}): `);
  let chosenVidQuality;
  videoQualities = Array.from(videoQualities);
  if (download === 'v' || download === 'b') {
    if (info.formats.some(format => format.qualityLabel === wantedQuality && format.container === 'mp4')) {
      chosenVidQuality = info.formats.find(format => format.qualityLabel === wantedQuality && format.container === 'mp4');
    } else {
      // try to find the next best quality
      const index = videoQualities.indexOf(wantedQuality);
      console.log(wantedQuality + ' mp4 not available, trying to download ' + videoQualities[index + 1] + ' mp4')
      for (let i = index + 1; i < videoQualities.length; i++) {
        if (info.formats.some(format => format.qualityLabel === videoQualities[i] && format.container === 'mp4')) {
          chosenVidQuality = info.formats.find(format => format.qualityLabel === videoQualities[i] && format.container === 'mp4');
          console.log(wantedQuality + ' mp4 not available, downloading ' + videoQualities[i] + ' mp4');
          break;
        }
      }
    }
    if (!chosenVidQuality) {
      console.log('No video available for this quality, downloading the lowest quality video');
      chosenVidQuality = 'lowestvideo'
    }
  }
  // try to find a similar quality audio (if you choose 1080p video, you want 192kbps audio, if you choose less, you want less audio quality)
  let chosenAudQuality;
  let audioQualities = new Set(info.formats.filter(format => format.container === 'mp4').map(format => format.audioBitrate).filter(qualityString => qualityString !== 'unknown' || qualityString !== ''));
  audioQualities = Array.from(audioQualities);
  const audioBitrates = [192, 128, 96, 70, 50, 36];
  if (download === 'a' || download === 'b') {
    const index = videoQualities.indexOf(wantedQuality);
    for (let i = index; i < audioBitrates.length; i++) {
      if (info.formats.some(format => format.audioBitrate === audioBitrates[i] && format.container === 'mp4')) {
        chosenAudQuality = info.formats.find(format => format.audioBitrate === audioBitrates[i] && format.container === 'mp4');
        break;
      } else {
        console.log(audioBitrates[i] + ' mp4 audio not available, trying to download ' + audioBitrates[i + 1] + ' mp4 audio')
      }
    }
    if (!chosenAudQuality) {
      console.log('No audio available for this quality, downloading the lowest quality audio');
      chosenAudQuality = 'lowestaudio'
    }
  }
  let downloadAudio;
  let downloadVideo;
  // download the highest quality video and audio into a single file, save it on desktop as the video title
  const videoName = info.videoDetails.title.replace(/[^\w\s]/gi, '');//.replace(/ /g, '_');
  if (download === 'v' || download === 'b') {
    downloadVideo = ytdl(url, { quality: chosenVidQuality.itag, format: 'mp4', filter: 'videoonly' })
    const vidpath = path.join(folderpath, `${videoName}-vid.mp4`)
    const videoOutput = fs.createWriteStream(vidpath);
    downloadVideo.pipe(videoOutput);
    downloadVideo.on('progress', progresshandler);
  }
  // folder: c:/Users/pelto/Desktop/youtube-downloader/${videoName}.mp4
  if (download === 'a' || download === 'b') {
    downloadAudio = ytdl(url, { quality: chosenAudQuality.itag, format: 'mp4', filter: 'audioonly' })
    const audpath = path.join(folderpath, `${videoName}-aud.mp3`)
    const audioOutput = fs.createWriteStream(audpath);
    downloadAudio.pipe(audioOutput);
    if (download === 'a') {
      downloadAudio.on('progress', progresshandler);
    }
  }

  // when both video and audio are downloaded, merge them into a single file
  let videoDownloaded = false;
  let audioDownloaded = false;
  if (download === 'b' || download === 'v') {
    downloadVideo.on('end', () => {
      videoDownloaded = true;
      console.log('video downloaded');
      if (download === 'v') {
        console.log('Finished video download!');
        process.exit(0);
      }
      if (audioDownloaded) {
        console.log('merging');
        merge(folderpath, vidpath, audpath, videoName);
      } else {
        console.log('waiting for audio');
        downloadAudio.on('progress', progresshandler)
      }
    });
  }
  if (download === 'b' || download === 'a') {
    downloadAudio.on('end', () => {
      audioDownloaded = true;
      console.log('audio downloaded');
      if (download === 'a') {
        console.log('Finished audio download!');
        process.exit(0);
      }
      if (videoDownloaded) {
        console.log('merging');
        merge(folderpath, vidpath, audpath, videoName);
      }
    });
  }

}

main().catch(console.error);
