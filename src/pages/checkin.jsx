// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { ArrowLeft, MapPin, Camera, Navigation, CheckCircle2, AlertCircle, Clock, Calendar } from 'lucide-react';
// @ts-ignore;
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Avatar, AvatarFallback, AvatarImage, useToast, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

export default function CheckIn(props) {
  const {
    $w
  } = props;
  const {
    toast
  } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [checkInHistory, setCheckInHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 拍照功能 - 改进版，支持移动端
  const takePhoto = () => {
    // 使用文件选择器模拟拍照
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // 优先使用后置摄像头
    input.onchange = e => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        // 检查文件大小（限制5MB）
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: '照片过大',
            description: '请拍摄或选择小于5MB的照片',
            variant: 'destructive'
          });
          return;
        }
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          toast({
            title: '文件格式错误',
            description: '请选择图片文件',
            variant: 'destructive'
          });
          return;
        }
        const reader = new FileReader();
        reader.onload = event => {
          setPhoto(event.target.result);
          setPhotoFile(file);
          toast({
            title: '拍照成功',
            description: '照片已保存，可用于打卡',
            variant: 'default'
          });
        };
        reader.onerror = () => {
          toast({
            title: '读取失败',
            description: '无法读取照片，请重试',
            variant: 'destructive'
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.onerror = () => {
      toast({
        title: '拍照失败',
        description: '无法访问相机，请检查权限设置',
        variant: 'destructive'
      });
    };
    input.click();
  };
  useEffect(() => {
    loadUserInfo();
    loadTodayRecord();
    loadCheckInHistory();

    // 更新时间
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedMonth]);
  const loadUserInfo = async () => {
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
      console.error('加载用户信息失败:', error);
      setCurrentUser(null);
    }
  };
  const loadTodayRecord = async () => {
    try {
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const auth = tcb.auth();
      const loginState = await auth.getLoginState();
      if (!loginState || !loginState.userInfo) {
        setTodayRecord(null);
        return;
      }
      const openId = loginState.userInfo.openId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const res = await db.collection('checkins').where({
        _openid: openId,
        date: db.command.and([db.command.gte(today), db.command.lt(tomorrow)])
      }).limit(1).get();
      setTodayRecord(res.data && res.data.length > 0 ? res.data[0] : null);
    } catch (error) {
      console.error('加载今日记录失败:', error);
    }
  };
  const loadCheckInHistory = async () => {
    try {
      setLoading(true);
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const auth = tcb.auth();
      const loginState = await auth.getLoginState();
      if (!loginState || !loginState.userInfo) {
        setCheckInHistory([]);
        setLoading(false);
        return;
      }
      const openId = loginState.userInfo.openId;
      const year = new Date().getFullYear();
      const startDate = new Date(year, selectedMonth - 1, 1);
      const endDate = new Date(year, selectedMonth, 0, 23, 59, 59);
      const res = await db.collection('checkins').where({
        _openid: openId,
        date: db.command.and([db.command.gte(startDate), db.command.lte(endDate)])
      }).orderBy('date', 'desc').get();
      setCheckInHistory(res.data || []);
    } catch (error) {
      console.error('加载打卡记录失败:', error);
      toast({
        title: '加载失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      const tcb = await $w.cloud.getCloudInstance();
      const db = tcb.database();
      const auth = tcb.auth();
      const loginState = await auth.getLoginState();
      if (!loginState || !loginState.userInfo) {
        toast({
          title: '请先登录',
          description: '需要登录后才能打卡',
          variant: 'destructive'
        });
        return;
      }
      const now = new Date();
      const hour = now.getHours();
      const openId = loginState.userInfo.openId;

      // 判断打卡类型
      let checkInType = 'normal';
      if (hour < 9) {
        checkInType = 'normal';
      } else if (hour < 10) {
        checkInType = 'late';
      } else {
        checkInType = 'absent';
      }
      if (todayRecord) {
        // 更新下班打卡
        const updateData = {
          checkOutTime: now,
          updateTime: now
        };

        // 如果有照片，上传到云存储
        if (photoFile) {
          try {
            const uploadResult = await tcb.uploadFile({
              cloudPath: `checkin_photos/${openId}_${Date.now()}.jpg`,
              fileContent: photoFile
            });
            updateData.checkOutPhoto = uploadResult.fileID;
            updateData.photoUrl = uploadResult.fileID;
          } catch (uploadError) {
            console.error('照片上传失败:', uploadError);
            toast({
              title: '照片上传失败',
              description: '打卡成功，但照片上传失败',
              variant: 'destructive'
            });
          }
        }
        await db.collection('checkins').doc(todayRecord._id).update(updateData);
        toast({
          title: '下班打卡成功',
          description: `时间: ${now.toLocaleTimeString()}`,
          variant: 'default'
        });
      } else {
        // 添加上班打卡
        const addData = {
          date: now,
          checkInTime: now,
          status: checkInType,
          createTime: now,
          updateTime: now,
          _openid: openId // 关联用户
        };

        // 如果有照片，上传到云存储
        if (photoFile) {
          try {
            const uploadResult = await tcb.uploadFile({
              cloudPath: `checkin_photos/${openId}_${Date.now()}.jpg`,
              fileContent: photoFile
            });
            addData.photo = uploadResult.fileID;
            addData.photoUrl = uploadResult.fileID;
          } catch (uploadError) {
            console.error('照片上传失败:', uploadError);
            toast({
              title: '照片上传失败',
              description: '打卡成功，但照片上传失败',
              variant: 'destructive'
            });
          }
        }
        await db.collection('checkins').add(addData);
        const statusText = {
          'normal': '正常',
          'late': '迟到',
          'absent': '缺勤'
        };
        toast({
          title: '上班打卡成功',
          description: `状态: ${statusText[checkInType]} · 时间: ${now.toLocaleTimeString()}`,
          variant: checkInType === 'normal' ? 'default' : 'destructive'
        });
      }
      loadTodayRecord();
      loadCheckInHistory();
    } catch (error) {
      console.error('打卡失败:', error);
      toast({
        title: '打卡失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setCheckingIn(false);
    }
  };
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: `纬度: ${position.coords.latitude.toFixed(6)}, 经度: ${position.coords.longitude.toFixed(6)}`,
          distance: '距离打卡范围 12米'
        });
        toast({
          title: '定位成功',
          description: '已获取当前位置',
          variant: 'default'
        });
      }, error => {
        console.error('定位失败:', error);
        setLocation({
          address: '定位失败，使用默认地址',
          distance: '无法获取距离'
        });
        toast({
          title: '定位失败',
          description: '无法获取位置信息，将使用默认地址',
          variant: 'destructive'
        });
      });
    } else {
      setLocation({
        address: '浏览器不支持定位',
        distance: '无法获取距离'
      });
    }
  };
  const getStatusBadge = status => {
    const config = {
      'normal': {
        label: '正常',
        className: 'bg-green-100 text-green-700'
      },
      'late': {
        label: '迟到',
        className: 'bg-orange-100 text-orange-700'
      },
      'absent': {
        label: '缺勤',
        className: 'bg-red-100 text-red-700'
      },
      'leave': {
        label: '请假',
        className: 'bg-blue-100 text-blue-700'
      }
    };
    const config_item = config[status] || config['normal'];
    return <Badge className={config_item.className}>{config_item.label}</Badge>;
  };
  const getMonthStats = () => {
    const total = checkInHistory.length;
    const normal = checkInHistory.filter(r => r.status === 'normal').length;
    const late = checkInHistory.filter(r => r.status === 'late').length;
    const absent = checkInHistory.filter(r => r.status === 'absent').length;
    return {
      total,
      normal,
      late,
      absent
    };
  };
  const stats = getMonthStats();
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => $w.utils.navigateBack()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">打卡考勤</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Time Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0">
          <CardContent className="p-6 text-center">
            <div className="text-blue-100 text-sm mb-2">
              {currentTime.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
            </div>
            <div className="text-5xl font-bold tracking-wider mb-4">
              {currentTime.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit'
            })}
            </div>
            
            {todayRecord ? <div className="flex items-center justify-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-blue-200">上班</p>
                  <p className="font-semibold">
                    {todayRecord.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '--:--'}
                  </p>
                </div>
                <div className="w-px h-8 bg-blue-400" />
                <div className="text-center">
                  <p className="text-blue-200">下班</p>
                  <p className="font-semibold">
                    {todayRecord.checkOutTime ? new Date(todayRecord.checkOutTime).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '未打卡'}
                  </p>
                </div>
              </div> : <p className="text-blue-200">今日尚未打卡</p>}
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">打卡位置</h3>
                {location ? <div className="mt-1">
                    <p className="text-sm text-gray-600">{location.address}</p>
                    <p className="text-xs text-green-600 mt-1">{location.distance}</p>
                  </div> : <p className="text-sm text-gray-500 mt-1">点击获取当前位置</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={getLocation}>
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Photo Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Camera className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">打卡照片</h3>
                {photo ? <div className="mt-2">
                    <img src={photo} alt="打卡照片" className="w-full h-32 object-cover rounded-lg" />
                    <p className="text-xs text-green-600 mt-1">已拍照</p>
                  </div> : <p className="text-sm text-gray-500 mt-1">点击拍照打卡</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={takePhoto}>
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Check In Button */}
        <Button className={`w-full h-20 text-xl font-semibold shadow-lg ${todayRecord?.checkOutTime ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'}`} disabled={checkingIn || todayRecord?.checkOutTime} onClick={handleCheckIn}>
          {checkingIn ? '打卡中...' : todayRecord?.checkOutTime ? '今日打卡完成' : todayRecord ? '下班打卡' : '上班打卡'}
        </Button>

        {/* Month Stats */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">考勤统计</CardTitle>
              <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({
                  length: 12
                }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}月
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 mx-auto mb-2 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">打卡天数</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 mx-auto mb-2 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.normal}</p>
                <p className="text-xs text-gray-500">正常</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-orange-100 mx-auto mb-2 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
                <p className="text-xs text-gray-500">迟到</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 mx-auto mb-2 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
                <p className="text-xs text-gray-500">缺勤</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">打卡记录</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8 text-gray-500">加载中...</div> : checkInHistory.length === 0 ? <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无打卡记录</p>
              </div> : <div className="space-y-3">
                {checkInHistory.map(record => <div key={record._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric'
                    })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {record.checkInTime && new Date(record.checkInTime).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                          {record.checkOutTime && ` - ${new Date(record.checkOutTime).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(record.status)}
                  </div>)}
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
}