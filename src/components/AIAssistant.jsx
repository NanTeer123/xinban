// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Bot, Sparkles, Clock, AlertTriangle, CheckCircle2, TrendingUp, Award, Calendar, X, Info } from 'lucide-react';
// @ts-ignore;
import { Button, Card, CardContent, Badge, useToast } from '@/components/ui';

/**
 * 鑫办AI助手组件
 * 
 * 功能说明：
 * 这是一个纯前端实现的智能助手，无需调用外部AI API，完全免费使用
 * 
 * 核心功能：
 * 1. 任务智能分析 - 基于任务数据自动分析状态
 * 2. 到期提醒 - 检测即将到期和已过期的任务
 * 3. 进度追踪 - 监控任务更新频率
 * 4. 评分建议 - 基于完成质量提供评分参考
 * 5. 工作统计 - 展示任务完成情况和工作表现
 * 
 * 智能算法：
 * - 过期检测：对比截止日期和当前时间
 * - 紧急度计算：3天内到期的任务标记为紧急
 * - 进度评分：基于完成时间、更新频率、任务优先级综合计算
 * - 工作表现：统计完成率、平均分等指标
 * 
 * 使用方法：
 * 该组件会自动分析传入的任务数据，生成智能建议
 * 无需任何配置，开箱即用，永久免费
 */
