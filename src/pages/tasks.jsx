// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { ArrowLeft, Plus, Search, ClipboardList, Camera, Users, Clock, CheckCircle2, AlertCircle, ChevronRight, Calendar, User, Flag, MoreHorizontal, Sparkles, Star, Send } from 'lucide-react';
// @ts-ignore;
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, useToast, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Progress } from '@/components/ui';

import { useForm } from 'react-hook-form';
export default function Tasks(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [aiScoreSuggestion, setAiScoreSuggestion] = useState(null);
  const [progressUpdate, setProgressUpdate] = useState({
    progress: 0,
    reason: '',
    description: ''
  });
  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      assigneeId: '',
      priority: 'medium',
      deadline: '',
      category: 'daily'
    }
  });
  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    ensureCollections();
    loadTasks();
  }, [activeTab]);
  // 确保必要的集合存在
  const ensureCollections = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      // 尝试查询 tasks 集合，如果不存在会报错，我们忽略这个错误
      try {
        await db.collection('tasks').limit(1).get();
      } catch (e) {
        // tasks 集合不存在，创建一个示例记录来初始化集合
        try {
          await db.collection('tasks').add({
            title: '__init__',
            description: '__init__',
            status: '__init__',
            createTime: new Date(),
            updateTime: new Date()
          });
          // 删除初始化记录
          const initRes = await db.collection('tasks').where({
            title: '__init__'
          }).get();
          if (initRes.data && initRes.data.length > 0) {
            await db.collection('tasks').doc(initRes.data[0]._id).remove();
          }
        } catch (addError) {
          console.error('初始化 tasks 集合失败:', addError);
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
  const loadTasks = async () => {
    try {
      setLoading(true);
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      let query = {};
      if (activeTab === 'pending') {
        query = {
          status: 'pending'
        };
      } else if (activeTab === 'in_progress') {
        query = {
          status: 'in_progress'
        };
      } else if (activeTab === 'completed') {
        query = {
          status: 'completed'
        };
      }
      const res = await db.collection('tasks').where(query).orderBy('createTime', 'desc').get();
      setTasks(res.data || []);

      // 加载我的任务
      const myRes = await db.collection('tasks').orderBy('createTime', 'desc').get();
      setMyTasks(myRes.data || []);
    } catch (error) {
      console.error('加载任务失败:', error);
      toast({
        title: '加载失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCreateTask = async data => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const assignee = users.find(u => u._id === data.assigneeId);
      const now = new Date();
      await db.collection('tasks').add({
        ...data,
        assigneeName: assignee?.name || '',
        creatorName: currentUser?.name || '',
        status: 'pending',
        progress: 0,
        progressHistory: [],
        score: null,
        createTime: now,
        updateTime: now
      });
      toast({
        title: '创建成功',
        description: '任务已创建并分配',
        variant: 'default'
      });
      setShowCreateDialog(false);
      form.reset();
      loadTasks();
    } catch (error) {
      toast({
        title: '创建失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const handleUpdateProgress = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const now = new Date();
      const newHistory = [...(selectedTask.progressHistory || []), {
        progress: progressUpdate.progress,
        reason: progressUpdate.reason,
        description: progressUpdate.description,
        updateTime: now,
        updaterName: currentUser?.name
      }];
      let updateData = {
        progress: progressUpdate.progress,
        progressHistory: newHistory,
        updateTime: now
      };

      // 如果进度达到100%，自动标记为完成
      if (progressUpdate.progress >= 100) {
        updateData.status = 'completed';
        updateData.completedTime = now;
      } else if (selectedTask.status === 'pending') {
        updateData.status = 'in_progress';
      }
      await db.collection('tasks').doc(selectedTask._id).update(updateData);
      toast({
        title: '更新成功',
        description: `任务进度已更新至 ${progressUpdate.progress}%`,
        variant: 'default'
      });
      setShowProgressDialog(false);
      setProgressUpdate({
        progress: 0,
        reason: '',
        description: ''
      });
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      toast({
        title: '更新失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // 分配任务
  const handleAssignTask = async () => {
    if (!assigneeId || !selectedTaskForAssign) {
      toast({
        title: '请选择负责人',
        description: '必须选择任务负责人才能分配',
        variant: 'destructive'
      });
      return;
    }
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const now = new Date();
      // 查找选中的用户信息
      const assignee = users.find(u => u._id === assigneeId);
      await db.collection('tasks').doc(selectedTaskForAssign._id).update({
        assigneeId: assigneeId,
        assigneeName: assignee?.name || '未知用户',
        status: 'pending',
        updateTime: now
      });
      toast({
        title: '分配成功',
        description: `任务已分配给 ${assignee?.name || '未知用户'}`,
        variant: 'default'
      });
      setShowAssignDialog(false);
      setAssigneeId('');
      setSelectedTaskForAssign(null);
      loadTasks();
    } catch (error) {
      toast({
        title: '分配失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // AI智能评分建议
  const generateAIScoreSuggestion = task => {
    const factors = [];
    let suggestedScore = 3;
    const now = new Date();

    // 基于完成时间评分
    if (task.deadline && task.completedTime) {
      const deadline = new Date(task.deadline);
      const completed = new Date(task.completedTime);
      if (completed <= deadline) {
        factors.push({
          text: '按时完成',
          impact: 'positive'
        });
        suggestedScore += 1;

        // 提前完成额外加分
        const daysEarly = Math.floor((deadline - completed) / (1000 * 60 * 60 * 24));
        if (daysEarly >= 3) {
          factors.push({
            text: `提前 ${daysEarly} 天完成`,
            impact: 'positive'
          });
          suggestedScore += 0.5;
        }
      } else {
        const daysOverdue = Math.ceil((completed - deadline) / (1000 * 60 * 60 * 24));
        factors.push({
          text: `逾期 ${daysOverdue} 天完成`,
          impact: 'negative'
        });
        suggestedScore -= 1;
      }
    }

    // 基于进度更新频率评分
    if (task.progressHistory && task.progressHistory.length > 0) {
      const updateCount = task.progressHistory.length;
      if (updateCount >= 5) {
        factors.push({
          text: '进度汇报非常积极',
          impact: 'positive'
        });
        suggestedScore += 1;
      } else if (updateCount >= 3) {
        factors.push({
          text: '进度汇报积极',
          impact: 'positive'
        });
        suggestedScore += 0.5;
      } else if (updateCount === 0) {
        factors.push({
          text: '无进度更新记录',
          impact: 'negative'
        });
        suggestedScore -= 0.5;
      }
    }

    // 基于任务优先级评分
    if (task.priority === 'high') {
      factors.push({
        text: '高优先级任务',
        impact: 'neutral'
      });
    }

    // 基于任务类型评分
    if (task.category === 'urgent') {
      factors.push({
        text: '紧急任务',
        impact: 'neutral'
      });
    }
    suggestedScore = Math.max(1, Math.min(5, Math.round(suggestedScore)));
    return {
      score: suggestedScore,
      factors: factors,
      summary: suggestedScore >= 4 ? '表现优秀' : suggestedScore >= 3 ? '表现良好' : '有待提升'
    };
  };
  const openScoreDialog = task => {
    const suggestion = generateAIScoreSuggestion(task);
    setAiScoreSuggestion(suggestion);
    setSelectedTask(task);
    setShowScoreDialog(true);
  };
  const handleScoreTask = async score => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('tasks').doc(selectedTask._id).update({
        score: score,
        scoredBy: currentUser?.name,
        scoredTime: new Date(),
        updateTime: new Date()
      });
      toast({
        title: '评分成功',
        description: `已为任务评分: ${score}分`,
        variant: 'default'
      });
      setShowScoreDialog(false);
      setSelectedTask(null);
      setAiScoreSuggestion(null);
      loadTasks();
    } catch (error) {
      toast({
        title: '评分失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const getStatusBadge = status => {
    const config = {
      'pending': {
        label: '待开始',
        className: 'bg-gray-100 text-gray-700'
      },
      'in_progress': {
        label: '进行中',
        className: 'bg-blue-100 text-blue-700'
      },
      'completed': {
        label: '已完成',
        className: 'bg-green-100 text-green-700'
      }
    };
    const item = config[status] || config['pending'];
    return <Badge className={item.className}>{item.label}</Badge>;
  };
  const getPriorityBadge = priority => {
    const config = {
      'low': {
        label: '低',
        className: 'bg-gray-100 text-gray-700'
      },
      'medium': {
        label: '中',
        className: 'bg-orange-100 text-orange-700'
      },
      'high': {
        label: '高',
        className: 'bg-red-100 text-red-700'
      }
    };
    const item = config[priority] || config['medium'];
    return <Badge className={item.className}>{item.label}</Badge>;
  };
  const getCategoryLabel = category => {
    const categories = {
      'daily': '日常任务',
      'project': '项目任务',
      'urgent': '紧急任务',
      'other': '其他任务'
    };
    return categories[category] || '其他任务';
  };
  const openDetail = task => {
    setSelectedTask(task);
    setShowDetailDialog(true);
  };
  const openProgressUpdate = task => {
    setSelectedTask(task);
    setProgressUpdate({
      progress: task.progress || 0,
      reason: '',
      description: ''
    });
    setShowProgressDialog(true);
  };
  const isOverdue = deadline => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };
  const getDaysUntilDeadline = deadline => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
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
              <h1 className="text-lg font-semibold">任务管理</h1>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建任务
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="pending">待开始</TabsTrigger>
            <TabsTrigger value="in_progress">进行中</TabsTrigger>
            <TabsTrigger value="completed">已完成</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            {loading ? <div className="text-center py-12 text-gray-500">加载中...</div> : tasks.length === 0 ? <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无任务</p>
                <Button variant="outline" className="mt-3" onClick={() => setShowCreateDialog(true)}>
                  创建任务
                </Button>
              </div> : <div className="space-y-3">
                {tasks.map(task => {
              const daysUntil = getDaysUntilDeadline(task.deadline);
              const isUrgent = daysUntil !== null && daysUntil <= 3 && daysUntil >= 0 && task.status !== 'completed';
              const isOver = isOverdue(task.deadline) && task.status !== 'completed';
              return <Card key={task._id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => openDetail(task)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <ClipboardList className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-gray-900">{task.title}</h3>
                              {getStatusBadge(task.status)}
                              {getPriorityBadge(task.priority)}
                              {isUrgent && <Badge className="bg-orange-100 text-orange-700">
                                  <Clock className="h-3 w-3 mr-1" />
                                  剩{daysUntil}天
                                </Badge>}
                              {isOver && <Badge className="bg-red-100 text-red-700">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  已逾期
                                </Badge>}
                            </div>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                            
                            {/* Progress Bar */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>进度</span>
                                <span>{task.progress || 0}%</span>
                              </div>
                              <Progress value={task.progress || 0} className="h-2" />
                            </div>
                            
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                负责人: {task.assigneeName}
                              </span>
                              <span className={`flex items-center gap-1 ${isOver ? 'text-red-500' : isUrgent ? 'text-orange-500' : ''}`}>
                                <Calendar className="h-3 w-3" />
                                截止: {task.deadline ? new Date(task.deadline).toLocaleDateString('zh-CN') : '未设置'}
                              </span>
                              {task.score !== undefined && task.score !== null && <span className="flex items-center gap-1 text-green-600">
                                  <Flag className="h-3 w-3" />
                                  评分: {task.score}分
                                </span>}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-2" />
                        </div>
                      </CardContent>
                    </Card>;
            })}
              </div>}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建任务</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateTask)} className="space-y-4">
              <FormField control={form.control} name="title" render={({
              field
            }) => <FormItem>
                    <FormLabel>任务标题</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入任务标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="description" render={({
              field
            }) => <FormItem>
                    <FormLabel>任务描述</FormLabel>
                    <FormControl>
                      <Textarea placeholder="请详细描述任务内容..." className="min-h-[80px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="category" render={({
              field
            }) => <FormItem>
                    <FormLabel>任务类型</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择任务类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">日常任务</SelectItem>
                        <SelectItem value="project">项目任务</SelectItem>
                        <SelectItem value="urgent">紧急任务</SelectItem>
                        <SelectItem value="other">其他任务</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="assigneeId" render={({
              field
            }) => <FormItem>
                    <FormLabel>负责人</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择负责人" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map(user => <SelectItem key={user._id} value={user._id}>
                            {user.name} - {user.roleName}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="priority" render={({
              field
            }) => <FormItem>
                    <FormLabel>优先级</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择优先级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="deadline" render={({
              field
            }) => <FormItem>
                    <FormLabel>截止日期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button type="submit">创建任务</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedTask && <>
              <DialogHeader>
                <DialogTitle>任务详情</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(selectedTask.status)}
                  {getPriorityBadge(selectedTask.priority)}
                  <Badge variant="outline">{getCategoryLabel(selectedTask.category)}</Badge>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
                  <p className="text-gray-600 mt-2">{selectedTask.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">负责人</span>
                    <p className="font-medium">{selectedTask.assigneeName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">创建人</span>
                    <p className="font-medium">{selectedTask.creatorName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">截止日期</span>
                    <p className={`font-medium ${isOverdue(selectedTask.deadline) ? 'text-red-500' : ''}`}>
                      {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString('zh-CN') : '未设置'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">创建时间</span>
                    <p className="font-medium">
                      {new Date(selectedTask.createTime).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">当前进度</span>
                    <span className="font-medium">{selectedTask.progress || 0}%</span>
                  </div>
                  <Progress value={selectedTask.progress || 0} className="h-3" />
                </div>
                
                {/* Score */}
                {selectedTask.score !== undefined && selectedTask.score !== null && <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">任务评分</span>
                      <span className="text-2xl font-bold text-green-700">{selectedTask.score}分</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      评分人: {selectedTask.scoredBy} · {selectedTask.scoredTime ? new Date(selectedTask.scoredTime).toLocaleDateString('zh-CN') : ''}
                    </p>
                  </div>}
                
                {/* Progress History */}
                {(selectedTask.progressHistory || []).length > 0 && <div>
                    <span className="text-sm text-gray-500">进度记录</span>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {(selectedTask.progressHistory || []).map((record, index) => <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">进度更新至 {record.progress}%</span>
                            <span className="text-xs text-gray-400">
                              {new Date(record.updateTime).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          {record.reason && <p className="text-sm text-gray-600 mt-1">原因: {record.reason}</p>}
                          {record.description && <p className="text-sm text-gray-500 mt-1">{record.description}</p>}
                          <p className="text-xs text-gray-400 mt-1">更新人: {record.updaterName}</p>
                        </div>)}
                    </div>
                  </div>}
                
                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedTask.status !== 'completed' && <Button className="flex-1" onClick={() => {
                setShowDetailDialog(false);
                openProgressUpdate(selectedTask);
              }}>
                      更新进度
                    </Button>}
                  
                  {selectedTask.status !== 'completed' && !selectedTask.assigneeId && <Button className="flex-1" variant="outline" onClick={() => {
                setSelectedTaskForAssign(selectedTask);
                setShowAssignDialog(true);
              }}>
                      分配任务
                    </Button>}
                  
                  {selectedTask.status === 'completed' && selectedTask.score === undefined && <Button className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600" onClick={() => {
                setShowDetailDialog(false);
                openScoreDialog(selectedTask);
              }}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI智能评分
                    </Button>}
                </div>
              </div>
            </>}
        </DialogContent>
      </Dialog>

      {/* Progress Update Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>更新任务进度</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">当前进度: {progressUpdate.progress}%</label>
              <input type="range" min="0" max="100" value={progressUpdate.progress} onChange={e => setProgressUpdate({
              ...progressUpdate,
              progress: parseInt(e.target.value)
            })} className="w-full" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            
            {progressUpdate.progress < 100 && <div>
                <label className="text-sm font-medium mb-2 block">未完成原因（如未100%完成）</label>
                <Textarea placeholder="请说明未完成的原因..." value={progressUpdate.reason} onChange={e => setProgressUpdate({
              ...progressUpdate,
              reason: e.target.value
            })} />
              </div>}
            
            <div>
              <label className="text-sm font-medium mb-2 block">进度说明</label>
              <Textarea placeholder="请描述当前进度情况..." value={progressUpdate.description} onChange={e => setProgressUpdate({
              ...progressUpdate,
              description: e.target.value
            })} />
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setShowProgressDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateProgress}>确认更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Score Dialog */}
      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI智能评分
            </DialogTitle>
          </DialogHeader>
          
          {aiScoreSuggestion && selectedTask && <div className="space-y-4">
              {/* AI建议评分 */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700">AI建议评分</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`h-5 w-5 ${i < aiScoreSuggestion.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-700">{aiScoreSuggestion.score}分</p>
                <p className="text-sm text-blue-600 mt-1">{aiScoreSuggestion.summary}</p>
              </div>

              {/* 评分因素 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">评分依据</h4>
                <div className="space-y-2">
                  {aiScoreSuggestion.factors.map((factor, index) => <div key={index} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${factor.impact === 'positive' ? 'bg-green-50 text-green-700' : factor.impact === 'negative' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                      {factor.impact === 'positive' ? <CheckCircle2 className="h-4 w-4" /> : factor.impact === 'negative' ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      {factor.text}
                    </div>)}
                </div>
              </div>

              {/* 任务信息 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 text-sm mb-2">任务信息</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="text-gray-500">任务:</span> {selectedTask.title}</p>
                  <p><span className="text-gray-500">负责人:</span> {selectedTask.assigneeName}</p>
                  <p><span className="text-gray-500">完成时间:</span> {selectedTask.completedTime ? new Date(selectedTask.completedTime).toLocaleDateString('zh-CN') : '-'}</p>
                  {selectedTask.progressHistory && <p><span className="text-gray-500">进度更新:</span> {selectedTask.progressHistory.length} 次</p>}
                </div>
              </div>

              {/* 评分说明 */}
              <div className="text-xs text-gray-500 p-3 bg-yellow-50 rounded-lg">
                <p className="font-medium text-yellow-700 mb-1">评分说明</p>
                <p>AI根据任务完成情况、进度汇报频率、是否按时完成等因素给出建议评分。您可以选择接受AI建议或自行评分。</p>
              </div>

              {/* 评分按钮 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">选择评分</h4>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(score => <Button key={score} variant={score === aiScoreSuggestion.score ? "default" : "outline"} className={`h-12 ${score === aiScoreSuggestion.score ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : ''}`} onClick={() => handleScoreTask(score)}>
                      {score}分
                    </Button>)}
                </div>
                <p className="text-xs text-center text-gray-500 mt-2">
                  {aiScoreSuggestion.score}分是AI建议评分
                </p>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
      {/* Assign Task Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>分配任务</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">任务信息</h4>
              <p className="text-sm text-gray-600">{selectedTaskForAssign?.title}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">选择负责人</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择负责人" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role !== 'employee').map(user => <SelectItem key={user._id} value={user._id}>
                      {user.name} - {user.roleName}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setShowAssignDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAssignTask}>
              <Send className="h-4 w-4 mr-2" />
              确认分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}