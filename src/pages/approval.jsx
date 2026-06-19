// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { ArrowLeft, Plus, Search, FileText, Camera, Image, Clock, CheckCircle2, XCircle, ChevronRight, Filter, User, Building2, Shield } from 'lucide-react';
// @ts-ignore;
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, useToast, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui';

import { useForm } from 'react-hook-form';
export default function Approval(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [approvals, setApprovals] = useState([]);
  const [myApprovals, setMyApprovals] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approveComment, setApproveComment] = useState('');
  const [attachments, setAttachments] = useState([]);
  // 用户注册审核相关状态
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showUserDetailDialog, setShowUserDetailDialog] = useState(false);
  const [selectedPendingUser, setSelectedPendingUser] = useState(null);
  const [userApproveComment, setUserApproveComment] = useState('');
  const form = useForm({
    defaultValues: {
      type: 'leave',
      title: '',
      content: '',
      approverId: ''
    }
  });
  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    ensureCollections();
    loadApprovals();
    loadPendingUsers();
  }, [activeTab]);
  // 确保必要的集合存在
  const ensureCollections = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      // 尝试查询 approvals 集合，如果不存在会报错，我们忽略这个错误
      try {
        await db.collection('approvals').limit(1).get();
      } catch (e) {
        // approvals 集合不存在，创建一个示例记录来初始化集合
        try {
          await db.collection('approvals').add({
            title: '__init__',
            content: '__init__',
            status: '__init__',
            createTime: new Date(),
            updateTime: new Date()
          });
          // 删除初始化记录
          const initRes = await db.collection('approvals').where({
            title: '__init__'
          }).get();
          if (initRes.data && initRes.data.length > 0) {
            await db.collection('approvals').doc(initRes.data[0]._id).remove();
          }
        } catch (addError) {
          console.error('初始化 approvals 集合失败:', addError);
        }
      }
    } catch (error) {
      console.error('检查集合失败:', error);
    }
  };
  const loadCurrentUser = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const auth = tcb.auth();
      const loginState = await auth.getLoginState();
      if (loginState && loginState.userInfo) {
        // 根据当前登录用户的 openId 查找用户记录
        const userRes = await db.collection('sys_user').where({
          _openid: db.command.eq(loginState.userInfo.openId)
        }).get();
        if (userRes.data && userRes.data.length > 0) {
          setCurrentUser(userRes.data[0]);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('加载当前用户失败:', error);
      setCurrentUser(null);
    }
  };
  const loadUsers = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('sys_user').get();
      setUsers(res.data || []);
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };
  const loadApprovals = async () => {
    try {
      setLoading(true);
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // 加载待我审批的
      const pendingRes = await db.collection('approvals').where({
        status: 'pending'
      }).orderBy('createTime', 'desc').get();

      // 加载我发起的
      const myRes = await db.collection('approvals').orderBy('createTime', 'desc').get();
      setApprovals(pendingRes.data || []);
      setMyApprovals(myRes.data || []);
    } catch (error) {
      console.error('加载审批失败:', error);
      toast({
        title: '加载失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载待审核的用户列表
  const loadPendingUsers = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();

      // 查询状态为 pending 的用户
      const pendingRes = await db.collection('user_info').where({
        status: 'pending'
      }).orderBy('registeredAt', 'desc').get();
      setPendingUsers(pendingRes.data || []);
    } catch (error) {
      console.error('加载待审核用户失败:', error);
    }
  };

  // 处理用户注册审核
  const handleUserApprove = async (userId, approved) => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const now = new Date();
      const updateData = {
        status: approved ? 'approved' : 'rejected',
        updateTime: now
      };
      if (approved) {
        updateData.approvedAt = now;
        updateData.approvedBy = currentUser?.name || '管理员';
      }
      await db.collection('user_info').doc(userId).update(updateData);

      // 如果审核通过，同时更新 sys_user 集合，让用户可以登录
      if (approved && selectedPendingUser) {
        const sysUserRes = await db.collection('sys_user').where({
          phone: selectedPendingUser.phone
        }).get();
        if (sysUserRes.data && sysUserRes.data.length > 0) {
          await db.collection('sys_user').doc(sysUserRes.data[0]._id).update({
            status: 'active',
            isActive: true,
            updateTime: now
          });
        }
      }
      toast({
        title: approved ? '审核通过' : '已拒绝',
        description: approved ? '用户已通过审核，可以正常登录' : '用户注册申请已被拒绝',
        variant: approved ? 'default' : 'destructive'
      });
      setShowUserDetailDialog(false);
      setSelectedPendingUser(null);
      setUserApproveComment('');
      loadPendingUsers();
    } catch (error) {
      console.error('用户审核失败:', error);
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // 打开用户详情
  const openUserDetail = user => {
    setSelectedPendingUser(user);
    setShowUserDetailDialog(true);
  };
  const handleCreateApproval = async data => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const approver = users.find(u => u._id === data.approverId);
      const now = new Date();
      await db.collection('approvals').add({
        ...data,
        approverName: approver?.name || '',
        submitterName: currentUser?.name || '',
        status: 'pending',
        currentLevel: 1,
        attachments: attachments,
        history: [{
          level: 1,
          action: 'submit',
          time: now,
          comment: '提交申请'
        }],
        createTime: now,
        updateTime: now
      });
      toast({
        title: '提交成功',
        description: '审批申请已提交',
        variant: 'default'
      });
      setShowCreateDialog(false);
      form.reset();
      loadApprovals();
    } catch (error) {
      toast({
        title: '提交失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const handleApprove = async approved => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const now = new Date();
      const newHistory = [...(selectedApproval.history || []), {
        level: selectedApproval.currentLevel,
        action: approved ? 'approve' : 'reject',
        time: now,
        comment: approveComment || (approved ? '同意' : '拒绝'),
        approverName: currentUser?.name
      }];

      // 查找下一级审批人
      const nextApprover = users.find(u => u.role === 'deputy_manager' && selectedApproval.currentLevel === 1);
      let updateData = {
        history: newHistory,
        updateTime: now
      };
      if (!approved) {
        updateData.status = 'rejected';
      } else if (nextApprover && selectedApproval.currentLevel < 2) {
        // 需要继续流转到下一级
        updateData.currentLevel = selectedApproval.currentLevel + 1;
        updateData.approverId = nextApprover._id;
        updateData.approverName = nextApprover.name;
      } else {
        // 审批完成
        updateData.status = 'approved';
      }
      await db.collection('approvals').doc(selectedApproval._id).update(updateData);
      toast({
        title: approved ? '审批通过' : '已拒绝',
        description: approved ? '申请已通过审批' : '申请已被拒绝',
        variant: approved ? 'default' : 'destructive'
      });
      setShowDetailDialog(false);
      setSelectedApproval(null);
      setApproveComment('');
      loadApprovals();
    } catch (error) {
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const getStatusBadge = status => {
    const config = {
      'pending': {
        label: '审批中',
        className: 'bg-orange-100 text-orange-700'
      },
      'approved': {
        label: '已通过',
        className: 'bg-green-100 text-green-700'
      },
      'rejected': {
        label: '已拒绝',
        className: 'bg-red-100 text-red-700'
      }
    };
    const item = config[status] || config['pending'];
    return <Badge className={item.className}>{item.label}</Badge>;
  };
  const getTypeLabel = type => {
    const types = {
      'leave': '请假申请',
      'expense': '报销申请',
      'purchase': '采购申请',
      'business': '出差申请',
      'other': '其他申请'
    };
    return types[type] || '其他申请';
  };
  const openDetail = approval => {
    setSelectedApproval(approval);
    setShowDetailDialog(true);
  };
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => $w.utils.navigateBack()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">审批流程</h1>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              发起申请
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">待我审批</TabsTrigger>
            <TabsTrigger value="my">我的申请</TabsTrigger>
            {currentUser?.role === 'super_admin' && <TabsTrigger value="user_audit">
                用户审核
                {pendingUsers.length > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pendingUsers.length}
                  </Badge>}
              </TabsTrigger>}
          </TabsList>
          
          <TabsContent value="pending" className="mt-4">
            {loading ? <div className="text-center py-12 text-gray-500">加载中...</div> : approvals.length === 0 ? <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无待审批的申请</p>
              </div> : <div className="space-y-3">
                {approvals.map(approval => <Card key={approval._id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => openDetail(approval)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{approval.title}</h3>
                            {getStatusBadge(approval.status)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{getTypeLabel(approval.type)}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              发起人: {approval.submitterName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(approval.createTime).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-2" />
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}
          </TabsContent>
          
          <TabsContent value="my" className="mt-4">
            {loading ? <div className="text-center py-12 text-gray-500">加载中...</div> : myApprovals.length === 0 ? <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无申请记录</p>
                <Button variant="outline" className="mt-3" onClick={() => setShowCreateDialog(true)}>
                  发起申请
                </Button>
              </div> : <div className="space-y-3">
                {myApprovals.map(approval => <Card key={approval._id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => openDetail(approval)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{approval.title}</h3>
                            {getStatusBadge(approval.status)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{getTypeLabel(approval.type)}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              当前审批: {approval.approverName || '待定'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(approval.createTime).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-2" />
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}
          </TabsContent>

          {/* 用户注册审核 Tab */}
          {currentUser?.role === 'super_admin' && <TabsContent value="user_audit" className="mt-4">
              {loading ? <div className="text-center py-12 text-gray-500">加载中...</div> : pendingUsers.length === 0 ? <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">暂无待审核的用户</p>
                </div> : <div className="space-y-3">
                  {pendingUsers.map(user => <Card key={user._id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => openUserDetail(user)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{user.name}</h3>
                              <Badge className="bg-orange-100 text-orange-700">待审核</Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">手机号: {user.phone}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                注册时间: {new Date(user.registeredAt).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-2" />
                        </div>
                      </CardContent>
                    </Card>)}
                </div>}
            </TabsContent>}
        </Tabs>
      </div>

      {/* Create Approval Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>发起审批申请</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateApproval)} className="space-y-4">
              <FormField control={form.control} name="type" render={({
              field
            }) => <FormItem>
                    <FormLabel>申请类型</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择申请类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="leave">请假申请</SelectItem>
                        <SelectItem value="expense">报销申请</SelectItem>
                        <SelectItem value="purchase">采购申请</SelectItem>
                        <SelectItem value="business">出差申请</SelectItem>
                        <SelectItem value="other">其他申请</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="title" render={({
              field
            }) => <FormItem>
                    <FormLabel>申请标题</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入申请标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="content" render={({
              field
            }) => <FormItem>
                    <FormLabel>申请内容</FormLabel>
                    <FormControl>
                      <Textarea placeholder="请详细描述申请内容..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="approverId" render={({
              field
            }) => <FormItem>
                    <FormLabel>审批人</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择审批人" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.filter(u => u.role !== 'employee').map(user => <SelectItem key={user._id} value={user._id}>
                            {user.name} - {user.roleName}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button type="submit">提交申请</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* User Registration Audit Detail Dialog */}
      <Dialog open={showUserDetailDialog} onOpenChange={setShowUserDetailDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedPendingUser && <>
              <DialogHeader>
                <DialogTitle>用户注册审核</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">审核状态</span>
                  <Badge className="bg-orange-100 text-orange-700">待审核</Badge>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">用户名</span>
                  <p className="font-medium">{selectedPendingUser.name}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">手机号</span>
                  <p className="font-medium">{selectedPendingUser.phone}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">邮箱</span>
                  <p className="font-medium">{selectedPendingUser.email || '未填写'}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">注册时间</span>
                  <p className="text-sm">{new Date(selectedPendingUser.registeredAt).toLocaleString('zh-CN')}</p>
                </div>
                
                {/* 审核意见 */}
                <div className="space-y-3 pt-4 border-t">
                  <Textarea placeholder="审核意见（可选）" value={userApproveComment} onChange={e => setUserApproveComment(e.target.value)} />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => handleUserApprove(selectedPendingUser._id, false)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      拒绝
                    </Button>
                    <Button className="flex-1" onClick={() => handleUserApprove(selectedPendingUser._id, true)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      通过
                    </Button>
                  </div>
                </div>
              </div>
            </>}
        </DialogContent>
      </Dialog>

      {/* Approval Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedApproval && <>
              <DialogHeader>
                <DialogTitle>审批详情</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">状态</span>
                  {getStatusBadge(selectedApproval.status)}
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">申请类型</span>
                  <p className="font-medium">{getTypeLabel(selectedApproval.type)}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">申请标题</span>
                  <p className="font-medium">{selectedApproval.title}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">申请内容</span>
                  <p className="text-sm mt-1">{selectedApproval.content}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">发起人</span>
                  <p className="font-medium">{selectedApproval.submitterName}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">当前审批人</span>
                  <p className="font-medium">{selectedApproval.approverName || '待定'}</p>
                </div>
                
                {/* Attachments */}
                {selectedApproval.attachments && selectedApproval.attachments.length > 0 && <div>
                    <span className="text-sm text-gray-500">附件照片</span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {selectedApproval.attachments.map(photo => <div key={photo.id} className="relative">
                          <img src={photo.url} alt={photo.name} className="w-full h-24 object-cover rounded-lg" />
                          <p className="text-xs text-gray-500 mt-1 truncate">{photo.name}</p>
                        </div>)}
                    </div>
                  </div>}
                
                {/* Approval History */}
                <div>
                  <span className="text-sm text-gray-500">审批记录</span>
                  <div className="mt-2 space-y-2">
                    {(selectedApproval.history || []).map((record, index) => <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${record.action === 'approve' ? 'bg-green-500' : record.action === 'reject' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <div className="flex-1">
                          <p className="text-sm">
                            {record.approverName || '系统'} · 
                            {record.action === 'approve' ? ' 同意' : record.action === 'reject' ? ' 拒绝' : ' 提交'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{record.comment}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(record.time).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>)}
                  </div>
                </div>
                
                {/* Approve/Reject Buttons */}
                {activeTab === 'pending' && selectedApproval.status === 'pending' && <div className="space-y-3 pt-4 border-t">
                    <Textarea placeholder="审批意见（可选）" value={approveComment} onChange={e => setApproveComment(e.target.value)} />
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleApprove(false)}>
                        <XCircle className="h-4 w-4 mr-2" />
                        拒绝
                      </Button>
                      <Button className="flex-1" onClick={() => handleApprove(true)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        同意
                      </Button>
                    </div>
                  </div>}
              </div>
            </>}
        </DialogContent>
      </Dialog>
    </div>;
}