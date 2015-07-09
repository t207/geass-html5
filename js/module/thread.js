
//define('module/thread', ['module/followSite', 'module/uploadImg'], function(require, exports, module) {
define(['uploadImg', 'art-template'], function(uploadImg, template) {
    //var followSite = require('module/followSite');

    exports = {
        popTId: 0,
        uploadTimer: null,
        // 初始化滚动图片，如果宽度小于滚动宽度则不显示张数
        initScrollImage: function(id) {
            var id = id || '';
            jq(id + ' .slideBox').each(function(e) {
                var thisObj = jq(this);
                var liArray = thisObj.find('li');
                var liWidth = 0;
                for (var i = 0; i< liArray.length; i++) {
                    liWidth += jq(liArray[i]).width();
                }
                if (thisObj.width() < liWidth) {
                    thisObj.find('.pageNum').show();
                }
            });
        },
        // 初始化全文收起按纽、点击事件
        initViewBtn: function(selector, height) {
            var height = height || 165;
            jq(selector).each(function(e) {
                var thisObj = jq(this);
                var pNode = thisObj.find('p[id^="content_"]')[0];
                if (pNode) {
                    if (pNode.scrollHeight > height) {
                        thisObj.find('.viewBtn:first').show();
                    }
                }
            });
        },
        initViewBtnClick: function() {
            jq('.container').on('click', '.viewBtn', function(e) {
                e.stopPropagation();
                var thisObj = jq(this);
                // todo 点击态移走
                thisObj.addClass('commBg');
                setTimeout(function(){
                    thisObj.removeClass('commBg');
                    exports._foldSwith.call(thisObj);
                }, 50);

                //pgvSendClick({hottag:'QUAN.SITE.LIST.QUANWEN'});
            });
        },
        _foldSwith: function(e) {
            var thisObj = jq(this);
            var text = thisObj.html();
            var height = '', returnTop = false;
            if (text == '收起') {
                returnTop = true;
                height = '150px';
                text = '全文';
            } else {
                height = 'none';
                text = '收起';
            }
            thisObj.parent().find('p').css('max-height', height);
            thisObj.html(text);
            // 收起的时候，回文章处
            if (returnTop) {
                scroll(0, thisObj.closest('.topicBox').position().top);
            }
        },
        // 管理面板弹层
        showManagerPanel: function(tId, parentId, pId, floorPId, uId, author, isViewthread, isReply, nodeId) {
            var isViewthread = isViewthread || false;
            var parentId = parentId || 0;
            var isReply = isReply || false;
            var tmpl = template.render('tmpl_manage', {'tid':tId, 'isReply':isReply});
            var opts = {
                'id': 'operationMenu',
                'isHtml':true,
                'isMask':true,
                'content':tmpl,
                'callback':function() {
                    jq('.g-mask').on('click', function(e) {
                        jq.UTIL.dialog({id:'operationMenu'});
                    });

                    jq('.manageLayer').find('a').on('click', function(e) {
                        var that = jq(this);
                        jq.UTIL.touchStateNow(that);
                        jq.UTIL.dialog({id:'operationMenu'});
                        var btnType = that.attr('btnType');
                        switch (btnType) {
                            case 'delThread':
                                exports._deleteThread(tId, parentId, isViewthread);
                                break;
                            case 'banUser':
                                exports._banUser(uId, author);
                                break;
                            case 'closeUpdate':
                                exports._closeUpdate(sId, tId, parentId, that);
                                break;
                            case 'cleanPost':
                                exports._cleanPost(uId, author);
                                break;
                            case 'reply':
                                exports.reply(window.sId, tId, parentId, pId, floorPId, author, isViewthread, nodeId);
                                break;
                            case 'delReply':
                                exports._delReply(tId, pId, floorPId, isViewthread);
                                break;
                            case 'profile':
                                jq.UTIL.open('/profile/' + uId);
                                break;
                        }
                    });
                }
            };
            jq.UTIL.dialog(opts);
        },
        _closeUpdate: function(sId, tId, parentId, obj) {
            var threadStatus = parseInt(obj.attr('threadStatus'));
             var content = '话题锁定后可以点赞和回复，但不会再被顶起';
             if (threadStatus) {
                content = '话题解锁后可以被顶起';
             }
             var opts = {
                 'id':'opertionConfirm',
                 'isMask':true,
                 'content':content,
                 'okValue':'确定',
                 'cancelValue':'取消',
                 'ok':function() {
                     var closeForm = jq('#closeUpdateForm');
                     if (threadStatus) {
                        closeForm.attr('action', '/thread/open');
                     } else {
                        closeForm.attr('action', '/thread/close');
                     }
                     closeForm.find('input[name="sId"]').val(sId);
                     closeForm.find('input[name="tId"]').val(tId);
                     closeForm.find('input[name="parentId"]').val(parentId);
                     var opt = {
                         success:function(re) {
                             jq.UTIL.dialog({id:'operationMenu'});
                             var status = parseInt(re.errCode);
                             if(status === 0) {
                                 if (threadStatus) {
                                    obj.attr('threadStatus', '0');
                                    obj.html('锁定');
                                 } else {
                                    obj.attr('threadStatus', '1');
                                    obj.html('解锁');
                                 }
                             }
                         },
                         'noJump':true
                     };
                     jq.UTIL.ajaxForm('closeUpdateForm', opt, true);
                 }
             };
             jq.UTIL.dialog(opts);
        },
        _deleteThread: function(tId, parentId, isViewthread) {
            var opts = {
                'id':'opertionConfirm',
                'isMask':true,
                'content':'确定删除吗？',
                'okValue':'确定',
                'cancelValue':'取消',
                'ok':function() {
                    var delForm = jq('#delThreadForm');
                    delForm.find('input[name="tIds[]"]').val(tId);
                    if (!delForm.find('input[name="parentId"]')[0]) {
                        delForm.append('<input type="hidden" name="parentId" value="0">');
                    }
                    delForm.find('input[name="parentId"]').val(parentId);

                    var opt = {
                        success:function(re) {
                            jq.UTIL.dialog({id:'operationMenu'});
                            var status = parseInt(re.errCode);
                            if(status === 0) {
                                // 详情页跳回列表页
                                if (isViewthread) {
                                    jq.UTIL.open('/' + sId);
                                } else {
                                    jq("#t_" + tId + '_0_0').remove();
                                }
                            }
                        },
                        'noJump':true
                    };
                    jq.UTIL.ajaxForm('delThreadForm', opt, true);
                }
            };
            jq.UTIL.dialog(opts);
        },
        _banUser: function(uId, author) {
             var content = '确认将“'+author+'”禁言吗';
             var opts = {
                 'id':'opertionConfirm',
                 'isMask':true,
                 'content':content,
                 'okValue':'确定',
                 'cancelValue':'取消',
                 'ok':function() {
                     var banForm = jq('#banUserForm');
                     banForm.find('input[name="uId"]').val(uId);
                     var opt = {
                         success:function(re) {
                             jq.UTIL.dialog({id:'operationMenu'});
                             var status = parseInt(re.errCode);
                             if(status === 0) {
                                 //todo del list
                             }
                         },
                         'noJump':true
                     };
                     jq.UTIL.ajaxForm('banUserForm', opt, true);
                 }
             };
             jq.UTIL.dialog(opts);
        },
        _cleanPost: function(uId, author) {
             var content = '确认清理“'+author+'”的所有话题吗';
             var opts = {
                 'id':'opertionConfirm',
                 'isMask':true,
                 'content':content,
                 'okValue':'确定',
                 'cancelValue':'取消',
                 'ok':function() {
                     var cleanForm = jq('#cleanPostForm');
                     cleanForm.find('input[name="uId"]').val(uId);
                     var opt = {
                         success:function(re) {
                             jq.UTIL.dialog({id:'operationMenu'});
                             var status = parseInt(re.errCode);
                             if(status === 0) {
                                 //todo del list
                             }
                         },
                         'noJump':true
                     };
                     jq.UTIL.ajaxForm('cleanPostForm', opt, true);
                 }
             };
             jq.UTIL.dialog(opts);
        },
        _delReply: function (tId, pId, floorPId, isViewthread) {
            var floorPId = floorPId || 0;
            jq.UTIL.dialog({
                id: '_delReply',
                content:'确定删除这条回复吗？',
                okValue:'确定',
                cancelValue:'取消',
                isMask:true,
                ok:function (){
                    var url = '/' + sId + '/r/del';
                    if (floorPId > 0) {
                        var url = '/' + sId + '/f/del';
                    }
                    jq.UTIL.ajax(url, {'CSRFToken': CSRFToken, 'tId':tId, 'pId':pId, 'parentId': window.parentId, 'floorPId':floorPId}, {
                        'success': function (re) {
                            jq.UTIL.dialog({id:'operationMenu'});
                            var status = parseInt(re.errCode);
                            if (status == 0) {
                                if (isViewthread) {
                                    if (floorPId > 0) {
                                        jq('#p_' + tId + '_' + pId + '_' + floorPId).remove();
                                        var floorList = jq('#fl_' + pId + ' li[id^=p_]');
                                        var moreObj = jq('#fl_' + pId + ' .moreInReply');
                                        if (floorList.length < 1 && !moreObj.is(':visible')) {
                                            jq('#fl_' + pId).parent().hide();
                                        }
                                    } else {
                                        jq('#p_' + tId + '_' + pId + '_0').remove();
                                        var replyList = jq('#replyList');
                                        //如果replylist中不存在回复item，则删除该父容器
                                        if(replyList.children().length < 1){
                                            replyList.parent().hide();
                                        }
                                    }
                                } else {
                                    var replyNode = jq('#p_' + tId + '_' + pId + '_' + floorPId);
                                    var replyList = replyNode.closest('.replyList');
                                    replyNode.remove();
                                    //如果replylist中不存在回复item，则删除该父容器
                                    // todo 移到回调中
                                    var moreObj = jq('#rCount_' + tId);
                                    if(replyList.children().length < 1 && !moreObj.is(':visible')){
                                        replyList.parent().hide();
                                    }
                                }
                            }
                        },
                        'noJump':true,
                        'error' : function () {}
                    });
                }
            });
            return true;
        },
        labelData: {},
        /**
         * @desc 修改标签
         * @param sId
         * @param tId
         * @param e
         * @private
         */
        _changeLabel: function(sId,tId,e){
            var e = e = e || window.event,
                target = e.target,
                noLabel = jq(target).attr('nolabel'),
                topicConWarp = jq(target).closest('.topicCon').find('.detailCon .dCon'),
                topicLabel = topicConWarp.find('.evtTag'),
                oldLabelId = typeof(window.threadLabelId)=='undefined' ? (topicLabel.attr('labelId') || '') : window.threadLabelId,
                filerType = 0;
            //如果是标签页，取urlfilterType
            if(jq.UTIL.getQuery('filterType')){
                filerType = jq.UTIL.getQuery('filterType');
                oldLabelId = filerType;
            }
            if (jq.isEmptyObject(exports.labelData)) {
                var url = '/' + sId + '/label';
                var opts = {
                    'success': function(re) {
                        var status = parseInt(re.errCode);
                        if (status != 0) {
                            return false;
                        }
                        if(re.data.labelList.length == 0){
                            jq.UTIL.dialog({content: '还没有标签，请在管理台设置标签', autoClose: true});
                            return false;
                        }
                        exports.labelData = re.data;
                        exports.labelData.filterType = oldLabelId;
                        var tmpl = template.render('tmpl_changLabel', exports.labelData);
                        jq.UTIL.dialog({content:tmpl, id:'changLabel', isMask:true, isHtml:true, callback:labelEvent});
                    },
                    'noMsg':true
                };
                jq.UTIL.ajax(url, '', opts);
            } else {
                exports.labelData.filterType = oldLabelId;
                var tmpl = template.render('tmpl_changLabel', exports.labelData);
                jq.UTIL.dialog({content:tmpl, id:'changLabel', isMask:true, isHtml:true, callback:labelEvent});

            }
            /**
             * @desc 回调事件
             */
            function labelEvent(){
                /**
                 * @desc 列表中的tablelist
                 * @type {*}
                 */
                var labelListTeam = jq('.evtLabelList a'),
                    labelOn = jq('.evtLabelList a[class=on]'),
                    labelOkBtn = jq('.evtLabelOk'),
                    labelObj=null;

                labelListTeam.trigger('click');

                //判断当明是否有判断，如果没有全部选中状态
                if(labelOn.length==0){
                    jq('.evtLabelAll').addClass('on');
                }

                /**
                 * @desc 选择标签
                 */
                labelListTeam.on('click',function(){
                    labelListTeam.removeClass('on')
                    jq(this).addClass('on');
                    labelObj = jq(this);
                });

                /**
                 * @desc 确认
                 */
                labelOkBtn.on('click',function(){
                    jq.UTIL.dialog({id:'changLabel'});
                    if(!tId || labelObj==null){
                        return false;
                    }
                    var labelId = labelObj.attr('labelid'),
                        labelName = labelObj.html(),
                        url = 'http://m.wsq.qq.com/'+sId+'/label/thread',
                        data = {tId:tId,labelId:labelId,CSRFToken: CSRFToken},
                        opts = {
                        'noMsg': true,
                        'success': function(re) {
                                if (re.errCode == 0) {
                                    if(typeof(window.threadLabelId)!='undefined') {
                                        window.threadLabelId = labelId;
                                    }
                                    //修改标签成功后更新话题列表中标签，话题详情页不显示
                                    //如果是在列表页,标签已存在
                                    if(typeof noLabel=='undefined' && filerType>0 && labelId!=oldLabelId) {
                                        var topicBoxId = '#t_'+tId+'_0_0';
                                        jq(topicBoxId).hide();
                                    }

                                    if(typeof noLabel=='undefined' && topicLabel.length>0) {
                                        if(parseInt(labelId)==0){
                                            topicLabel.remove();
                                            return false;
                                        }
                                        var dataLink = '/'+sId+'?filterType='+labelId;
                                        topicLabel.attr('data-link',dataLink);
                                        topicLabel.attr('labelId',labelId);
                                        topicLabel.html(labelName);
                                    }else if(typeof noLabel=='undefined' && topicLabel.length==0 && parseInt(labelId)>0) {
                                        //如果是在列表页，当前帖子没有标签
                                        var dataLink = '/'+sId+'?filterType='+labelId,
                                            labelHtmlStr = '<a href="javascript:;" data-link="'+dataLink+'" labelid="'+labelId+'" class="topBtn br f11 c2 db evtTag">'+labelName+'</a>';
                                        topicConWarp.prepend(labelHtmlStr);
                                    }
                                    jq.UTIL.dialog({content: '修改标签成功！', autoClose: true});
                                }
                            }
                        };

                    jq.UTIL.ajax(url, data, opts);
                });
            }
        },
        //reply: function (sId, tId, parentId, pId, floorPId, autor, isViewthread, nodeId, hasTid) {
        reply: function (tId, parentId, pId, author) {
            //var isViewthread = isViewthread || false;
            var author = author || '';
            //var floorPId = floorPId || 0;
            //var nodeId = nodeId || 't_' + tId  + '_0_0';

            // 未登录
            if (authUrl) {
                jq.UTIL.reload(authUrl);
                return false;
            }

            var replyDialog = function() {
                var replyTimer = null;
                //var replyForm = template('tmpl_replyForm', {data:{'sId':sId, 'tId':tId, 'pId':pId, 'floorPId':floorPId, 'parentId':parentId}});
                var replyForm = template('tmpl_replyForm', {data:{'sId':sId, 'tId':tId, 'pId':pId, 'parentId':parentId}});

                // 弹出回复框
                jq.UTIL.dialog({
                    content:replyForm,
                    id:'replyForm',
                    isHtml:true,
                    isMask:true,
                    top: 0,
                    // 弹出后执行
                    callback:function() {

                        //非回复主帖，隐藏发图
                        //if(!hasTid){jq('.uploadPicBox').css('visibility', 'hidden')};

                        //var obj = {pId: pId, isViewthread: isViewthread, nodeId: nodeId, floorPId: floorPId, replyTimer: replyTimer, author: author, tId: tId, sId: sId};
                        var obj = {pId: pId, replyTimer: replyTimer, author: author, tId: tId, sId: sId};
                        //初始化回复窗口事件
                        exports.initReplyEvents(obj);

                    },
                    // 关闭回复框
                    close: function() {
                       // 内容非空确认
                       clearInterval(replyTimer);
                       exports.isNoShowToTop = false;
                       jq('.bNav').show();
                       jq('.floatLayer').show();
                       return true;

                       // 文本框焦点
                       jq('#replyForm .sInput').blur();
                   }
                });
            }

            //不加入社区也可发帖，自动加入社区修改
            replyDialog();

            return true;
        },
        checkReplyForm: function() {
            var content = jq('textarea[name="content"]').val();
            var contentLen = jq.UTIL.mb_strlen(jq.UTIL.trim(content));
            if (contentLen <= 0) {
                jq.UTIL.dialog({content:'回复内容不能为空', autoClose:true});
                return false;
            }

            return true;
        },
        publicEvent: function() {

            var sId = window.sId || 0;
            // 世界杯期间 世界杯微社区不在QQ浏览器中banner独出 兼内置QB的手Q
            if (sId && sId == 231914647 && (!isQQBrowser || isMQ)) {
                jq('#pEvent p').hide();
                jq('#pEventImg').attr('src', 'http://dzqun.gtimg.cn/quan/images/worldcup2014.jpg');
                jq('#pEvent').on('click', function() {
                    jq.UTIL.reload('http://v.html5.qq.com/#p=worldCupFrame&g=2&ch=001203');
                    return false;
                }).slideDown();
            } else if (!window.isAppBar) {
                // public event
                var url = 'http://api.wsq.qq.com/publicEvent?sId=' + sId;
                var eOpts = {
                    'success': function(re) {
                        var status = parseInt(re.errCode);
                        if (status === 0) {

                            if (jq.isEmptyObject(re.data.event) && jq.isEmptyObject(re.data.ad)) {
                                return false;
                            }

                            var pEvent = re.data.event,
                                ad = re.data.ad;
//                            if (re.data.event.peNum < 1) {
//                                return false;
//                            }

                            var showEvent = true;
                            // 如果有广告的话，看一下是否参与了全局活动
                            if (!jq.isEmptyObject(re.data.ad)) {
                                if (re.data.hadJoin) {
                                    // 已参与全局活动，随机显示广告
                                    if (Math.random() * 100 > 50) {
                                        showEvent = false;
                                    }
                                } else {
                                    showEvent = false;
                                }
                            }

                            if (showEvent) {
                                if (!re.data.hadJoin) {
                                    return false;
                                }

                                jq('#pEventImg').attr('src', pEvent.peBanner);
                                if (pEvent.showJoinNum) {
                                    jq('#pEventNum').html(pEvent.peNum || 0);
                                } else {
                                    jq('#pEvent p').hide();
                                }

                                if (pEvent.peMethod == 2) {
                                    var url = pEvent.peCustomUrl;
                                    if (url.indexOf('?') == -1) {
                                        url += '?';
                                    } else {
                                        url += '&';
                                    }
                                    url += 'showSId=' + sId;
                                } else {
                                    var url = DOMAIN + pEvent.peClickUrl + '?peId=' + pEvent.peId + '&sId=' + sId;
                                }
                            } else {
                                jq('#pEventImg').attr('src', ad.banner);
                                jq('#pEvent p').hide();
                                // todo pEvent.peClickUrl 默认值
                                var url = ad.url;
                            }

                            jq('#pEvent').on('click', function() {
                                jq.UTIL.reload(url);
                                return false;
                            }).slideDown();
                        }
                    },
                    'noShowLoading' : true,
                    'noMsg': true
                };
                jq.UTIL.ajax(url, '', eOpts);
            }
        },
        // 帖子管理倒三角
        initPopBtn: function() {

            jq('.warp').on('click', '.PerPopBtn', function(e) {
                // 点击右上角倒三角
                e.stopPropagation(e);

                var perPop = function () {
                    var tId = jq(this).attr('tId');
                    if (tId != exports.popTId) {
                        jq('#t_' + exports.popTId + '_0_0 .perPop').hide();
                    }
                    var popObj = jq('#t_' + tId + '_0_0 .perPop');
                    if(popObj.css('display') != 'none') {
                        popObj.hide();
                        exports.popTId = 0;
                    } else {
                        popObj.show();
                        exports.popTId = tId;
                    }
                };

                var thisObj = jq(this);
                perPop.call(thisObj);
                return false;
            }).on('click', '.adBCon p', function(e) {
            // 右上角弹层点击各操作
                e.stopPropagation(e);
                var thisObj = jq(this);
                var btnType = thisObj.attr('btnType');
                var tId = thisObj.parent().attr('tId');
                var author = thisObj.parent().attr('author');
                var uId = thisObj.parent().attr('uId');
                var parentId = window.parentId || 0;
                if (uId && tId) {
                    switch (btnType) {
                        case 'delThread':
                            exports._deleteThread(tId, parentId, false);
                            break;
                        case 'banUser':
                            exports._banUser(uId, author);
                            break;
                        case 'closeUpdate':
                            exports._closeUpdate(sId, tId, parentId, thisObj);
                            break;
                        case 'cleanPost':
                            exports._cleanPost(uId, author);
                            break;
                        case 'markAd':
                            var opts = {
                                'success': function(re) {
                                    var status = parseInt(re.errCode);
                                    if (status === 0) {
                                        jq('#t_' + tId + '_0_0').hide();
                                    }
                                }
                            }
                            jq.UTIL.ajax('/' + sId + '/markads', {'CSRFToken': CSRFToken, 'tId':tId, 'parentId':parentId}, opts);
                            break;
                        case 'changeLabel':
                            exports._changeLabel(sId,tId,e);
                            break;
                        case 'pmDialog':
                            var url = '/my/pm/dialog?targetUid='+uId+'&sId='+sId;
                            jq.UTIL.reload(url)
                            break;
                    }
                }
                return false;
            });

            // 点任意处倒三角弹窗关闭
            jq(document).bind("click", function(){
                if (exports.popTId) {
                    jq('#t_' + exports.popTId + '_0_0 .perPop').hide();
                    exports.popTId = 0;
                }
            });
        },
        //初始化回复窗口事件
        initReplyEvents: function(obj){
            //var storageKey = obj.sId + 'reply_content';
            //require.async('module/emotion', function(emotion) {
            //    // 表情开关
            //    var reInit = true;
            //    emotion.init(reInit);

            //    //此种写法兼容ios7
            //    //jq('.iconExpression').on('touchstart', emotion.toggle);
            //    //jq('.iconExpression').on('click', emotion.toggle);

            //    //表情 图片点击切换
            //    var aOperatIcon = jq('.operatIcon');
            //    aOperatIcon.on('click', function(){
            //        var thisObj = jq(this);
            //        var thisNum = thisObj.attr('data-id');
            //        var aOperatList = jq('.operatList');
            //        aOperatList.hide();
            //        jq(aOperatList[thisNum]).show();
            //        if(thisNum == 0){
            //            jq('.expreList').show();
            //            jq('.expreBox').show();
            //        }
            //        //如果是当前选中状态，则点击隐藏
            //        if(thisObj.hasClass('on')){
            //            jq(aOperatList[thisNum]).hide();
            //            thisObj.removeClass('on');
            //        }else{
            //            aOperatIcon.removeClass('on');
            //            thisObj.addClass('on');
            //        }
            //    });
            //    //表情总个数大于手机宽度时显示更多按钮
            //    var expressionMenu = jq('.expressionMenu').find('a');
            //    var haveMenuWidth = expressionMenu.length*76;
            //    var operatingBoxWidth = jq('.operatingBox').width();
            //    if(haveMenuWidth > operatingBoxWidth){
            //        jq('.iconArrowR').show();
            //    };
            //    //输入框选中时隐藏表情，如果当只有表情打开时
            //    /*jq('#content').on('focus', function(){
            //        if(jq('.photoTipsBox').is(':hidden')){
            //            emotion.hide();
            //            aOperatIcon.removeClass('on');
            //        }
            //    });*/

            //});

            jq('#replyForm').attr('action','/c/new/submit');
            if (obj.pId > 0) {
                jq('textarea[name="content"]').attr('placeholder', '回复 ' + obj.author + '：');
            }

            //if (obj.pId > 0) {
            //    //jq('#replyForm').attr('action', '/' + obj.sId + '/f/new/submit');
            //    jq('#replyForm').attr('action', '/c/new/submit');
            //    jq('textarea[name="content"]').attr('placeholder', '回复 ' + obj.author + '：');
            //    jq('input[name="floorPId"]').val(obj.floorPId);
            //} else {
            //    //jq('#replyForm').attr('action', '/' + obj.sId + '/r/new/submit');
            //    jq('#replyForm').attr('action', '/r/new/submit');
            //    // 信息恢复
            //    //jq('textarea[name="content"]').val(localStorage.getItem(storageKey));
            //}

            // 发送按纽绑定
            var isSendBtnClicked = false;
            jq('#comBtn').on('click', function() {
                if (isSendBtnClicked){
                    return false;
                }
                var opt = {
                    success:function(re) {
                        var status = parseInt(re.code);
                        if (status === 0) {
                            if (re.data.authorUid > 0) {
                                //localStorage.removeItem(storageKey);
                                if (obj.isViewthread) {
                                    // 回复回复
                                    if (obj.pId) {
                                        var tmpl = template.render('tmpl_reply_floor', {floorList:{0:re.data}});
                                        jq('#fl_' + obj.pId + ' ul').append(tmpl);
                                        jq('#fl_' + obj.pId).parent().parent().show();
                                        // 普通回复
                                    } else {
                                        // 直接显示回复的内容到页面
                                        // 格式化用户等级
                                        if(re.data.authorExpsRank){
                                            re.data.authorExps = {};
                                            re.data.authorExps.rank = re.data.authorExpsRank;
                                        }
                                        re.data.restCount = 0;
                                        var tmpl = template.render('tmpl_reply', {replyList:{0:re.data}, rIsAdmin:window.isManager, rGId:window.gId, groupStar:window.groupStar, isWX:window.isWX});
                                        // 结构变了与列表不同
                                        var allLabelBox = jq('#allLabelBox'),
                                            replyList = jq('#replyList');
                                        allLabelBox.show();
                                        allLabelBox.next('.topicList').show();
                                        /**
                                         * @desc    window.desc from viewthread.js, 回复列表排序 0 或者 1, 默认 0
                                         *          如果为1，发表的新内容插入到列表最上面，否则插入到列表最下面
                                         */
                                        if (!window.desc) {
                                            jq('#allReplyList').append(tmpl);
                                        } else {
                                            jq('#allReplyList').prepend(tmpl);
                                        }

                                        jq('#rCount').html(re.data.rCount);
                                        replyList.parent().show();
                                    }
                                } else {
                                    // 直接显示回复的内容到页面
                                    var tmpl = template.render('tmpl_reply', {replyList:{0:re.data}});
                                    var replyList = jq('#' + obj.nodeId + ' .replyList');
                                    replyList.append(tmpl);
                                    if (re.data.rCount > 0) {
                                        var rCount = parseInt(jq('#rCount_' + obj.tId).attr('rCount') || 0) + 1;
                                        jq('#rCount_' + obj.tId).html('查看全部' + re.data.rCount + '条回复');
                                        jq('#t_'+obj.tId+'_0_0').find('.threadReply').html('<i class="iconReply f18 cf"></i>'+re.data.rCount);
                                    }
                                    replyList.parent().show();
                                }
                            }
                            // initLazyload('.warp img');

                            clearInterval(obj.replyTimer);

                            // 关闭弹窗
                            exports.isNoShowToTop = false;
                            jq.UTIL.dialog({id:'replyForm'});
                            jq('.bNav').show();
                            jq('.floatLayer').show();
                        }
                        isSendBtnClicked = false;
                    },
                    error:function(re) {
                        isSendBtnClicked = false;
                    }
                };
                if (!exports.checkReplyForm()) {
                    return false;
                }
                isSendBtnClicked = true;
                jq.UTIL.ajaxForm('replyForm', opt, true);
                return false;
            });

            // 输入框文字计算
            obj.replyTimer = setInterval(function() {
                //jq.UTIL.strLenCalc(jq('textarea[name="content"]')[0], 'pText', 280);
                if (jq('textarea[name="content"]').val()) {
                    //localStorage.removeItem(storageKey);
                    //localStorage.setItem(storageKey, jq('textarea[name="content"]').val());
                }
            }, 1000);

            exports.isNoShowToTop = true;
            // 隐藏底部导航和向上
            jq('.bNav').hide();
            jq('.floatLayer').hide();

            jq('#fwin_dialog_replyForm').css('top', '0');

            jq('#cBtn').bind('touchstart', function() {
                jq(this).addClass('cancelOn');
            }).bind('touchend', function() {
                jq(this).removeClass('cancelOn');
                if(jq.os.android && parseInt(jq.os.version) <= 2){
                    jq(this).click();
                }
            });

            jq('#comBtn').bind('touchstart', function() {
                jq(this).addClass('sendOn');
            }).bind('touchend', function() {
                jq(this).removeClass('sendOn');
            });

            exports.initUpload();

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
        },
        initUpload: function() {
            // 上传图片的绑定
            jq('#addPic, .uploadPicBox').on('click', function() {
                if(!uploadImg.checkUploadBySysVer()){
                    return false;
                };
            });

            jq('#uploadFile, #fistUploadFile').on('click', function() {
                var thisObj = jq(this);
                if (uploadImg.isBusy) {
                    jq.UTIL.dialog({content:'上传中，请稍后添加', autoClose:true});
                    return false;
                }
            });

            jq('body').on('click', '.iconSendImg, .iconArrowR', function(e){
                var thisObj = jq(this);
                var photoList = jq('.photoList');
                //点击图片图标
                if(thisObj.hasClass('iconSendImg')){
                    if(photoList.is(':hidden')){
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
                            uploadImg.createUpload(jobId, 'replyForm', uploadTimer);
                        }
                    }, 10);
                }, 300);

                e = e || window.event;
                var fileList = e.target.files;
                uploadNum = jq('.photoList').find('li').length || 0;
                if (!fileList.length) {
                    return false;
                }

                for (var i = 0; i<fileList.length; i++) {
                    if (uploadNum > 8) {
                        jq.UTIL.dialog({content:'你最多只能上传8张照片',autoClose:true});
                        break;
                    }

                    var file = fileList[i];

                    if (!uploadImg.checkPicType(file)) {
                        jq.UTIL.dialog({content: '上传照片格式不支持',autoClose:true});
                        continue;
                    }
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
                    if (uploadNum > 7) {
                        jq('#addPic').hide();
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

                var id = jq(this).attr('_id');
                // 取消这个请求
                if (uploadImg.xhr[id]) {
                    uploadImg.xhr[id].abort();
                }
                // 图片删除
                jq('#li' + id).remove();
                // 表单中删除
                jq('#input' + id).remove();
                delete uploadImg.uploadInfo[id];

                // 图片变少了，显示+号
                if (uploadImg.countUpload() < uploadImg.maxUpload) {
                    jq('#addPic').show();
                    jq('.iconSendImg').removeClass('fail');
                }
                //更新剩余上传数
                uploadImg.uploadRemaining();

            });

        }
    };

    return exports
});

