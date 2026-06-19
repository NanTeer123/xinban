// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Building2, Mail, Lock, User, ArrowLeft, Eye, EyeOff, CheckCircle2, Shield } from 'lucide-react';
// @ts-ignore;
import { Button, Card, CardContent, Input, Tabs, TabsContent, TabsList, TabsTrigger, Badge, useToast, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui';

import { useForm } from 'react-hook-form';

// localStorage 键名
const ADMIN_USER_KEY = 'xinban_admin_user';
const ADMIN_LOGIN_FLAG = 'xinban_admin_logged_in';
export default function Login(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const [loginType, setLoginType] = useState('wechat');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // 微信登录表单
  const wechatForm = useForm({
    defaultValues: {
      phone: ''
    }
  });

  // 邮箱登录表单
  const emailForm = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // 管理员登录表单
  const adminForm = useForm({
    defaultValues: {
      username: '',
      password: ''
    }
  });

  // 跳转到注册页面
  const handleGoToRegister = () => {
    $w.utils.navigateTo({
      pageId: 'register',
      params: {}
    });
  };
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // 保存管理员信息到 localStorage
  const saveAdminToStorage = adminUser => {
    try {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
      localStorage.setItem(ADMIN_LOGIN_FLAG, 'true');
    } catch (e) {
      console.error('保存管理员信息失败:', e);
    }
  };

  // 从 localStorage 获取管理员信息
  const getAdminFromStorage = () => {
    try {
      const stored = localStorage.getItem(ADMIN_USER_KEY);
      const isLoggedInFlag = localStorage.getItem(ADMIN_LOGIN_FLAG);
      if (stored && isLoggedInFlag === 'true') {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('获取管理员信息失败:', e);
    }
    return null;
  };

  // 清除 localStorage 中的管理员信息
  const clearAdminFromStorage = () => {
    try {
      localStorage.removeItem(ADMIN_USER_KEY);
      localStorage.removeItem(ADMIN_LOGIN_FLAG);
    } catch (e) {
      console.error('清除管理员信息失败:', e);
    }
  };

  // 检查登录状态 - 检查 CloudBase 登录状态和用户表
  const checkLoginStatus = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const auth = tcb.auth();
      const loginState = await auth.getLoginState();

      // 首先检查 localStorage 中是否有管理员登录信息
      const storedAdmin = getAdminFromStorage();
      if (storedAdmin) {
        setCurrentUser(storedAdmin);
        setIsLoggedIn(true);
        return;
      }
      if (loginState && loginState.userInfo) {
        // 已登录（包括匿名登录），获取用户信息
        const db = tcb.database();
        const openId = loginState.userInfo.openId;

        // 先尝试通过 _openid 查找用户（sys_user 集合）
        let userRes = await db.collection('sys_user').where({
          _openid: db.command.eq(openId)
        }).get();
        if (userRes.data && userRes.data.length > 0) {
          setCurrentUser(userRes.data[0]);
          setIsLoggedIn(true);
        } else {
          // 如果通过 _openid 找不到，尝试查找 type=0 且 internal_user_type=1 的内置管理员
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
              setIsLoggedIn(false);
              setCurrentUser(null);
            }
          }
        }
      } else {
        // 未登录
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setIsLoggedIn(false);
      setCurrentUser(null);
    }
  };

  // 微信一键登录
  const handleWechatLogin = async () => {
    try {
      setLoading(true);
      const tcb = await $w.cloud.getCloudInstance();

      // 调用微信登录
      await tcb.auth().toDefaultLoginPage({
        config_version: "env",
        redirect_uri: window.location.href,
        query: {
          s_domain: $w.utils.resolveStaticResourceUrl("/").replace(/^https?:\/\//, "").split("/")[0]
        }
      });
    } catch (error) {
      toast({
        title: '登录失败',
        description: error.message || '微信登录失败，请重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 手机号登录 - 使用 CloudBase 登录
  const handlePhoneLogin = async data => {
    try {
      setLoading(true);
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // 先查询 sys_user 集合
      let userRes = await db.collection('sys_user').where({
        phone: data.phone
      }).get();
      let user = null;

      // 如果 sys_user 中找不到，查询 users 集合
      if (!userRes.data || userRes.data.length === 0) {
        const usersRes = await db.collection('users').where({
          phone: data.phone
        }).get();
        if (usersRes.data && usersRes.data.length > 0) {
          user = usersRes.data[0];
        }
      } else {
        user = userRes.data[0];
      }
      if (user) {
        // 检查用户审核状态
        if (user.status === 'pending') {
          toast({
            title: '账号审核中',
            description: '您的账号正在审核中，请耐心等待管理员审核',
            variant: 'destructive'
          });
          return;
        }
        if (user.status === 'rejected') {
          toast({
            title: '账号审核未通过',
            description: '您的账号审核未通过，请联系管理员了解详情',
            variant: 'destructive'
          });
          return;
        }
        // 验证密码
        if (user.password && user.password !== data.password) {
          toast({
            title: '密码错误',
            description: '请输入正确的密码',
            variant: 'destructive'
          });
          return;
        }
        // 使用匿名登录，然后关联用户记录
        try {
          await tcb.auth().signOut();
        } catch (e) {}
        await tcb.auth().signInAnonymously();
        const auth = tcb.auth();
        const loginState = await auth.getLoginState();
        if (loginState && loginState.userInfo) {
          const openId = loginState.userInfo.openId;

          // 更新用户的 _openid（优先更新 sys_user）
          const sysUserRes = await db.collection('sys_user').where({
            phone: data.phone
          }).get();
          if (sysUserRes.data && sysUserRes.data.length > 0) {
            await db.collection('sys_user').doc(sysUserRes.data[0]._id).update({
              _openid: openId,
              lastLoginTime: new Date(),
              updateTime: new Date()
            });
          }
          user._openid = openId;
          setCurrentUser(user);
          setIsLoggedIn(true);
          toast({
            title: '登录成功',
            description: `欢迎回来，${user.name}`,
            variant: 'default'
          });

          // 跳转到首页
          setTimeout(() => {
            $w.utils.navigateTo({
              pageId: 'home',
              params: {}
            });
          }, 1500);
        }
      } else {
        // 用户不存在，提示注册
        toast({
          title: '用户不存在',
          description: '该手机号未注册，请联系管理员添加',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('手机号登录失败:', error);
      toast({
        title: '登录失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 邮箱登录 - 使用 CloudBase 登录
  const handleEmailLogin = async data => {
    try {
      setLoading(true);
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // 先查询 sys_user 集合
      let userRes = await db.collection('sys_user').where({
        email: data.email
      }).get();
      let user = null;

      // 如果 sys_user 中找不到，查询 users 集合
      if (!userRes.data || userRes.data.length === 0) {
        const usersRes = await db.collection('users').where({
          email: data.email
        }).get();
        if (usersRes.data && usersRes.data.length > 0) {
          user = usersRes.data[0];
        }
      } else {
        user = userRes.data[0];
      }
      if (user) {
        // 检查用户审核状态
        if (user.status === 'pending') {
          toast({
            title: '账号审核中',
            description: '您的账号正在审核中，请耐心等待管理员审核',
            variant: 'destructive'
          });
          return;
        }
        if (user.status === 'rejected') {
          toast({
            title: '账号审核未通过',
            description: '您的账号审核未通过，请联系管理员了解详情',
            variant: 'destructive'
          });
          return;
        }
        // 验证密码
        if (user.password === data.password) {
          // 使用匿名登录，然后关联用户记录
          try {
            await tcb.auth().signOut();
          } catch (e) {}
          await tcb.auth().signInAnonymously();
          const auth = tcb.auth();
          const loginState = await auth.getLoginState();
          if (loginState && loginState.userInfo) {
            const openId = loginState.userInfo.openId;

            // 更新用户的 _openid（优先更新 sys_user）
            const sysUserRes = await db.collection('sys_user').where({
              email: data.email
            }).get();
            if (sysUserRes.data && sysUserRes.data.length > 0) {
              await db.collection('sys_user').doc(sysUserRes.data[0]._id).update({
                _openid: openId,
                lastLoginTime: new Date(),
                updateTime: new Date()
              });
            }
            user._openid = openId;
            user.lastLoginTime = new Date();
            setCurrentUser(user);
            setIsLoggedIn(true);
            toast({
              title: '登录成功',
              description: `欢迎回来，${user.name}`,
              variant: 'default'
            });
            setTimeout(() => {
              $w.utils.navigateTo({
                pageId: 'home',
                params: {}
              });
            }, 1500);
          }
        } else {
          toast({
            title: '登录失败',
            description: '密码错误',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: '登录失败',
          description: '邮箱不存在',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('邮箱登录失败:', error);
      toast({
        title: '登录失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 超级管理员登录 - 使用 CloudBase 匿名登录 + 设置管理员标记
  const handleAdminLogin = async data => {
    try {
      setLoading(true);

      // 超级管理员账号验证
      if (data.username === 'admin' && data.password === 'admin123') {
        const tcb = await $w.cloud.getCloudInstance();

        // 先退出当前登录状态
        try {
          await tcb.auth().signOut();
        } catch (e) {
          // 忽略退出错误
        }

        // 使用匿名登录
        try {
          await tcb.auth().signInAnonymously();
        } catch (anonError) {
          console.error('匿名登录失败:', anonError);
          toast({
            title: '登录失败',
            description: '匿名登录失败，请检查网络连接',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
        const db = tcb.database();
        const auth = tcb.auth();
        const loginState = await auth.getLoginState();

        // 匿名登录后，只要有 loginState 就认为登录成功
        // userInfo 可能需要额外时间才能获取到
        if (loginState) {
          // 尝试获取 openId，如果 userInfo 不存在则使用临时 ID
          const openId = loginState.userInfo?.openId || `anon_${Date.now()}`;
          try {
            // 查找是否已存在管理员用户
            // 检查 type=0 且 internal_user_type=1 的用户（内置超级管理员）
            const adminRes = await db.collection('sys_user').where({
              type: 0,
              internal_user_type: 1
            }).get();
            let adminUser;
            if (adminRes.data && adminRes.data.length > 0) {
              // 更新现有管理员信息
              adminUser = adminRes.data[0];
              // 如果 _openid 不存在或与当前 openId 不同，才更新
              if (!adminUser._openid || adminUser._openid !== openId) {
                await db.collection('sys_user').doc(adminUser._id).update({
                  _openid: openId,
                  lastLoginTime: new Date(),
                  updateTime: new Date()
                });
              } else {
                // 只更新时间字段
                await db.collection('sys_user').doc(adminUser._id).update({
                  lastLoginTime: new Date(),
                  updateTime: new Date()
                });
              }

              // 重新获取更新后的用户信息
              const updatedUserRes = await db.collection('sys_user').doc(adminUser._id).get();
              adminUser = updatedUserRes.data;
            } else {
              // 如果找不到内置管理员，尝试查找 role=super_admin 的用户
              const roleAdminRes = await db.collection('sys_user').where({
                role: 'super_admin'
              }).get();
              if (roleAdminRes.data && roleAdminRes.data.length > 0) {
                adminUser = roleAdminRes.data[0];
                // 如果 _openid 不存在或与当前 openId 不同，才更新
                if (!adminUser._openid || adminUser._openid !== openId) {
                  await db.collection('sys_user').doc(adminUser._id).update({
                    _openid: openId,
                    lastLoginTime: new Date(),
                    updateTime: new Date()
                  });
                } else {
                  // 只更新时间字段
                  await db.collection('sys_user').doc(adminUser._id).update({
                    lastLoginTime: new Date(),
                    updateTime: new Date()
                  });
                }
                const updatedUserRes = await db.collection('sys_user').doc(adminUser._id).get();
                adminUser = updatedUserRes.data;
              } else {
                // 创建管理员用户记录
                const newAdmin = {
                  _openid: openId,
                  name: '超级管理员',
                  role: 'super_admin',
                  roleName: '超级管理员',
                  department: '系统管理部',
                  email: 'admin@xinban.com',
                  phone: '13800138000',
                  position: '系统管理员',
                  createTime: new Date(),
                  updateTime: new Date(),
                  lastLoginTime: new Date()
                };
                const addRes = await db.collection('sys_user').add(newAdmin);
                adminUser = {
                  ...newAdmin,
                  _id: addRes.id
                };
              }
            }
            // 保存管理员信息到 localStorage
            saveAdminToStorage(adminUser);
            setCurrentUser(adminUser);
            setIsLoggedIn(true);
            toast({
              title: '管理员登录成功',
              description: '欢迎回来，超级管理员',
              variant: 'default'
            });

            // 跳转到首页
            setTimeout(() => {
              $w.utils.navigateTo({
                pageId: 'home',
                params: {}
              });
            }, 1500);
          } catch (dbError) {
            console.error('数据库操作失败:', dbError);
            // 即使数据库操作失败，只要匿名登录成功，就认为登录成功
            // 创建一个临时的管理员用户对象
            const tempAdminUser = {
              _id: 'temp_admin',
              _openid: openId,
              name: '超级管理员',
              role: 'super_admin',
              roleName: '超级管理员',
              department: '系统管理部',
              email: 'admin@xinban.com',
              phone: '13800138000',
              position: '系统管理员'
            };
            // 保存到 localStorage
            saveAdminToStorage(tempAdminUser);
            setCurrentUser(tempAdminUser);
            setIsLoggedIn(true);
            toast({
              title: '管理员登录成功',
              description: '欢迎回来，超级管理员（离线模式）',
              variant: 'default'
            });

            // 跳转到首页
            setTimeout(() => {
              $w.utils.navigateTo({
                pageId: 'home',
                params: {}
              });
            }, 1500);
          }
        } else {
          toast({
            title: '登录失败',
            description: '无法获取登录状态，请重试',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: '登录失败',
          description: '管理员账号或密码错误',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('管理员登录失败:', error);
      toast({
        title: '登录失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      await tcb.auth().signOut();
      // 清除 localStorage 中的管理员信息
      clearAdminFromStorage();
      // 重新匿名登录，保持会话
      await tcb.auth().signInAnonymously();
      setIsLoggedIn(false);
      setCurrentUser(null);
      toast({
        title: '已退出登录',
        description: '您已成功退出',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: '退出失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // 获取角色标签颜色
  const getRoleBadgeColor = role => {
    const colors = {
      'super_admin': 'bg-red-100 text-red-700 border-red-200',
      'general_manager': 'bg-purple-100 text-purple-700 border-purple-200',
      'deputy_manager': 'bg-blue-100 text-blue-700 border-blue-200',
      'director': 'bg-green-100 text-green-700 border-green-200',
      'manager': 'bg-orange-100 text-orange-700 border-orange-200',
      'employee': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[role] || colors['employee'];
  };

  // 已登录状态
  if (isLoggedIn) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">已登录</h2>
          <p className="text-gray-500 mb-6">您当前已登录账号</p>
          
          {currentUser && <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{currentUser.name}</p>
                  <Badge className={getRoleBadgeColor(currentUser.role)}>
                    {currentUser.roleName}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-500">{currentUser.department}</p>
              {currentUser.email && <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {currentUser.email}
                </p>}
            </div>}
          
          <div className="space-y-3">
            <Button className="w-full" onClick={() => $w.utils.navigateTo({
              pageId: 'home',
              params: {}
            })}>
              进入工作台
            </Button>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="px-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => $w.utils.navigateBack()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-6 pb-8">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <img src="cloud://cloudbase-d1gaoq0lv6e2e5299.636c-cloudbase-d1gaoq0lv6e2e5299-1440453336/builder-uploads/820bb90ef59bfe8cb6921d3aea47ceae.png" alt="鑫办Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">鑫办</h1>
          <p className="text-gray-500 mt-1">智能办公协作平台</p>
        </div>

        {/* Login Tabs */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <Tabs value={loginType} onValueChange={setLoginType} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="wechat">微信</TabsTrigger>
                <TabsTrigger value="email">邮箱</TabsTrigger>
                <TabsTrigger value="admin">
                  <Shield className="h-4 w-4 mr-1" />
                  管理员
                </TabsTrigger>
              </TabsList>

              {/* 微信登录 */}
              <TabsContent value="wechat" className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">微信一键登录</h3>
                  <p className="text-sm text-gray-500 mb-6">使用微信账号快速登录，安全便捷</p>
                  
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleWechatLogin} disabled={loading}>
                    {loading ? '登录中...' : '微信一键登录'}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-gray-400 text-center mb-3">或使用手机号登录</p>
                  <Form {...wechatForm}>
                    <form onSubmit={wechatForm.handleSubmit(handlePhoneLogin)} className="space-y-3">
                      <FormField control={wechatForm.control} name="phone" render={({
                      field
                    }) => <FormItem>
                            <FormControl>
                              <Input placeholder="请输入手机号" {...field} type="tel" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      <Button type="submit" className="w-full" variant="outline" disabled={loading}>
                        {loading ? '登录中...' : '手机号登录'}
                      </Button>
                      <div className="text-center mt-4">
                        <span className="text-gray-500 text-sm">还没有账号？</span>
                        <button type="button" onClick={handleGoToRegister} className="text-blue-600 hover:text-blue-700 text-sm font-medium ml-1">
                          立即注册
                        </button>
                      </div>
                    </form>
                  </Form>
                </div>
              </TabsContent>

              {/* 邮箱登录 */}
              <TabsContent value="email" className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold">邮箱登录</h3>
                  <p className="text-sm text-gray-500">使用企业邮箱账号登录</p>
                </div>

                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(handleEmailLogin)} className="space-y-4">
                    <FormField control={emailForm.control} name="email" render={({
                    field
                  }) => <FormItem>
                            <FormLabel>邮箱地址</FormLabel>
                            <FormControl>
                              <Input placeholder="请输入企业邮箱" {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                    <FormField control={emailForm.control} name="password" render={({
                    field
                  }) => <FormItem>
                            <FormLabel>密码</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input placeholder="请输入密码" type={showPassword ? 'text' : 'password'} {...field} />
                                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? '登录中...' : '登录'}
                    </Button>
                  </form>
                </Form>

                <p className="text-xs text-gray-400 text-center">
                  首次登录请联系管理员开通账号
                </p>
              </TabsContent>

              {/* 管理员登录 */}
              <TabsContent value="admin" className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold">超级管理员登录</h3>
                  <p className="text-sm text-gray-500">系统管理专用入口</p>
                </div>

                <Form {...adminForm}>
                  <form onSubmit={adminForm.handleSubmit(handleAdminLogin)} className="space-y-4">
                    <FormField control={adminForm.control} name="username" render={({
                    field
                  }) => <FormItem>
                            <FormLabel>管理员账号</FormLabel>
                            <FormControl>
                              <Input placeholder="请输入管理员账号" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                    <FormField control={adminForm.control} name="password" render={({
                    field
                  }) => <FormItem>
                            <FormLabel>密码</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input placeholder="请输入密码" type={showPassword ? 'text' : 'password'} {...field} />
                                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                      {loading ? '登录中...' : '管理员登录'}
                    </Button>
                  </form>
                </Form>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-700">
                    <strong>提示：</strong> 默认管理员账号为 admin / admin123，登录后请及时修改密码
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-400">
          <p>登录即表示您同意《用户协议》和《隐私政策》</p>
          <p className="mt-2">© 2026 鑫办 智能办公平台</p>
        </div>
      </div>
    </div>;
}