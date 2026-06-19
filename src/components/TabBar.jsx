// @ts-ignore;
import React from 'react';
// @ts-ignore;
import { Home, Building2, Clock, FileText, ClipboardList } from 'lucide-react';

export function TabBar({
  activeTab,
  onTabChange
}) {
  const tabs = [{
    id: 'home',
    label: '首页',
    icon: Home
  }, {
    id: 'organization',
    label: '组织',
    icon: Building2
  }, {
    id: 'checkin',
    label: '打卡',
    icon: Clock
  }, {
    id: 'approval',
    label: '审批',
    icon: FileText
  }, {
    id: 'tasks',
    label: '任务',
    icon: ClipboardList
  }];
  return <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>;
      })}
      </div>
    </div>;
}