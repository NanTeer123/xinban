// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { ArrowLeft, Bell, Clock, CheckCircle2, AlertCircle, Info, Megaphone } from 'lucide-react';
// @ts-ignore;
import { Button, Card, CardContent, Badge, Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '@/components/ui';

export default function Notices(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    ensureCollections();
    loadNotices();
  }, [activeTab]);
  // 确保必要的集合存在
  const ensureCollections = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      // 尝试查询 notices 集合，如果不存在会报错，我们忽略这个错误
      try {
        await db.collection('notices').limit(1).get();
      } catch (e) {
        // notices 集合不存在，创建一个示例记录来初始化集合
        try {
          await db.collection('notices').add({
            title: '__init__',
            content: '__init__',
            type: '__init__',
            createTime: new Date(),
            updateTime: new Date()
          });
          // 删除初始化记录
          const initRes = await db.collection('notices').where({
            title: '__init__'
          }).get();
          if (initRes.data && initRes.data.length > 0) {
            await db.collection('notices').doc(initRes.data[0]._id).remove();
          }
        } catch (addError) {
          console.error('初始化 notices 集合失败:', addError);
        }
      }
    } catch (error) {
      console.error('检查集合失败:', error);
    }
  };
  const loadNotices = async () => {
    try {
      setLoading(true);
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      let query = {};
      if (activeTab === 'unread') {
        query = {
          isRead: false
        };
      } else if (activeTab === 'system') {
        query = {
          type: 'system'
        };
      } else if (activeTab === 'announcement') {
        query = {
          type: 'announcement'
        };
      }
      const res = await db.collection('notices').where(query).orderBy('createTime', 'desc').get();
      setNotices(res.data || []);
    } catch (error) {
      console.error('加载通知失败:', error);
      toast({
        title: '加载失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleMarkAsRead = async noticeId => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      await db.collection('notices').doc(noticeId).update({
        isRead: true,
        readTime: new Date(),
        updateTime: new Date()
      });
      loadNotices();
    } catch (error) {
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const handleMarkAllAsRead = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const unreadNotices = notices.filter(n => !n.isRead);
      for (const notice of unreadNotices) {
        await db.collection('notices').doc(notice._id).update({
          isRead: true,
          readTime: new Date(),
          updateTime: new Date()
        });
      }
      toast({
        title: '操作成功',
        description: `已将 ${unreadNotices.length} 条通知标记为已读`,
        variant: 'default'
      });
      loadNotices();
    } catch (error) {
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const getNoticeIcon = type => {
    switch (type) {
      case 'system':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-orange-600" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };
  const getNoticeBgColor = type => {
    switch (type) {
      case 'system':
        return 'bg-blue-100';
      case 'announcement':
        return 'bg-orange-100';
      case 'alert':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };
  const getTypeLabel = type => {
    const labels = {
      'system': '系统',
      'announcement': '公告',
      'alert': '提醒',
      'task': '任务'
    };
    return labels[type] || '其他';
  };
  const unreadCount = notices.filter(n => !n.isRead).length;
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => $w.utils.navigateBack()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">通知公告</h1>
                <p className="text-xs text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} 条未读` : '全部已读'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                全部已读
              </Button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="unread">未读</TabsTrigger>
            <TabsTrigger value="system">系统</TabsTrigger>
            <TabsTrigger value="announcement">公告</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            {loading ? <div className="text-center py-12 text-gray-500">加载中...</div> : notices.length === 0 ? <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无通知</p>
              </div> : <div className="space-y-3">
                {notices.map(notice => <Card key={notice._id} className={`cursor-pointer hover:shadow-sm transition-shadow ${!notice.isRead ? 'border-l-4 border-l-blue-500' : ''}`} onClick={() => handleMarkAsRead(notice._id)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${getNoticeBgColor(notice.type)} flex items-center justify-center flex-shrink-0`}>
                          {getNoticeIcon(notice.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{notice.title}</h3>
                            {!notice.isRead && <Badge className="bg-red-100 text-red-700">未读</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notice.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <Badge variant="secondary" className="text-xs">
                              {getTypeLabel(notice.type)}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(notice.createTime).toLocaleString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}
          </TabsContent>
        </Tabs>
      </div>
    </div>;
}