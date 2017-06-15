const rd = require('rd');
const FfmpegCommand = require('fluent-ffmpeg');
const fetch = require('node-fetch');
const FormData = require('form-data');

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
	console.log('run', new Date(Date.now() + 1000 * 60 * 60 * 8));
	rd.readFileFilter(config.root, /\.(mp4|avi|wmv|mpeg|ogg|rmvb)$/i, (err, files) => {
		if (files.length === 0) return console.log('no file');
		allFile = files;
		allFile.sort(function() {
			return 0.5 - Math.random()
		});

		function poll() {
			let file = allFile[0];
			if (!file) return run();
			const FFInstance = new FfmpegCommand();
			const form = new FormData();
			console.log('开始播放： ' + file);
			form.append('tags', '');
			form.append('title', '24小时无人值守视频播放');
			form.append('description', '<div style="font-size: 22px;">当前播放文件：</div><br><b style="font-size: 32px;">' + file.match(/[\s\S]+\/([\s\S]+)/)[1] + '</b>');
			form.append('roomid', 4522075);
			form.append('area', 33);
			fetch('http://api.live.bilibili.com/liveact/edit_room', {
				method: 'POST',
				body: form,
				headers: {
					Cookie: 'finger=14bc3c4e; fts=1496798511; UM_distinctid=15c8024fcab58c-098d19e2bc2b29-30627509-fa000-15c8024fcae14f; sid=bw2l0ylg; buvid3=A8E70BED-515F-49DA-96B8-1229602E4FB610269infoc; rpdid=iwxosiwkiidoplxmlqsqw; pgv_pvi=2033110016; pgv_si=s8454952960; LIVE_BUVID=47ac2d88361d539d3b445328c9f3d6cc; LIVE_BUVID__ckMd5=8fa16deae8ec6e1a; DedeUserID=14046215; DedeUserID__ckMd5=190fa6bbfbfead37; SESSDATA=38efad8f%2C1499594885%2C386799bf; bili_jct=b748a21152682e825925810dadad217b; BeginnerGuide=3; IESESSION=alive; tencentSig=596484096; LIVE_LOGIN_DATA=c4b2f149a7acb985c1b534ce95614af74d09f66b; LIVE_LOGIN_DATA__ckMd5=57a863300a13d720; _cnt_pm=0; _cnt_notify=0; _qddaz=QD.3bvaxs.6o8o0h.j3ppdb8g; _qddab=3-8cpnra.j3tn5j8z; user_face=http%3A%2F%2Fi0.hdslb.com%2Fbfs%2Fface%2F6a6b4376e2ed4f83bebb8d46e7c4b8cad4ef22ff.jpg; area_v2=21; _dfcaptcha=ad784937785eace2826969b6e03d54e8; Hm_lvt_8a6e55dbd2870f0f5bc9194cddf32a02=1497010711,1497044057,1497045736,1497241872; Hm_lpvt_8a6e55dbd2870f0f5bc9194cddf32a02=1497252570'
				}
			})

			const log = throttle(function(progress) {
				console.log(progress.timemark, (progress.percent).toFixed(2) + '%');
			}, 2000);

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
					log(progress);
				})
				.on('error', function(e) {
					sendErrorEmail({
						file: file,
						detail: e
					}, () => {
						throw e;
					})
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

function throttle(func, wait) { // 节流，wait 时间内只执行一次
	let timeout;
	let elapsed;
	let lastRunTime = Date.now(); // 上次运行时间
	return function() {
		const _this = this;
		const args = arguments;

		clearTimeout(timeout);

		elapsed = Date.now() - lastRunTime;

		function later() {
			lastRunTime = Date.now();
			timeout = null;
			func.apply(_this, args);
		};

		if (elapsed > wait) {
			later();
		} else {
			timeout = setTimeout(later, wait - elapsed); // 延迟差值执行回调
		}
	};
}
