// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { ArrowLeft, User, Mail, Phone, Building2, Shield, LogOut, Edit2, ChevronRight, Clock, FileText, ClipboardList, Star } from 'lucide-react';
// @ts-ignore;
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Avatar, AvatarFallback, AvatarImage, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, useToast, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui';

import { useForm } from 'react-hook-form';
export default function Profile(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    checkInDays: 0,
    approvalCount: 0,
    taskCount: 0,
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showBioDialog, setShowBioDialog] = useState(false);
  const form = useForm({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      bio: ''
    }
  });
  const passwordForm = useForm({
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });
  useEffect(() => {
    loadUserInfo();
    loadStats();
  }, []);
  const loadUserInfo = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // 首先检查 localStorage 中是否有管理员登录信息
      try {
        const stored = localStorage.getItem('xinban_admin_user');
        const isLoggedInFlag = localStorage.getItem('xinban_admin_logged_in');
        if (stored && isLoggedInFlag === 'true') {
          const storedAdmin = JSON.parse(stored);
          setCurrentUser(storedAdmin);
          form.reset({
            name: storedAdmin.name,
            phone: storedAdmin.phone || '',
            email: storedAdmin.email || '',
            bio: storedAdmin.bio || ''
          });
          return;
        }
      } catch (e) {
        console.error('读取本地存储失败:', e);
      }

      // 获取当前登录用户
      const auth = tcb.auth();
      const loginState = await auth.getLoginState();

      // 放宽条件，只要有 loginState 就认为已登录
      if (loginState) {
        const openId = loginState.userInfo?.openId || `anon_${Date.now()}`;

        // 先尝试通过 _openid 查找用户
        let userRes = await db.collection('sys_user').where({
          _openid: db.command.eq(openId)
        }).get();
        if (userRes.data && userRes.data.length > 0) {
          const user = userRes.data[0];
          setCurrentUser(user);
          form.reset({
            name: user.name,
            phone: user.phone || '',
            email: user.email || '',
            bio: user.user_desc || user.nickname || ''
          });
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
            const user = updatedUserRes.data;
            setCurrentUser(user);
            form.reset({
              name: user.name,
              phone: user.phone || '',
              email: user.email || '',
              bio: user.user_desc || user.nickname || ''
            });
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
              const user = updatedUserRes.data;
              setCurrentUser(user);
              form.reset({
                name: user.name,
                phone: user.phone || '',
                email: user.email || '',
                bio: user.user_desc || user.nickname || ''
              });
            } else {
              // 未找到用户记录，显示游客状态
              setCurrentUser({
                name: '访客',
                roleName: '游客',
                department: '未分配',
                phone: '',
                email: '',
                bio: ''
              });
            }
          }
        }
      } else {
        // 未登录，显示游客状态
        setCurrentUser({
          name: '访客',
          roleName: '游客',
          department: '未分配',
          phone: '',
          email: '',
          bio: ''
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      setCurrentUser({
        name: '访客',
        roleName: '游客',
        department: '未分配',
        phone: '',
        email: '',
        bio: ''
      });
    }
  };
  const loadStats = async () => {
    try {
      setLoading(true);
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // 打卡天数
      const checkInRes = await db.collection('checkins').count();

      // 审批数量
      const approvalRes = await db.collection('approvals').count();

      // 任务数量
      const taskRes = await db.collection('tasks').count();

      // 平均评分
      const scoreRes = await db.collection('tasks').where({
        score: db.command.exists(true)
      }).get();
      const scores = scoreRes.data?.filter(t => t.score !== undefined && t.score !== null).map(t => t.score) || [];
      const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
      setStats({
        checkInDays: checkInRes.total || 0,
        approvalCount: approvalRes.total || 0,
        taskCount: taskRes.total || 0,
        avgScore: avgScore
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateProfile = async data => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('sys_user').doc(currentUser._id).update({
        ...data,
        updateTime: new Date()
      });
      toast({
        title: '更新成功',
        description: '个人信息已更新',
        variant: 'default'
      });
      setShowEditDialog(false);
      loadUserInfo();
    } catch (error) {
      toast({
        title: '更新失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const handleUpdateBio = async data => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const auth = tcb.auth();
      const loginState = await auth.getLoginState();
      if (!loginState || !loginState.userInfo) {
        toast({
          title: '请先登录',
          description: '需要登录后才能更新个人简介',
          variant: 'destructive'
        });
        return;
      }
      const openId = loginState.userInfo.openId;
      const now = new Date();

      // 优先更新 sys_user 集合
      const sysUserRes = await db.collection('sys_user').where({
        _openid: db.command.eq(openId)
      }).get();
      if (sysUserRes.data && sysUserRes.data.length > 0) {
        await db.collection('sys_user').doc(sysUserRes.data[0]._id).update({
          user_desc: data.bio,
          updateTime: now
        });
      }

      // 同时更新 users 集合 - 使用多种查询条件确保找到用户
      let usersRes = null;
      const sysUserPhone = sysUserRes.data?.[0]?.phone;
      const sysUserName = sysUserRes.data?.[0]?.name;
      const currentUserPhone = currentUser?.phone;
      const currentUserName = currentUser?.name;

      // 优先使用手机号查询
      if (sysUserPhone || currentUserPhone) {
        usersRes = await db.collection('users').where({
          phone: sysUserPhone || currentUserPhone
        }).get();
      }

      // 如果手机号查询不到，使用姓名查询
      if ((!usersRes || !usersRes.data || usersRes.data.length === 0) && (sysUserName || currentUserName)) {
        usersRes = await db.collection('users').where({
          name: sysUserName || currentUserName
        }).get();
      }

      // 如果还是查不到，尝试通过 email 查询
      const sysUserEmail = sysUserRes.data?.[0]?.email;
      const currentUserEmail = currentUser?.email;
      if ((!usersRes || !usersRes.data || usersRes.data.length === 0) && (sysUserEmail || currentUserEmail)) {
        usersRes = await db.collection('users').where({
          email: sysUserEmail || currentUserEmail
        }).get();
      }
      if (usersRes && usersRes.data && usersRes.data.length > 0) {
        await db.collection('users').doc(usersRes.data[0]._id).update({
          nickname: data.bio,
          updateTime: now
        });
      }

      // 更新本地存储的管理员信息
      try {
        const stored = localStorage.getItem('xinban_admin_user');
        if (stored) {
          const adminUser = JSON.parse(stored);
          adminUser.user_desc = data.bio;
          adminUser.nickname = data.bio;
          localStorage.setItem('xinban_admin_user', JSON.stringify(adminUser));
        }
      } catch (e) {}
      toast({
        title: '更新成功',
        description: '个人简介已更新',
        variant: 'default'
      });
      setShowBioDialog(false);
      loadUserInfo();
    } catch (error) {
      console.error('更新个人简介失败:', error);
      toast({
        title: '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    }
  };
  const handleChangePassword = async data => {
    try {
      if (data.newPassword !== data.confirmPassword) {
        toast({
          title: '密码不匹配',
          description: '新密码和确认密码不一致',
          variant: 'destructive'
        });
        return;
      }
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // 验证旧密码
      const userRes = await db.collection('sys_user').doc(currentUser._id).get();
      if (userRes.data.password !== data.oldPassword) {
        toast({
          title: '密码错误',
          description: '旧密码不正确',
          variant: 'destructive'
        });
        return;
      }

      // 更新密码
      await db.collection('sys_user').doc(currentUser._id).update({
        password: data.newPassword,
        updateTime: new Date()
      });
      toast({
        title: '修改成功',
        description: '密码已成功修改',
        variant: 'default'
      });
      setShowPasswordDialog(false);
      passwordForm.reset();
    } catch (error) {
      toast({
        title: '修改失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      await tcb.auth().signOut();

      // 清除 localStorage 中的管理员信息
      try {
        localStorage.removeItem('xinban_admin_user');
        localStorage.removeItem('xinban_admin_logged_in');
      } catch (e) {
        console.error('清除本地存储失败:', e);
      }

      // 清除本地用户状态
      setCurrentUser({
        name: '访客',
        roleName: '游客',
        department: '未分配',
        phone: '',
        email: '',
        bio: ''
      });
      setIsLoggedIn(false);
      toast({
        title: '已退出登录',
        description: '您已成功退出，即将跳转到登录页面',
        variant: 'default'
      });

      // 跳转到登录页面
      setTimeout(() => {
        $w.utils.navigateTo({
          pageId: 'login',
          params: {}
        });
      }, 1500);
    } catch (error) {
      toast({
        title: '退出失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // 跳转到登录页
  const handleLogin = () => {
    $w.utils.navigateTo({
      pageId: 'login',
      params: {}
    });
  };
  const getRoleBadgeColor = role => {
    const colors = {
      'super_admin': 'bg-red-100 text-red-700',
      'general_manager': 'bg-orange-100 text-orange-700',
      'deputy_manager': 'bg-purple-100 text-purple-700',
      'director': 'bg-blue-100 text-blue-700',
      'manager': 'bg-green-100 text-green-700',
      'employee': 'bg-gray-100 text-gray-700'
    };
    return colors[role] || colors['employee'];
  };
  const menuItems = [{
    icon: Clock,
    label: '我的考勤',
    value: `${stats.checkInDays} 天`,
    onClick: () => $w.utils.navigateTo({
      pageId: 'checkin',
      params: {}
    })
  }, {
    icon: FileText,
    label: '我的审批',
    value: `${stats.approvalCount} 条`,
    onClick: () => $w.utils.navigateTo({
      pageId: 'approval',
      params: {}
    })
  }, {
    icon: ClipboardList,
    label: '我的任务',
    value: `${stats.taskCount} 个`,
    onClick: () => $w.utils.navigateTo({
      pageId: 'tasks',
      params: {}
    })
  }, {
    icon: Star,
    label: '平均评分',
    value: `${stats.avgScore} 分`,
    onClick: () => {}
  }];
  const isGuest = !currentUser || currentUser.roleName === '游客';
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => $w.utils.navigateBack()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">个人中心</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* User Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                  {currentUser?.name?.charAt(0) || '访'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{currentUser?.name || '访客'}</h2>
                  <Badge className={getRoleBadgeColor(currentUser?.role)}>
                    {currentUser?.roleName || '游客'}
                  </Badge>
                </div>
                <p className="text-gray-500 mt-1">{currentUser?.department || '未分配'}</p>
                {(currentUser?.user_desc || currentUser?.nickname) && <p className="text-sm text-gray-400 mt-2 line-clamp-2">{currentUser.user_desc || currentUser.nickname}</p>}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {currentUser?.phone || '未设置'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {currentUser?.email || '未设置'}
                  </span>
                </div>
              </div>
              {!isGuest && <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setShowBioDialog(true)}>
                    <Edit2 className="h-5 w-5 text-gray-400" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(true)}>
                    <Edit2 className="h-5 w-5 text-blue-400" />
                  </Button>
                </div>}
            </div>
          </CardContent>
        </Card>

        {/* Stats Menu */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">我的数据</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {menuItems.map((item, index) => <div key={item.label} className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${index !== menuItems.length - 1 ? 'border-b' : ''}`} onClick={item.onClick}>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                </div>
                <span className="text-gray-500">{item.value}</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>)}
          </CardContent>
        </Card>

        {/* Settings Menu */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">设置</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b" onClick={() => $w.utils.navigateTo({
            pageId: 'organization',
            params: {}
          })}>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">组织架构</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>

            {isGuest ? <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleLogin}>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-600">登录账号</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div> : <>
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setShowPasswordDialog(true)}>
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">修改密码</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleLogout}>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-red-600">退出登录</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </>}
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑个人信息</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-4">
              <FormField control={form.control} name="name" render={({
              field
            }) => <FormItem>
                    <FormLabel>姓名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="phone" render={({
              field
            }) => <FormItem>
                    <FormLabel>电话</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入电话" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="email" render={({
              field
            }) => <FormItem>
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="请输入邮箱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Bio Dialog */}
      <Dialog open={showBioDialog} onOpenChange={setShowBioDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑个人简介</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateBio)} className="space-y-4">
              <FormField control={form.control} name="bio" render={({
              field
            }) => <FormItem>
                  <FormLabel>个人简介</FormLabel>
                  <FormControl>
                    <textarea className="flex min-h-[120px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="请输入个人简介..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setShowBioDialog(false)}>取消</Button>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>;
}