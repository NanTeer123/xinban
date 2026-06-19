// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { Building2, User, Phone, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
// @ts-ignore;
import { Button, Card, CardContent, Input, useToast, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Badge } from '@/components/ui';

import { useForm } from 'react-hook-form';
export default function Register(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const form = useForm({
    defaultValues: {
      username: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  });

  // 验证手机号格式
  const validatePhone = phone => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // 验证密码强度
  const validatePassword = password => {
    // 至少6位，包含字母和数字
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
    return passwordRegex.test(password);
  };
  const handleRegister = async data => {
    try {
      setLoading(true);

      // 前端验证
      if (!validatePhone(data.phone)) {
        toast({
          title: '手机号格式错误',
          description: '请输入正确的11位手机号',
          variant: 'destructive'
        });
        return;
      }
      if (!validatePassword(data.password)) {
        toast({
          title: '密码强度不足',
          description: '密码至少6位，需包含字母和数字',
          variant: 'destructive'
        });
        return;
      }
      if (data.password !== data.confirmPassword) {
        toast({
          title: '密码不一致',
          description: '两次输入的密码不一致',
          variant: 'destructive'
        });
        return;
      }
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // 检查手机号是否已存在
      const existingUserRes = await db.collection('sys_user').where({
        phone: data.phone
      }).get();
      if (existingUserRes.data && existingUserRes.data.length > 0) {
        toast({
          title: '手机号已注册',
          description: '该手机号已被注册，请直接登录或联系管理员',
          variant: 'destructive'
        });
        return;
      }

      // 检查 users 集合
      const existingUsersRes = await db.collection('users').where({
        phone: data.phone
      }).get();
      if (existingUsersRes.data && existingUsersRes.data.length > 0) {
        toast({
          title: '手机号已注册',
          description: '该手机号已被注册，请直接登录或联系管理员',
          variant: 'destructive'
        });
        return;
      }
      const now = new Date();

      // 创建用户数据 - 状态为待审核
      const userData = {
        name: data.username,
        username: data.username,
        phone: data.phone,
        password: data.password,
        role: 'employee',
        roleName: '普通员工',
        type: 1,
        internal_user_type: 0,
        status: 'pending',
        // 待审核状态
        isActive: false,
        createTime: now,
        updateTime: now
      };

      // 添加到 sys_user 集合
      await db.collection('sys_user').add(userData);

      // 同时添加到 users 集合
      await db.collection('users').add({
        name: data.username,
        phone: data.phone,
        password: data.password,
        role: 'employee',
        status: 'pending',
        createTime: now,
        updateTime: now
      });
      toast({
        title: '注册成功',
        description: '您的注册申请已提交，请等待管理员审核',
        variant: 'default'
      });
      setRegistered(true);
    } catch (error) {
      console.error('注册失败:', error);
      toast({
        title: '注册失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleBackToLogin = () => {
    $w.utils.navigateTo({
      pageId: 'login',
      params: {}
    });
  };
  if (registered) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">注册申请已提交</h2>
              <p className="text-gray-600">您的账号正在审核中，审核通过后即可登录</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">审核说明</span>
              </div>
              <p className="text-sm text-yellow-700">
                超级管理员审核通过后，您可以使用注册的手机号和密码登录系统。
              </p>
            </div>

            <Button onClick={handleBackToLogin} className="w-full bg-blue-600 hover:bg-blue-700">
              返回登录页
            </Button>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="w-10 h-10 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">新办</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">用户注册</h1>
            <p className="text-gray-600">创建您的账号，开启智能办公</p>
          </div>

          {/* Registration Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
              <FormField control={form.control} name="username" render={({
              field
            }) => <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input placeholder="请输入用户名" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="phone" render={({
              field
            }) => <FormItem>
                    <FormLabel>手机号</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input placeholder="请输入11位手机号" className="pl-10" maxLength={11} {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="password" render={({
              field
            }) => <FormItem>
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input type={showPassword ? 'text' : 'password'} placeholder="至少6位，包含字母和数字" className="pl-10 pr-10" {...field} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="confirmPassword" render={({
              field
            }) => <FormItem>
                    <FormLabel>确认密码</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="请再次输入密码" className="pl-10 pr-10" {...field} />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">注册须知</p>
                    <p>注册后需要超级管理员审核通过才能登录使用。</p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? '注册中...' : '提交注册'}
              </Button>
            </form>
          </Form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button onClick={handleBackToLogin} className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 mx-auto">
              <ArrowLeft className="w-4 h-4" />
              返回登录
            </button>
          </div>
        </CardContent>
      </Card>
    </div>;
}