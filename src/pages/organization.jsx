// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { ArrowLeft, Plus, Search, MoreVertical, Users, UserCircle, ChevronRight, ChevronDown, Building2, Edit2, Trash2, Shield } from 'lucide-react';
// @ts-ignore;
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Badge, Avatar, AvatarFallback, AvatarImage, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui';

import { useForm } from 'react-hook-form';
export default function Organization(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState(new Set(['root']));
  const form = useForm({
    defaultValues: {
      name: '',
      role: 'employee',
      department: '',
      phone: '',
      email: '',
      password: ''
    }
  });
  const deptForm = useForm({
    defaultValues: {
      name: '',
      parentId: 'none',
      level: 1
    }
  });
  useEffect(() => {
    loadDepartments();
    loadUsers();
  }, []);
  const loadDepartments = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('departments').orderBy('level', 'asc').get();
      setDepartments(res.data || []);
    } catch (error) {
      console.error('加载部门失败:', error);
      toast({
        title: '加载失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const loadUsers = async () => {
    try {
      setLoading(true);
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const res = await db.collection('users').orderBy('createTime', 'desc').get();
      setUsers(res.data || []);
    } catch (error) {
      console.error('加载用户失败:', error);
      toast({
        title: '加载失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleAddUser = async data => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const now = new Date();
      const roleMap = {
        'general_manager': '总经理',
        'deputy_manager': '副总经理',
        'director': '总监',
        'manager': '经理',
        'supervisor': '主管',
        'employee': '员工'
      };
      // 生成默认密码（如果没有提供）
      const defaultPassword = data.password || '123456';

      // 添加到 users 集合
      await db.collection('users').add({
        ...data,
        password: defaultPassword,
        roleName: roleMap[data.role],
        isActive: true,
        createTime: now,
        updateTime: now
      });
      // 同时添加到 sys_user 集合，支持登录
      await db.collection('sys_user').add({
        name: data.name,
        phone: data.phone,
        email: data.email,
        password: defaultPassword,
        role: data.role,
        roleName: roleMap[data.role],
        department: data.department,
        isActive: true,
        createTime: now,
        updateTime: now
      });
      toast({
        title: '添加成功',
        description: `已成功添加员工: ${data.name}`,
        variant: 'default'
      });
      setShowUserDialog(false);
      form.reset();
      loadUsers();
    } catch (error) {
      toast({
        title: '添加失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const handleEditUser = async data => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const roleMap = {
        'general_manager': '总经理',
        'deputy_manager': '副总经理',
        'director': '总监',
        'manager': '经理',
        'supervisor': '主管',
        'employee': '员工'
      };
      // 更新 users 集合
      const updateData = {
        ...data,
        roleName: roleMap[data.role],
        updateTime: new Date()
      };
      // 如果提供了新密码，则更新密码
      if (data.password && data.password.trim()) {
        updateData.password = data.password.trim();
      }
      delete updateData.password; // 先删除，后面单独处理
      await db.collection('users').doc(editingUser._id).update(updateData);

      // 同步更新 sys_user 集合
      const sysUserRes = await db.collection('sys_user').where({
        name: editingUser.name,
        phone: editingUser.phone
      }).get();
      if (sysUserRes.data && sysUserRes.data.length > 0) {
        const sysUpdateData = {
          name: data.name,
          phone: data.phone,
          email: data.email,
          role: data.role,
          roleName: roleMap[data.role],
          department: data.department,
          updateTime: new Date()
        };
        // 如果提供了新密码，则更新密码
        if (data.password && data.password.trim()) {
          sysUpdateData.password = data.password.trim();
        }
        await db.collection('sys_user').doc(sysUserRes.data[0]._id).update(sysUpdateData);
      }
      toast({
        title: '更新成功',
        description: `已成功更新员工信息`,
        variant: 'default'
      });
      setShowUserDialog(false);
      setEditingUser(null);
      form.reset();
      loadUsers();
    } catch (error) {
      toast({
        title: '更新失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const handleDeleteUser = async userId => {
    if (!confirm('确定要删除该员工吗？')) return;
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      // 获取要删除的用户信息
      const userToDelete = users.find(u => u._id === userId);
      // 删除 users 集合中的记录
      await db.collection('users').doc(userId).remove();
      // 同步删除 sys_user 集合中的记录
      if (userToDelete) {
        const sysUserRes = await db.collection('sys_user').where({
          name: userToDelete.name,
          phone: userToDelete.phone
        }).get();
        if (sysUserRes.data && sysUserRes.data.length > 0) {
          await db.collection('sys_user').doc(sysUserRes.data[0]._id).remove();
        }
      }
      toast({
        title: '删除成功',
        description: '员工已删除',
        variant: 'default'
      });
      loadUsers();
    } catch (error) {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  // 切换成员状态（启用/禁用）
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const newStatus = !currentStatus;
      // 更新 users 集合
      await db.collection('users').doc(userId).update({
        isActive: newStatus,
        updateTime: new Date()
      });
      // 获取用户信息用于同步更新 sys_user
      const userToUpdate = users.find(u => u._id === userId);
      if (userToUpdate) {
        const sysUserRes = await db.collection('sys_user').where({
          name: userToUpdate.name,
          phone: userToUpdate.phone
        }).get();
        if (sysUserRes.data && sysUserRes.data.length > 0) {
          await db.collection('sys_user').doc(sysUserRes.data[0]._id).update({
            isActive: newStatus,
            updateTime: new Date()
          });
        }
      }
      toast({
        title: newStatus ? '已启用' : '已禁用',
        description: `员工账号${newStatus ? '已启用' : '已禁用'}`,
        variant: 'default'
      });
      loadUsers();
    } catch (error) {
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const handleAddDept = async data => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const now = new Date();
      await db.collection('departments').add({
        ...data,
        parentId: data.parentId === 'none' ? '' : data.parentId,
        createTime: now,
        updateTime: now
      });
      toast({
        title: '添加成功',
        description: `已成功添加部门: ${data.name}`,
        variant: 'default'
      });
      setShowDeptDialog(false);
      deptForm.reset();
      loadDepartments();
    } catch (error) {
      toast({
        title: '添加失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const openAddUser = () => {
    setEditingUser(null);
    form.reset({
      name: '',
      role: 'employee',
      department: selectedDept?.name || '',
      phone: '',
      email: '',
      password: ''
    });
    setShowUserDialog(true);
  };
  const openEditUser = user => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      role: user.role,
      department: user.department,
      phone: user.phone || '',
      email: user.email || '',
      password: ''
    });
    setShowUserDialog(true);
  };
  const openAddDept = () => {
    setEditingDept(null);
    deptForm.reset({
      name: '',
      parentId: selectedDept?._id || 'none',
      level: (selectedDept?.level || 0) + 1
    });
    setShowDeptDialog(true);
  };
  const toggleDept = deptId => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId);
    } else {
      newExpanded.add(deptId);
    }
    setExpandedDepts(newExpanded);
  };
  const getRoleBadgeColor = role => {
    const colors = {
      'general_manager': 'bg-red-100 text-red-700',
      'deputy_manager': 'bg-orange-100 text-orange-700',
      'director': 'bg-purple-100 text-purple-700',
      'manager': 'bg-blue-100 text-blue-700',
      'supervisor': 'bg-green-100 text-green-700',
      'employee': 'bg-gray-100 text-gray-700'
    };
    return colors[role] || colors['employee'];
  };
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !selectedDept || user.department === selectedDept.name;
    return matchesSearch && matchesDept;
  });

  // 构建部门树
  const buildDeptTree = (parentId = '') => {
    return departments.filter(d => d.parentId === parentId || !d.parentId && !parentId).map(dept => ({
      ...dept,
      children: buildDeptTree(dept._id)
    }));
  };
  const deptTree = buildDeptTree();
  const renderDeptTree = (depts, level = 0) => {
    return depts.map(dept => <div key={dept._id}>
        <div className={`flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 rounded-lg mx-2 ${selectedDept?._id === dept._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`} style={{
        paddingLeft: `${level * 16 + 12}px`
      }} onClick={() => setSelectedDept(dept)}>
          {dept.children?.length > 0 && <button onClick={e => {
          e.stopPropagation();
          toggleDept(dept._id);
        }} className="p-1 hover:bg-gray-200 rounded">
              {expandedDepts.has(dept._id) ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
            </button>}
          {!dept.children?.length && <div className="w-6" />}
          <Building2 className="h-4 w-4 text-blue-500" />
          <span className="flex-1 text-sm">{dept.name}</span>
          <Badge variant="secondary" className="text-xs">
            {users.filter(u => u.department === dept.name).length}人
          </Badge>
        </div>
        {expandedDepts.has(dept._id) && dept.children?.length > 0 && <div>{renderDeptTree(dept.children, level + 1)}</div>}
      </div>);
  };
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => $w.utils.navigateBack()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">组织架构</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Department Tree - Mobile: Horizontal scroll, Desktop: Sidebar */}
        <div className="lg:w-80 bg-white border-r lg:h-[calc(100vh-73px)] lg:overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">部门列表</h2>
              <Button size="sm" variant="ghost" onClick={openAddDept}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="py-2 overflow-x-auto lg:overflow-visible">
            {deptTree.length === 0 ? <div className="text-center py-8 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>暂无部门</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openAddDept}>
                  添加部门
                </Button>
              </div> : renderDeptTree(deptTree)}
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 p-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">
                    {selectedDept ? selectedDept.name : '全部员工'}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    共 {filteredUsers.length} 名员工
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="搜索员工..." className="pl-9 w-full sm:w-64" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <Button onClick={openAddUser}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加员工
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <div className="text-center py-12 text-gray-500">加载中...</div> : filteredUsers.length === 0 ? <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">暂无员工</p>
                  <Button variant="outline" className="mt-3" onClick={openAddUser}>
                    添加员工
                  </Button>
                </div> : <div className="space-y-3">
                  {filteredUsers.map(user => <div key={user._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {user.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                            {user.roleName}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {user.department} · {user.phone || '暂无电话'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleUserStatus(user._id, user.isActive)} title={user.isActive ? '禁用账号' : '启用账号'}>
                          <Badge className={`h-6 px-2 ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {user.isActive ? '启用' : '禁用'}
                          </Badge>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditUser(user)}>
                          <Edit2 className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user._id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? '编辑员工' : '添加员工'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingUser ? handleEditUser : handleAddUser)} className="space-y-4">
              <FormField control={form.control} name="name" render={({
              field
            }) => <FormItem>
                    <FormLabel>姓名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="role" render={({
              field
            }) => <FormItem>
                    <FormLabel>职位</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择职位" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general_manager">总经理</SelectItem>
                        <SelectItem value="deputy_manager">副总经理</SelectItem>
                        <SelectItem value="director">总监</SelectItem>
                        <SelectItem value="manager">经理</SelectItem>
                        <SelectItem value="supervisor">主管</SelectItem>
                        <SelectItem value="employee">员工</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="department" render={({
              field
            }) => <FormItem>
                    <FormLabel>部门</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择部门" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map(dept => <SelectItem key={dept._id} value={dept.name}>
                            {dept.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
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
              
              {!editingUser && <FormField control={form.control} name="password" render={({
              field
            }) => <FormItem>
                      <FormLabel>初始密码</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="请输入初始密码（默认：123456）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />}
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setShowUserDialog(false)}>
                  取消
                </Button>
                <Button type="submit">
                  {editingUser ? '保存' : '添加'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加部门</DialogTitle>
          </DialogHeader>
          
          <Form {...deptForm}>
            <form onSubmit={deptForm.handleSubmit(handleAddDept)} className="space-y-4">
              <FormField control={deptForm.control} name="name" render={({
              field
            }) => <FormItem>
                    <FormLabel>部门名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入部门名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={deptForm.control} name="parentId" render={({
              field
            }) => <FormItem>
                    <FormLabel>上级部门</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择上级部门（可选）" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">无（一级部门）</SelectItem>
                        {departments.map(dept => <SelectItem key={dept._id} value={dept._id}>
                            {dept.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDeptDialog(false)}>
                  取消
                </Button>
                <Button type="submit">添加</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>;
}