const rd = require('rd');
const FfmpegCommand = require('fluent-ffmpeg');

const config = require('./config.js');

const FFInstance = new FfmpegCommand();

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	host: 'smtp.qq.com',
	secureConnection: true,
	port: 465,
	auth: {
		user: config.user,
		pass: config.pass
	}
});

let allFile = [];

function sendEmail(options, cb) {
	const mailOptions = {
		from: '842891024@qq.com',
		to: 'luoyefe@gmail.com',
		subject: 'FFMPEG-RMTP',
		html: `
<span>当前播放文件：</span><code>${options.file}</code><br/>
<pre><code>${options.detail}</code></pre>
`
	};
	transporter.sendMail(mailOptions, function(error, info) {
		cb();
	});
}

function sendErrorEmail(options, cb) {
	const mailOptions = {
		from: '842891024@qq.com',
		to: 'luoyefe@gmail.com',
		subject: 'FFMPEG-RMTP-ERROR',
		html: `
<span>当前播放出错文件：</span><code>${options.file}</code><br/>
<pre><code>${options.detail}</code></pre>
`
	};
	transporter.sendMail(mailOptions, function(error, info) {
		cb();
	});
}

function run() {
	rd.readFileFilter(config.root, /\.(mp4|avi|wmv|mpeg|ogg|rmvb)$/i, (err, files) => {
		allFile = files;

		function poll() {
			let file = allFile[0];
			if (!file) return run();
			FFInstance
				.input(file)
				.outputOptions('-vcodec copy')
				.outputOptions('-acodec copy')
				.format('flv')
				.save(config.rtmp)
				.on('error', function(e) {
					sendErrorEmail({
						file: file,
						detail: e
					})
				})
				.on('end', function() {
					allFile.splice(0, 1);
					poll();
				})
				.ffprobe(function(err, data) {
					sendEmail({
						file: file,
						detail: JSON.stringify(data, null, 4)
					})
				})
		}
		poll();
	})
}

run();