export function AIAssistant({
  $w,
  tasks = [],
  currentUser = null
}) {
  const {
    toast
  } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [hasNewSuggestions, setHasNewSuggestions] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  useEffect(() => {
    if (tasks.length > 0) {
      generateInsights();
    }
  }, [tasks]);

  /**
   * AI智能分析任务数据
   * 完全本地实现，无需网络请求
   */
  const generateInsights = () => {
    const now = new Date();
    const newSuggestions = [];
    let taskInsights = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
      overdue: 0,
      urgent: 0,
      avgScore: 0,
      scoredTasks: 0
    };
    tasks.forEach(task => {
      // 统计状态
      if (task.status === 'completed') {
        taskInsights.completed++;
        if (task.score !== undefined && task.score !== null) {
          taskInsights.avgScore += task.score;
          taskInsights.scoredTasks++;
        }
      } else if (task.status === 'in_progress') {
        taskInsights.inProgress++;
      } else {
        taskInsights.pending++;
      }

      // 检查是否过期
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        if (daysUntilDeadline < 0 && task.status !== 'completed') {
          // 已过期
          taskInsights.overdue++;
          newSuggestions.push({
            type: 'overdue',
            priority: 'high',
            title: `任务「${task.title}」已过期`,
            description: `该任务已逾期 ${Math.abs(daysUntilDeadline)} 天，请尽快处理或更新进度`,
            taskId: task._id,
            action: '查看任务'
          });
        } else if (daysUntilDeadline <= 3 && daysUntilDeadline >= 0 && task.status !== 'completed') {
          // 即将到期（3天内）
          taskInsights.urgent++;
          newSuggestions.push({
            type: 'urgent',
            priority: 'medium',
            title: `任务「${task.title}」即将截止`,
            description: `还有 ${daysUntilDeadline} 天到期，请合理安排时间完成`,
            taskId: task._id,
            action: '更新进度'
          });
        }
      }

      // 检查长时间未更新的进行中任务
      if (task.status === 'in_progress' && task.updateTime) {
        const lastUpdate = new Date(task.updateTime);
        const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
        if (daysSinceUpdate >= 7) {
          newSuggestions.push({
            type: 'stale',
            priority: 'low',
            title: `任务「${task.title}」已 ${daysSinceUpdate} 天未更新`,
            description: '建议定期更新任务进度，保持团队信息同步',
            taskId: task._id,
            action: '更新进度'
          });
        }
      }
    });

    // 计算平均分
    if (taskInsights.scoredTasks > 0) {
      taskInsights.avgScore = (taskInsights.avgScore / taskInsights.scoredTasks).toFixed(1);
    }

    // 添加评分建议
    const unScoredCompletedTasks = tasks.filter(t => t.status === 'completed' && (t.score === undefined || t.score === null));
    if (unScoredCompletedTasks.length > 0) {
      newSuggestions.push({
        type: 'score',
        priority: 'medium',
        title: `有 ${unScoredCompletedTasks.length} 个已完成任务待评分`,
        description: '及时评分有助于绩效统计和团队激励',
        tasks: unScoredCompletedTasks,
        action: '去评分'
      });
    }

    // 添加工作总结建议
    if (taskInsights.completed > 0) {
      const completionRate = (taskInsights.completed / taskInsights.total * 100).toFixed(0);
      newSuggestions.push({
        type: 'summary',
        priority: 'low',
        title: '工作表现分析',
        description: `任务完成率 ${completionRate}%，${taskInsights.avgScore > 0 ? `平均评分 ${taskInsights.avgScore} 分` : '暂无评分数据'}，继续保持！`,
        action: '查看详情'
      });
    }
    setInsights(taskInsights);
    setSuggestions(newSuggestions);
    setHasNewSuggestions(newSuggestions.length > 0);
  };

  // 获取优先级颜色
  const getPriorityColor = priority => {
    const colors = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-orange-100 text-orange-700 border-orange-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[priority] || colors.low;
  };

  // 获取图标
  const getIcon = type => {
    const icons = {
      overdue: AlertTriangle,
      urgent: Clock,
      stale: Clock,
      score: Award,
      summary: TrendingUp
    };
    const Icon = icons[type] || Sparkles;
    return <Icon className="h-4 w-4" />;
  };

  // 处理建议点击
  const handleSuggestionClick = suggestion => {
    if (suggestion.taskId) {
      $w.utils.navigateTo({
        pageId: 'tasks',
        params: {
          taskId: suggestion.taskId
        }
      });
    } else if (suggestion.type === 'score') {
      $w.utils.navigateTo({
        pageId: 'tasks',
        params: {
          filter: 'completed'
        }
      });
    }
    setIsOpen(false);
  };

  /**
   * 智能评分建议算法
   * 基于多维度因素计算建议评分
   */
  const getScoreSuggestion = task => {
    const factors = [];
    let suggestedScore = 3;

    // 基于完成时间评分
    if (task.deadline && task.completedTime) {
      const deadline = new Date(task.deadline);
      const completed = new Date(task.completedTime);
      if (completed <= deadline) {
        factors.push('按时完成');
        suggestedScore += 1;
      } else {
        const daysOverdue = Math.ceil((completed - deadline) / (1000 * 60 * 60 * 24));
        factors.push(`逾期 ${daysOverdue} 天`);
        suggestedScore -= 1;
      }
    }

    // 基于进度更新频率评分
    if (task.progressHistory && task.progressHistory.length > 0) {
      const updateCount = task.progressHistory.length;
      if (updateCount >= 3) {
        factors.push('进度汇报积极');
        suggestedScore += 0.5;
      }
    }

    // 基于任务优先级评分
    if (task.priority === 'high') {
      factors.push('高优先级任务');
    }
    suggestedScore = Math.max(1, Math.min(5, Math.round(suggestedScore)));
    return {
      score: suggestedScore,
      factors
    };
  };
  return <>
      {/* AI助手悬浮按钮 */}
      <button onClick={() => {
      setIsOpen(true);
      setHasNewSuggestions(false);
    }} className={`fixed right-4 bottom-24 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${hasNewSuggestions ? 'bg-gradient-to-r from-orange-500 to-red-500 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'}`}>
        <div className="relative">
          <Bot className="h-6 w-6 text-white" />
          {hasNewSuggestions && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
        </div>
      </button>

      {/* AI助手面板 */}
      {isOpen && <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50">
          <div className="bg-white w-full max-w-md max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">鑫办AI助手</h3>
                    <p className="text-blue-100 text-xs">智能任务管理与提醒</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setShowAbout(true)}>
                    <Info className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* 数据概览 */}
              {insights && <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{insights.total}</p>
                    <p className="text-xs text-gray-600">总任务</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">{insights.completed}</p>
                    <p className="text-xs text-gray-600">已完成</p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">{insights.inProgress}</p>
                    <p className="text-xs text-gray-600">进行中</p>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">{insights.avgScore || '-'}</p>
                    <p className="text-xs text-gray-600">平均分</p>
                  </div>
                </div>}

              {/* 警告提示 */}
              {(insights?.overdue > 0 || insights?.urgent > 0) && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">需要关注</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    {insights.overdue > 0 && `有 ${insights.overdue} 个任务已过期`}
                    {insights.overdue > 0 && insights.urgent > 0 && '，'}
                    {insights.urgent > 0 && `有 ${insights.urgent} 个任务即将截止`}
                  </p>
                </div>}

              {/* 智能建议列表 */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  智能建议
                </h4>

                {suggestions.length === 0 ? <div className="text-center py-6 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-400" />
                    <p>暂无待处理事项，继续保持！</p>
                  </div> : suggestions.map((suggestion, index) => <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleSuggestionClick(suggestion)}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getPriorityColor(suggestion.priority)}`}>
                            {getIcon(suggestion.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-gray-900 text-sm">{suggestion.title}</h5>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.priority === 'high' ? '紧急' : suggestion.priority === 'medium' ? '重要' : '提示'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{suggestion.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                {suggestion.action}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>)}
              </div>

              {/* 评分建议说明 */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 text-sm mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  AI评分参考
                </h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 按时完成任务可获得基础评分</li>
                  <li>• 提前完成可获得额外加分</li>
                  <li>• 积极更新进度有助于提高评分</li>
                  <li>• 高优先级任务完成情况影响权重</li>
                </ul>
              </div>
            </div>
          </div>
        </div>}

      {/* 关于AI助手对话框 */}
      {showAbout && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">关于鑫办AI助手</h3>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setShowAbout(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">🤖 什么是鑫办AI助手？</h4>
                  <p className="text-sm text-gray-600">
                    鑫办AI助手是专为鑫办办公平台打造的智能任务管理助手。它基于您的任务数据，
                    自动分析并提供智能提醒和建议，帮助您更高效地管理工作。
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">✨ 核心功能</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span><strong>智能到期提醒</strong> - 自动检测即将到期和已过期的任务</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span><strong>进度追踪</strong> - 监控任务更新频率，提醒长时间未更新的任务</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span><strong>评分建议</strong> - 基于完成质量提供智能评分参考</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span><strong>工作统计</strong> - 展示任务完成情况和工作表现分析</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">💡 智能算法说明</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>过期检测：</strong>对比截止日期和当前时间，自动识别已过期任务</p>
                    <p><strong>紧急度计算：</strong>3天内到期的任务标记为紧急，需要优先处理</p>
                    <p><strong>进度评分：</strong>综合考虑完成时间、更新频率、任务优先级等因素</p>
                    <p><strong>工作表现：</strong>统计完成率、平均分等指标，全面评估工作质量</p>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-semibold text-green-800 mb-1">🎉 完全免费</h4>
                  <p className="text-sm text-green-700">
                    鑫办AI助手采用纯前端实现，所有计算都在本地完成，无需调用任何外部AI API，
                    永久免费使用，不会产生任何费用！
                  </p>
                </div>

                <div className="text-center pt-2">
                  <Button onClick={() => setShowAbout(false)}>我知道了</Button>
                </div>
              </div>
            </div>
          </div>
        </div>}
    </>;
}