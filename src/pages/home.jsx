// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Building2, Clock, FileText, ClipboardList, Bell, User, ChevronRight, Calendar, CheckCircle2, AlertCircle, Clock3, LogIn } from 'lucide-react';
// @ts-ignore;
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Avatar, AvatarFallback, AvatarImage, useToast } from '@/components/ui';

// @ts-ignore;
import { AIAssistant } from '@/components/AIAssistant';
export default function Home(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stats, setStats] = useState({
    pendingApproval: 0,
    todayTasks: 0,
    unreadNotices: 0,
    checkedIn: false
  });
  const [notices, setNotices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    checkLoginStatus();
    loadStats();
    loadNotices();
    loadTasks();
  }, []);

  // 检查登录状态 - 检查 CloudBase 登录状态和用户表
  const checkLoginStatus = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const auth = tcb.auth();
      const loginState = await auth.getLoginState();

      // 首先检查 localStorage 中是否有管理员登录信息
      try {
        const stored = localStorage.getItem('xinban_admin_user');
        const isLoggedInFlag = localStorage.getItem('xinban_admin_logged_in');
        if (stored && isLoggedInFlag === 'true') {
          const storedAdmin = JSON.parse(stored);
          setCurrentUser(storedAdmin);
          setIsLoggedIn(true);
          return;
        }
      } catch (e) {
        console.error('读取本地存储失败:', e);
      }

      // 放宽条件，只要有 loginState 就认为已登录
      if (loginState) {
        const db = tcb.database();
        const openId = loginState.userInfo?.openId || `anon_${Date.now()}`;

        // 先尝试通过 _openid 查找用户
        let userRes = await db.collection('sys_user').where({
          _openid: db.command.eq(openId)
        }).get();
        if (userRes.data && userRes.data.length > 0) {
          setCurrentUser(userRes.data[0]);
          setIsLoggedIn(true);
        } else {
          // 如果通过 _openid 找不到，检查是否是管理员首次登录
          // 首先查找 type=0 且 internal_user_type=1 的内置管理员
          const internalAdminRes = await db.collection('sys_user').where({
            type: 0,
            internal_user_type: 1
          }).get();
          if (internalAdminRes.data && internalAdminRes.data.length > 0) {
            // 找到内置管理员用户，更新其 _openid
            const adminUser = internalAdminRes.data[0];
            await db.collection('sys_user').doc(adminUser._id).update({
              _openid: openId,
              lastLoginTime: new Date(),
              updateTime: new Date()
            });

            // 重新获取更新后的用户信息
            const updatedUserRes = await db.collection('sys_user').doc(adminUser._id).get();
            setCurrentUser(updatedUserRes.data);
            setIsLoggedIn(true);
          } else {
            // 如果找不到内置管理员，尝试查找 role 为 super_admin 的用户
            const adminRes = await db.collection('sys_user').where({
              role: 'super_admin'
            }).get();
            if (adminRes.data && adminRes.data.length > 0) {
              // 找到管理员用户，更新其 _openid
              const adminUser = adminRes.data[0];
              await db.collection('sys_user').doc(adminUser._id).update({
                _openid: openId,
                lastLoginTime: new Date(),
                updateTime: new Date()
              });

              // 重新获取更新后的用户信息
              const updatedUserRes = await db.collection('sys_user').doc(adminUser._id).get();
              setCurrentUser(updatedUserRes.data);
              setIsLoggedIn(true);
            } else {
              // 没有找到任何用户记录
              setCurrentUser({
                name: '访客',
                roleName: '游客',
                department: '未分配'
              });
              setIsLoggedIn(false);
            }
          }
        }
      } else {
        setCurrentUser({
          name: '访客',
          roleName: '游客',
          department: '未分配'
        });
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setCurrentUser({
        name: '访客',
        roleName: '游客',
        department: '未分配'
      });
      setIsLoggedIn(false);
    }
  };
  const loadStats = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // 获取今日打卡状态
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkinRes = await db.collection('checkins').where({
        date: db.command.gte(today)
      }).count();

      // 获取待审批数量
      const approvalRes = await db.collection('approvals').where({
        status: 'pending'
      }).count();

      // 获取今日任务数
      const taskRes = await db.collection('tasks').where({
        status: db.command.in(['pending', 'in_progress'])
      }).count();

      // 获取未读通知
      const noticeRes = await db.collection('notices').where({
        isRead: false
      }).count();
      setStats({
        checkedIn: checkinRes.total > 0,
        pendingApproval: approvalRes.total,
        todayTasks: taskRes.total,
        unreadNotices: noticeRes.total
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };
  const loadNotices = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('notices').orderBy('createTime', 'desc').limit(3).get();
      setNotices(res.data || []);
    } catch (error) {
      console.error('加载通知失败:', error);
    } finally {
      setLoading(false);
    }
  };
  const loadTasks = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('tasks').orderBy('createTime', 'desc').limit(20).get();
      setTasks(res.data || []);
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  };
  const handleCheckIn = async () => {
    if (!isLoggedIn) {
      toast({
        title: '请先登录',
        description: '登录后才能使用打卡功能',
        variant: 'destructive'
      });
      $w.utils.navigateTo({
        pageId: 'login',
        params: {}
      });
      return;
    }
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      // 检查今日是否已打卡
      const existRes = await db.collection('checkins').where({
        date: db.command.gte(today)
      }).get();
      if (existRes.data && existRes.data.length > 0) {
        toast({
          title: '提示',
          description: '今日已打卡',
          variant: 'default'
        });
        return;
      }
      await db.collection('checkins').add({
        date: now,
        checkInTime: now,
        status: 'normal',
        createTime: now,
        updateTime: now
      });
      setStats(prev => ({
        ...prev,
        checkedIn: true
      }));
      toast({
        title: '打卡成功',
        description: `打卡时间: ${now.toLocaleTimeString()}`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: '打卡失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    }
  };
  const navigateTo = pageId => {
    $w.utils.navigateTo({
      pageId,
      params: {}
    });
  };
  const quickActions = [{
    icon: Building2,
    label: '组织架构',
    pageId: 'organization',
    color: 'bg-blue-500',
    desc: '管理部门人员'
  }, {
    icon: Clock,
    label: '打卡考勤',
    pageId: 'checkin',
    color: 'bg-green-500',
    desc: '记录上下班'
  }, {
    icon: FileText,
    label: '审批流程',
    pageId: 'approval',
    color: 'bg-orange-500',
    desc: '发起/审批申请'
  }, {
    icon: ClipboardList,
    label: '任务管理',
    pageId: 'tasks',
    color: 'bg-purple-500',
    desc: '分配跟踪任务'
  }];
  return <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="px-4 py-6">
          {/* Logo and Brand */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <img src="cloud://cloudbase-d1gaoq0lv6e2e5299.636c-cloudbase-d1gaoq0lv6e2e5299-1440453336/builder-uploads/820bb90ef59bfe8cb6921d3aea47ceae.png" alt="鑫办Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold">鑫办</h1>
                <p className="text-blue-200 text-xs">智能办公协作平台</p>
              </div>
            </div>
            {isLoggedIn ? <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigateTo('profile')}>
                <User className="h-5 w-5" />
              </Button> : <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => navigateTo('login')}>
                <LogIn className="h-4 w-4 mr-1" />
                登录
              </Button>}
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 mt-4">
            <Avatar className="h-12 w-12 border-2 border-white/30">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback className="bg-white/20 text-white">
                {currentUser?.name?.charAt(0) || '访'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{currentUser?.name || '访客'}</h2>
              <p className="text-blue-100 text-sm">{currentUser?.roleName} · {currentUser?.department}</p>
            </div>
          </div>

          {/* Date Display */}
          <div className="flex items-center gap-2 text-blue-100 text-sm mt-3">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-3 text-center">
              <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${stats.checkedIn ? 'bg-green-100' : 'bg-gray-100'}`}>
                <CheckCircle2 className={`h-5 w-5 ${stats.checkedIn ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <p className="text-xs text-gray-500">今日打卡</p>
              <p className="text-sm font-semibold">{stats.checkedIn ? '已打卡' : '未打卡'}</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 rounded-full bg-orange-100 mx-auto mb-2 flex items-center justify-center">
                <Clock3 className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-xs text-gray-500">待审批</p>
              <p className="text-sm font-semibold">{stats.pendingApproval} 项</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 mx-auto mb-2 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500">进行中</p>
              <p className="text-sm font-semibold">{stats.todayTasks} 任务</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 rounded-full bg-red-100 mx-auto mb-2 flex items-center justify-center">
                <Bell className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-xs text-gray-500">通知</p>
              <p className="text-sm font-semibold">{stats.unreadNotices} 未读</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">快捷功能</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(action => <Card key={action.pageId} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateTo(action.pageId)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center flex-shrink-0`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{action.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-2" />
                </div>
              </CardContent>
            </Card>)}
        </div>
      </div>

      {/* Check In Button */}
      {!stats.checkedIn && <div className="px-4 mt-6">
          <Button className="w-full h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg" onClick={handleCheckIn}>
            <Clock className="h-5 w-5 mr-2" />
            立即打卡
          </Button>
        </div>}

      {/* Notices */}
      <div className="px-4 mt-6 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">最新通知</h2>
          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => navigateTo('notices')}>
            查看全部
          </Button>
        </div>

        {loading ? <div className="text-center py-8 text-gray-500">加载中...</div> : notices.length === 0 ? <Card className="bg-gray-50 border-dashed">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无通知公告</p>
            </CardContent>
          </Card> : <div className="space-y-3">
            {notices.map(notice => <Card key={notice._id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigateTo('notices')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{notice.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notice.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notice.createTime).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </div>

      {/* AI Assistant */}
      <AIAssistant $w={$w} tasks={tasks} currentUser={currentUser} />
    </div>;
}