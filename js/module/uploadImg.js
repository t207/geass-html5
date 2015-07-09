
//define(['module/jpegMeta', 'module/imageCompresser', 'util'], function(JpegMeta, ImageCompresser, util) {
define(['jpegMeta', 'imageCompresser'], function(JpegMeta, ImageCompresser) {

    var exports = {
        maxUpload : 8,
        // 上传信息 主要是 id 对应信息
        uploadInfo: {},
        // 上传队列，里面保存的是 id
        uploadQueue: [],
        // 预览队列，里面保存的是 id
        previewQueue: [],
        // 请求对象
        xhr: {},
        // 是否有任务正在上传
        isBusy: false,
        countUpload: function() {

            var num = 0;
            jq.each(exports.uploadInfo, function(i, n) {
                if (n) {
                    ++ num;
                }
            });

            return num;
        },
        // 图片预览
        uploadPreview: function(id) {

            var reader = new FileReader();
            var uploadBase64;
            var conf = {}, file = exports.uploadInfo[id].file;

            // wifi 下图片高质量
            if (window.NETTYPE == window.NETTYPE_WIFI) {
                conf = {
                    maxW: 3000, //目标宽
                    maxH: 1280, //目标高
                    quality: 0.8, //目标jpg图片输出质量
                };
            }

            reader.onload = function(e) {
                var result = this.result;

                // 如果是jpg格式图片，读取图片拍摄方向,自动旋转
                if (file.type == 'image/jpeg'){
                    try {
                        var jpg = new JpegMeta.JpegFile(result, file.name);
                    } catch (e) {
                        jq.UTIL.dialog({content: '图片不是正确的图片数据',autoClose:true});

                        jq('#li' + id).remove();
                        return false;
                    }
                    if (jpg.tiff && jpg.tiff.Orientation) {
                        //设置旋转
                        conf = jq.extend(conf, {
                            orien: jpg.tiff.Orientation.value
                        });
                    }
                }

                // 压缩
                if (ImageCompresser.ImageCompresser.support()) {
                    var img = new Image();
                    img.onload = function() {
                        try {
                            uploadBase64 = ImageCompresser.ImageCompresser.getImageBase64(this, conf);
                        } catch (e) {
                            jq.UTIL.dialog({content: '压缩图片失败',autoClose:true});
                            jq('#li' + id).remove();
                            return false;
                        }
                        if (uploadBase64.indexOf('data:image') < 0) {
                            jq.UTIL.dialog({content: '上传照片格式不支持',autoClose:true});
                            jq('#li' + id).remove();
                            return false;
                        }

                        exports.uploadInfo[id].file = uploadBase64//ImageCompresser.dataURItoBlob(uploadBase64);
                        jq('#li' + id).find('img').attr('src', uploadBase64);
                        exports.uploadQueue.push(id);
                    }
                    img.onerror = function() {
                        jq.UTIL.dialog({content: '解析图片数据失败',autoClose:true});
                        jq('#li' + id).remove();
                        return false;
                    }
                    img.src = ImageCompresser.ImageCompresser.getFileObjectURL(file);
                } else {
                    uploadBase64 = result;
                    if (uploadBase64.indexOf('data:image') < 0) {
                        jq.UTIL.dialog({content: '上传照片格式不支持',autoClose:true});
                        jq('#li' + id).remove();
                        return false;
                    }

                    exports.uploadInfo[id].file = uploadBase64;
                    jq('#li' + id).find('img').attr('src', uploadBase64);
                    exports.uploadQueue.push(id);
                }
            }

            reader.readAsBinaryString(exports.uploadInfo[id].file);
        },

        // 创建上传请求
        createUpload: function(id, type, uploadTimer) {

            if (!exports.uploadInfo[id]) {
                return false;
            }

            var uploadUrl = 'http://upload.qiniu.com/putb64/-1/mimeType/aW1hZ2UvanBlZw==';
            // 产生进度条
            var progressHtml = '<div class="progress brSmall pr" id="progress'+id+'"><div class="proBar" style="width:0%;"></div></div>';
            jq('#li' + id).find('.maskLay').after(progressHtml);

            var progress = function(e) {
                if (e.target.response) {
                    var result = jq.parseJSON(e.target.response);
                    if (!('key' in result)) {
                        jq.UTIL.dialog({content:'网络不稳定，请稍后重新操作',autoClose:true});
                        removePic(id);
                        //更新剩余上传数
                        exports.uploadRemaining();
                        return false;
                    }
                }

                var progress = jq('#progress' + id).find('.proBar');
                if (e.total == e.loaded) {
                    var percent = 100;
                } else {
                    var percent = 100*(e.loaded / e.total);
                }
                // 控制进度条不要超出
                if (percent > 100) {
                    percent = 100;
                }
                //progress.css('width', percent + '%');
                progress.animate({'width': '95%'}, 1500);
                setTimeout(function(){
                    if (percent == 100) {
                        /*jq('#li' + id).find('.maskLay').remove();
                        jq('#li' + id).find('.progress').remove();*/
                        donePic(id);
                        if(uploadTimer){
                            clearInterval(uploadTimer);
                        }
                    }
                }, 400);

            }

            var removePic = function(id) {
                donePic(id);
                jq('#li' + id).remove();
            }

            var donePic = function(id) {
                exports.isBusy = false;

                if (typeof exports.uploadInfo[id] != 'undefined') {
                    exports.uploadInfo[id].isDone = true;
                }
                if (typeof exports.xhr[id] != 'undefined') {
                    exports.xhr[id] = null;
                }
            }

            var complete = function(e) {
                var progress = jq('#progress' + id).find('.proBar');
                progress.css('width', '100%');
                jq('#li' + id).find('.maskLay').remove();
                jq('#li' + id).find('.progress').remove();
                // 上传结束
                donePic(id);

                var result = jq.parseJSON(e.target.response);
                if ('key' in result) {
                    //var input = '<input type="hidden" id="input' + result.data.id + '" name="picIds[]" value="' + result.data.picId + '">';
                    var input = '<input type="hidden" name="pickeys" value="' + result.hash + '">';
                    if(type == 'replyForm'){
                        jq('#replyForm').append(input);
                    }else{
                        jq('#newthread').append(input);
                    }

                } else {
                    jq.UTIL.dialog({content:'网络不稳定，请稍后重新操作',autoClose:true});
                    removePic(id);
                    //更新剩余上传数
                    exports.uploadRemaining();
                    delete exports.uploadInfo[id];
                    // 如果传略失败，上传个数少于8张则再显示加号
                    if (exports.countUpload() < exports.maxUpload) {
                        var iconSendImg = jq('.iconSendImg');
                        jq('#addPic').show();
                        if(iconSendImg.hasClass('fail')){
                            iconSendImg.removeClass('fail');
                        }
                    }
                }
            }

            var failed = function() {
                jq.UTIL.dialog({content:'网络断开，请稍后重新操作',autoClose:true});
                removePic(id)
            }

            var abort = function() {
                jq.UTIL.dialog({content:'上传已取消',autoClose:true});
                removePic(id)
            }

            var startUpload = function(e) {

                //exports.xhr[id] = new XMLHttpRequest();
                exports.xhr[id] = jq.UTIL.createCORSRequest("POST", uploadUrl)
                exports.xhr[id].setRequestHeader("Authorization", 'UpToken '+jq.parseJSON(e.target.response).token);
                //exports.xhr[id].setRequestHeader("Content-Type", "application/octet-stream");

                exports.xhr[id].addEventListener("progress", progress, false);
                exports.xhr[id].upload.addEventListener("progress", progress, false);
                exports.xhr[id].addEventListener("load", complete, false);
                exports.xhr[id].addEventListener("abort", abort, false);
                exports.xhr[id].addEventListener("error", failed, false);
                //exports.xhr[id].open("POST", uploadUrl);
                exports.xhr[id].withCredentials = false;
                exports.xhr[id].send(exports.uploadInfo[id].file.split(';base64,')[1]);

            }

            var upTokenUrl = '/img/uptoken'

            //var xhrToken = new XMLHttpRequest();
            var xhrToken = jq.UTIL.createCORSRequest("GET", upTokenUrl);
            xhrToken.addEventListener("load", startUpload, false);
            xhrToken.addEventListener("abort", abort, false);
            xhrToken.addEventListener("error", failed, false);
            //xhrToken.open("GET", upTokenUrl);
            xhrToken.send();

        },

        // 不能上传系统提示
        checkUploadBySysVer: function() {
            if (jq.os.android) {
                /*
                 *  安卓不再判断系统提示不能传图 2014-11-04 17:38
                var MQQBrowser = navigator.userAgent.match(/MQQBrowser\/([^\s]+)/);
                if (!MQQBrowser || MQQBrowser && MQQBrowser[1] < '5.2') {
                    if (jQuery.os.version.toString().indexOf('4.4') === 0 || jQuery.os.version.toString() <= '2.1') {
                        jq.UTIL.dialog({'content':'您的手机系统暂不支持传图', 'autoClose':true});
                        return false;
                    }
                }
                */
            } else if (jq.os.ios && jq.os.version.toString() < '6.0') {
                jq.UTIL.dialog({'content':'手机系统不支持传图，请升级到ios6.0以上', 'autoClose':true});
                return false;
            }

            if (jq.os.wx && jq.os.wxVersion.toString() < '5.2') {
                jq.UTIL.dialog({'content':'当前微信版本不支持传图，请升级到最新版', 'autoClose':true});
                return false;
            }
            return true;
        },
        //剩余上传数
        uploadRemaining: function(){
            var uploadNum = 0;
            uploadNum = jq('.photoList').find('li').length;
            /*if(!jq('#addPic').is(':hidden')){
                uploadNum--
            }*/
            var canOnlyUploadNum = 8;
            switch(uploadNum){
                case 1:
                  canOnlyUploadNum = 8;
                  break;
                case 2:
                  canOnlyUploadNum = 7;
                  break;
                case 3:
                  canOnlyUploadNum = 6;
                  break;
                case 4:
                  canOnlyUploadNum = 5;
                  break;
                case 5:
                  canOnlyUploadNum = 4;
                  break;
                case 6:
                  canOnlyUploadNum = 3;
                  break;
                case 7:
                  canOnlyUploadNum = 2;
                  break;
                case 8:
                  canOnlyUploadNum = 1;
                  break;
                case 9:
                  canOnlyUploadNum = 0;
                  break;
                default:
                  canOnlyUploadNum = 8;
                  break;
            }
            //更新剩余可上传图片数
            jq('#onlyUploadNum').html(canOnlyUploadNum);
        },

        // 检查图片大小
        checkPicSize: function(file) {
            // 8M
            if (file.size > 10000000) {
                return false;
            }

            return true;
        },
        // 检查图片类型
        checkPicType: function(file) {

            var photoReg = (/\.png$|\.bmp$|\.jpg$|\.jpeg$|\.gif$/i);
            if(!photoReg.test(file.name)){
               return false;
            }else{
                return true;
            }

        }
    };

    return exports
});
