const rd = require('rd');
const FfmpegCommand = require('fluent-ffmpeg');

const config = require('./config.js');

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
		if (error) throw error;
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
		if (error) throw error;
		cb();
	});
}

function run() {
	console.log('run', new Date(Date.now() + 1000*60*60*8));
	rd.readFileFilter(config.root, /\.(mp4|avi|wmv|mpeg|ogg|rmvb)$/i, (err, files) => {
		allFile = files;
		allFile.sort(function(){ return 0.5 - Math.random() });

		function poll() {
			let file = allFile[0];
			if (!file) return run();
			let FFInstance = new FfmpegCommand();
			console.log('开始播放： ' + file);
			FFInstance
				.input(file)
				.inputOptions('-re')
				.outputOptions('-vcodec copy')
				.outputOptions('-acodec copy')
				.format('flv')
				.on('start', () => {
					FFInstance.ffprobe(file, function(err, data) {
					   	sendEmail({
					   		file: file,
					   		detail: JSON.stringify(data, null, 4)
					   	})
					});
				})
				.on('progress', function(progress) {
					console.log('Processing: ' + progress.percent + '% done');
				})
				.on('error', function(e) {
					sendErrorEmail({
						file: file,
						detail: e
					})
					throw e;
				})
				.on('end', function() {
					allFile.splice(0, 1);
					FFInstance.kill();
					setTimeout(() => {
						poll()
					}, 0);
				})
				.save(config.rtmp)
		}
		poll();
	})
}

run();
