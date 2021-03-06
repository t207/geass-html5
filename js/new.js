/**
 * @filename main
 * @description
 * 作者: xuguangzhou
 * 创建时间: 2015-03-24 20:01:03
 **/

require.config({

    waitSeconds: 15,
    urlArgs: "t=" + (new Date()).getTime(),

    paths: {

        "jquery": "vendor/jquery-1.11.2.min",
        "jqueryForm": "vendor/jquery.form.min",
        "util": "module/util",

        "jpegMeta": "module/jpegMeta",
        "JPEGEncoder": "module/JPEGEncoder",
        "imageCompresser": "module/imageCompresser",
        "uploadImg": "module/uploadImg",

    }

});

require(['uploadImg', 'util'],function (uploadImg, util){

    jq.UTIL.dialog({content:navigator.userAgent.toLowerCase(),autoClose:true});

    var exports = {

        contentHeight: 0,
        uploadTimer: null,

        // 上传相关
        initUpload: function() {
            // 上传图片的绑定
            // jq('#addPic').on('click', function() {
                // console.log(1);
            // });
            jq('#addPic').on('click', function() {
                if(!uploadImg.checkUploadBySysVer()){
                    return false;
                }
            });

            jq('#uploadFile, #fistUploadFile').on('click', function() {
                var thisObj = jq(this);
                if(jq('.photoList').find('#livideo').length > 0){
                    jq.UTIL.dialog({id: 'addWsTips', content: '图片和微视只能发一种哦~', autoClose: 2000});
                    return false;
                }
                if (uploadImg.isBusy) {
                    jq.UTIL.dialog({content:'上传中，请稍后添加', autoClose:true});
                    return false;
                }
                if(thisObj.attr('id') == 'fistUploadFile'){
                    if(jq('.iconSendImg').hasClass('fail')){
                        jq.UTIL.dialog({content:'不能再上传了，最多只能上传8张图片哦~', autoClose:true});
                        return false;
                    }
                }
            });

            jq('body').on('click', '.iconSendImg, .iconArrowR', function(e){
                var thisObj = jq(this);
                var photoList = jq('.photoList');
                //点击图片图标
                if(thisObj.hasClass('iconSendImg')){
                    if(photoList.is(':hidden')){
                        //jq('.sendCon').animate({height: '60'}, 300);
                        jq('.sendCon').css('height', '60');
                        photoList.show();
                    }
                }
                //查看更多表情
                if(thisObj.hasClass('iconArrowR')){
                    var expressionMenu = jq('.expressionMenu').find('a');
                    var haveMenuWidth = expressionMenu.length*76;
                    var expressionTabWidth = jq('.expressionTab').width();
                    if(haveMenuWidth > expressionTabWidth){
                        var firstChild = jq(expressionMenu[0]);
                        jq('.expressionMenu').append(firstChild.clone());
                        firstChild.remove();
                    }else{
                        jq.UTIL.dialog({id:'haveMoreExpression', content:'没有更多表情了哦~',autoClose:true});
                    }
                }

            });
            //首次点击图片的图标，触发一次手机的默认上传事件
            jq('body').on('change', '#fistUploadFile', function(e){
                var content = jq('#content')[0];
                jq('.photoList').show();
                jq('.operatList').hide();
                jq('.photoTipsBox').show();
                jq('.operatIcon').removeClass('on');
                jq('.iconSendImg').addClass('on');
                //jq('.sendCon').css('height', 'auto');
                if(jq('.sendCon').height() != 60){
                    //jq('.sendCon').animate({height: '60'}, 300);
                    jq('.sendCon').css('height', '60');

                }
                //传图时输入框定位到底部
                content.scrollTop = content.scrollHeight
            });

            // 文件表单发生变化时
            jq('body').on('change', '#uploadFile, #fistUploadFile', function(e) {
                //执行图片预览、压缩定时器
                uploadTimer = setInterval(function() {
                    // 预览
                    setTimeout(function() {
                        if (uploadImg.previewQueue.length) {
                            var jobId = uploadImg.previewQueue.shift();
                            uploadImg.uploadPreview(jobId);
                        }
                    }, 1);
                    // 上传
                    setTimeout(function() {
                        if (!uploadImg.isBusy && uploadImg.uploadQueue.length) {
                            var jobId = uploadImg.uploadQueue.shift();
                            uploadImg.isBusy = true;
                            uploadImg.createUpload(jobId, 'newthread', uploadTimer);
                        }
                    }, 10);
                }, 300);

                e = e || window.event;
                var fileList = e.target.files;
                if (!fileList.length) {
                    return false;
                }

                for (var i = 0; i<fileList.length; i++) {
                    if (uploadImg.countUpload() >= uploadImg.maxUpload) {
                        jq.UTIL.dialog({content:'你最多只能上传8张照片',autoClose:true});
                        break;
                    }

                    var file = fileList[i];

                    if (!uploadImg.checkPicType(file)) {
                        jq.UTIL.dialog({content: '上传照片格式不支持',autoClose:true});
                        continue;
                    }
                    // console.log(file);
                    if (!uploadImg.checkPicSize(file)) {
                        jq.UTIL.dialog({content: '图片体积过大', autoClose:true});
                        continue;
                    }

                    var id = Date.now() + i;
                    // 增加到上传对象中, 上传完成后，修改为 true
                    uploadImg.uploadInfo[id] = {
                        file: file,
                        isDone: false,
                    };

                    var html = '<li id="li' + id + '"><div class="photoCut"><img src="http://dzqun.gtimg.cn/quan/images/defaultImg.png" class="attchImg" alt="photo"></div>' +
                            '<div class="maskLay"></div>' +
                            '<a href="javascript:;" class="cBtn cBtnOn pa db" title="" _id="'+id+'">关闭</a></li>';
                    jq('#addPic').before(html);

                    uploadImg.previewQueue.push(id);

                    // 图片已经上传了 8 张，隐藏 + 号
                    if (uploadImg.countUpload() >= uploadImg.maxUpload) {
                        jq('#addPic').hide();
                        jq('.iconSendImg').addClass('fail');
                    }
                    //更新剩余上传数
                    setTimeout(function(){
                        uploadImg.uploadRemaining();
                    }, 400);

                }

                // 把输入框清空
                jq(this).val('');
            });

            jq('.photoList').on('click', '.cBtn', function() {
                // var result = confirm('取消上传这张图片?');
                // if (!result) {
                    // return false;
                // }
                var id = jq(this).attr('_id');
                // 取消这个请求
                if (uploadImg.xhr[id]) {
                    uploadImg.xhr[id].abort();
                }
                // 图片删除
                jq('#li' + id).remove();
                // 表单中删除
                jq('#input' + id).remove();
                uploadImg.uploadInfo[id] = null;
                //如果删除的微视，添加微视图标高亮
                if(id == 'video'){
                    jq('.iconVideo').addClass('iconVideoOn');
                }
                //如果删除的微视，添加微视图标高亮
                if(id == 'video'){
                    jq('.iconVideo').addClass('iconVideoOn');
                }

                // 图片变少了，显示+号
                if (uploadImg.countUpload() < uploadImg.maxUpload) {
                    jq('#addPic').show();
                    jq('.iconSendImg').removeClass('fail');
                }
                //更新剩余上传数
                uploadImg.uploadRemaining();

                //当删除所有图片后隐藏添加图片的图标加号
                if(jq('.photoList').find('li').length < 2){
                    jq('.photoList').hide();
                    jq('.sendCon').css('height', exports.contentHeight);
                }
            });

        },

        init: function() {

            exports.contentHeight = jq('.sendCon').height();

            // 发送
            var isSubmitButtonClicked = false;
            jq('#submitButton').bind('click', function() {
                if (uploadImg.isBusy) {
                    jq.UTIL.dialog({content:'上传中，请稍后发帖', autoClose:true});
                    return false;
                }
                if (isSubmitButtonClicked || !exports.checkForm()) {
                    return false;
                }
                var opt = {
                    'noMsg': false,
                    success:function(re) {
                        var status = parseInt(re.code);
                        if (status == 0) {
                            //clearInterval(timer);
                            //localStorage.removeItem(storageKey);
                            //if(re.data.subscribeTip && isWX)
                            if(false){
                                jq.UTIL.dialog({
                                    content: '发表成功。是否接收回复提醒？',
                                    okValue: '确定',
                                    cancelValue: '取消',
                                    isMask: true,
                                    ok: function (){
                                        pgvSendClick({hottag:'wx.guide.follow.yes'});
                                        jq.UTIL.reload('http://mp.weixin.qq.com/s?__biz=MzA5MTEzMDUyMw==&mid=200420371&idx=1&sn=ff6c7912111f04fa412615094128551c');
                                    },
                                    cancel: function(){
                                       pgvSendClick({hottag:'wx.guide.follow.no'});
                                       jq.UTIL.reload(re.jumpURL);
                                    }
                                });
                                pgvSendClick({hottag:'wx.guide.follow.show'});
                            }else{
                                jq.UTIL.reload(re.jumpURL);
                            }
                            
                            return false;
                        } else {
                            if (status == 34428){ //请先设置性别  re.message.indexOf('性别') != -1)
                               exports.userGenderPopWin();
                            }
                            isSubmitButtonClicked = false;
                            if (status != 34428){
                                jq.UTIL.dialog({content: re.msg, autoClose:true});
                            }
                        }
                    },
                    error:function(re) {
                        isSubmitButtonClicked = false;
                    },
                    'noJump': true
                };
                isSubmitButtonClicked = true;
                jq.UTIL.ajaxForm('newthread', opt, true);
                return false;
            });

            jq('#content').on('focus', function() {
                jq('.bNav').hide();
            }).on('blur', function() {
                jq('.bNav').show();
            });

            exports.initUpload();

            // 表情开关
            //jq(".tagBox a").on("click", function() {
            //    jq(".tagBox").find('a').attr('class', '');
            //    jq('.tagTopic').hide();
            //    var labelId = jq(this).attr('labelId');
            //    if(jq('input[name="fId"]').val() != labelId) {
            //        jq(this).attr('class', 'on');
            //        //添加当前标签到输入框上，并设置输入框的css缩进
            //        jq('.tagTopic').text($(this).text()).show();
            //        jq('.sendCon').addClass('tagCon');
            //        jq('input[name="fId"]').val(labelId);
            //    } else {
            //        jq('input[name="fId"]').val(0);
            //        jq('.sendCon').removeClass('tagCon');
            //    }
            //});
            //选中当前标签
            //var selTagId = jq.UTIL.getQuery('filterType');
            //if(selTagId){
            //    var tagArr = jq('.tagBox').find('a');
            //    jq.each(tagArr, function(key, value){
            //        jq(value).removeClass('on');
            //        if(jq(value).attr('labelid') == selTagId){
            //            jq(value).addClass('on');
            //            jq(value).click();
            //            jq('input[name="fId"]').val(selTagId);
            //        }
            //    })
            //}
            //if (parseInt(jq('.locationCon').attr('closeStatus')) != 1) {
            //    exports.checkLBS();
            //} else {
            //    jq('.locationCon').removeClass('c1').addClass('c9').html('<i class="iconloc f16 c9 cf"></i>' + '点击开启定位');
            //    exports.getgps = 0;
            //}

            //表情 图片 标签点击切换
            //var aOperatIcon = jq('.operatIcon');
            //aOperatIcon.on('click', function(){
            //    var thisObj = jq(this);
            //    var thisNum = thisObj.attr('data-id');
            //    var aOperatList = jq('.operatList');
            //    aOperatList.hide();
            //    jq(aOperatList[thisNum]).show();
            //    if(thisNum == 0){
            //        jq('.expreList').show();
            //        jq('.expreBox').show();
            //    }
            //    aOperatIcon.removeClass('on');
            //    thisObj.addClass('on');
            //    if(!thisObj.hasClass('iconSendImg')){
            //        var photoList = jq('.photoList');
            //        if(photoList.find('li').length < 2){
            //            photoList.hide();
            //            jq('.sendCon').css('height', exports.contentHeight);
            //        }
            //    }
            //});
            //表情总个数大于手机宽度时显示更多按钮
            //var expressionMenu = jq('.expressionMenu').find('a');
            //var haveMenuWidth = expressionMenu.length*76;
            //var operatingBoxWidth = jq('.operatingBox').width();
            //if(haveMenuWidth > operatingBoxWidth){
            //    jq('.iconArrowR').show();
            //};

            //添加微视
            //if(jq.UTIL.getQuery('syncUnionid')){
            //    //如果是在授权之后，弹出微视弹窗
            //    setTimeout(function(){
            //       jq('.iconVideo').click(); 
            //    }, 300)
            //}
            //jq('.sendNav').on('click', '.iconVideo', function(){
            //    var thisObj = jq(this);
            //    var photoList = jq('.photoList');
            //    if(photoList.find('li').length > 1 && thisObj.hasClass('iconVideoOn')){
            //        jq.UTIL.dialog({id: 'addWsTips', content: '图片和微视只能发一种哦~', autoClose: 2000});
            //        return false;
            //    };
            //    if(thisObj.hasClass('iconVideoOn')){
            //        exports.addWeishiPop(); 
            //    }
            //    return false;
            //});
            //微视弹窗事件
            //jq(document).on('click', '.microTab, .weishiList, .close', function(){
            //    var thisObj = jq(this);
            //    //关闭窗口
            //    if(thisObj.hasClass('close')){
            //        jq('#content').show();
            //    }
            //    //标签切换
            //    if(thisObj.hasClass('microTab')){
            //        var tabId = thisObj.attr('data-id'),
            //            microVideoList = jq('.microVideoList'),
            //            microTab = jq('.microTab');
            //        FastClick.attach(this);
            //        microVideoList.hide();
            //        microTab.removeClass('on');
            //        thisObj.addClass('on');
            //        jq(microVideoList[tabId]).show();
            //    }
            //    //列表点击
            //    if(thisObj.hasClass('weishiList')){

            //        var weishiList = jq('.weishiList'),
            //            weishiSelect = jq('.weishiSelect'),
            //            wsId = thisObj.attr('data-id') || '',
            //            wsVid = thisObj.attr('data-vid'),
            //            wsPlayer = thisObj.attr('data-player'),
            //            wsInsertTime = thisObj.attr('data-inserttime'),
            //            wsTimeStamp = thisObj.attr('data-timestamp'),
            //            wsText = thisObj.find('.mvText').html(),
            //            wsPicUrl = thisObj.find('.mvImg').attr('src');
            //        jq('#content').show();
            //        weishiList.removeClass('on');
            //        thisObj.addClass('on');
            //        weishiSelect.removeClass('iconSelect');
            //        thisObj.find('.weishiSelect').addClass('iconSelect');
            //        setTimeout(function(){
            //            var photoList = jq('.photoList');
            //            var hasWeishi = photoList.find('#livideo').length > 0;
            //            //过滤多次点击
            //            if(!hasWeishi){
            //                var html = '<li id="livideo"><div class="photoCut"><img src="'+wsPicUrl+'" class="attchImg" alt="photo"></div>' +
            //                    '<input type="hidden" name="showPicUseableType" value="2">'+
            //                    '<input type="hidden" name="weishiInfo[id]" value="'+wsId+'">'+
            //                    '<input type="hidden" name="weishiInfo[vid]" value="'+wsVid+'">'+
            //                    '<input type="hidden" name="weishiInfo[picUrl]" value="'+wsPicUrl+'">'+
            //                    '<input type="hidden" name="weishiInfo[player]" value="'+wsPlayer+'">'+
            //                        '<a href="javascript:;" class="cBtn cBtnOn pa db" title="" _id="video">关闭</a><i class="iconMicroVideo cf imv pa db"></i></li>';
            //                jq('#addPic').before(html).hide();
            //                jq('.textTip').hide();
            //                jq('.sendCon').css('height', '60');
            //                photoList.show();
            //                jq('.iconVideo').removeClass('iconVideoOn');
            //                jq.UTIL.dialog({id: 'weishiPop'});
            //            }
            //        }, 300);
            //    }
            //    return false;
            //});
            
        },

        // 按钮模态相关
        initModal: function() {
            // 发送按钮模态
            jq('#submitButton').bind('touchstart', function() {
                jq(this).addClass('sendOn');
            }).bind('touchend', function() {
                jq(this).removeClass('sendOn');
            });
            jq('#cBtn').bind('touchstart', function() {
                jq(this).addClass('cancelOn');
            }).bind('touchend', function() {
                jq(this).removeClass('cancelOn');
            });
        },

        checkForm: function() {

            jq.each(uploadImg.uploadInfo, function(i,n) {
                if (n && !n.isDone) {
                    jq.UTIL.dialog({content:'图片上传中，请等待', autoClose:true});
                    return false;
                }
            });

            var content = jq('#content').val();
            var contentLen = jq.UTIL.mb_strlen(jq.UTIL.trim(content));
            if (contentLen < 15) {
                jq.UTIL.dialog({content:'内容过短', autoClose:true});
                return false;
            }

            return true;
        }

    }

    exports.init();

});
