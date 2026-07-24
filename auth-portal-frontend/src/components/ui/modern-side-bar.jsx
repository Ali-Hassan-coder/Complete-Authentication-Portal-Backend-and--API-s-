import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { 
  Home, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Bell,
  Search,
  Key,
  MessageSquare
} from 'lucide-react';

const navigationItems = [
  { id: "dashboard", name: "Dashboard", icon: Home, href: "/dashboard" },
  { id: "permissions", name: "Permissions", icon: Key, href: "/permissions", adminOnly: true },
  { id: "documents", name: "Documents", icon: FileText, href: "/documents" },
  { id: "notifications", name: "Notifications", icon: Bell, href: "/notifications" },
  { id: "chat", name: "Chat", icon: MessageSquare, href: "/chat" },
  { id: "settings", name: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar({ className = "" }) {
  const { user, logout, socket } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [globalUnread, setGlobalUnread] = useState({ messages: 0, chats: 0 });
  const [imgError, setImgError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUnread = useCallback(async () => {
      try {
          const res = await axiosInstance.get(`/auth/unread-count?t=${Date.now()}`);
          setGlobalUnread({ messages: res.data.count, chats: res.data.chatCount });
      } catch (err) {
          // ignore
      }
  }, []);

  useEffect(() => {
      if (user) {
          fetchUnread();
      }
  }, [user, fetchUnread]);

  useEffect(() => {
      window.addEventListener('chat_read', fetchUnread);
      return () => {
          window.removeEventListener('chat_read', fetchUnread);
      };
  }, [fetchUnread]);

  useEffect(() => {
      if (!socket) return;
      socket.on('new_message', fetchUnread);
      return () => {
          socket.off('new_message', fetchUnread);
      };
  }, [socket, fetchUnread]);

  // Auto-open sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setImgError(false);
  }, [user?.profileFile]);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleItemClick = (item) => {
    if (item.id === "logout") {
      logout();
      navigate('/login');
    } else {
      navigate(item.href);
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    }
  };

  const filteredNavigationItems = navigationItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    if (item.permission && !(user?.permissions?.includes(item.permission) || user?.role === 'admin')) {
      return false;
    }
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-6 left-6 z-50 p-3 rounded-lg bg-white dark:bg-slate-800 shadow-md dark:shadow-none border border-slate-100 dark:border-slate-700/60 md:hidden hover:bg-slate-50 dark:bg-slate-900/50 transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        {isOpen ? 
          <X className="h-5 w-5 text-slate-600 dark:text-slate-300" /> : 
          <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        }
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300" 
          onClick={toggleSidebar} 
        />
      )}

      {/* Sidebar container */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/60 z-40 transition-all duration-300 ease-in-out flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "w-20" : "w-64"}
          md:translate-x-0 md:sticky md:top-0 md:h-screen md:z-auto
          ${className}
        `}
      >
        {/* Header with logo and collapse button */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/50">
          {!isCollapsed && (
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 bg-accent-600 rounded-lg flex items-center justify-center shadow-sm dark:shadow-none">
                <span className="text-white font-bold text-base">
                  {(user?.organizationName || 'A')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{user?.organizationName || 'My Organization'}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Enterprise Dashboard</span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-9 h-9 bg-accent-600 rounded-lg flex items-center justify-center mx-auto shadow-sm dark:shadow-none">
              <span className="text-white font-bold text-base">{(user?.organizationName || 'A')[0].toUpperCase()}</span>
            </div>
          )}

          {/* Desktop collapse button */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-md hover:bg-slate-100 dark:bg-slate-800 transition-all duration-200"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-md text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all duration-200"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-0.5">
            {filteredNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <li key={item.id} className="relative group">
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`
                      w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-left transition-all duration-200
                      ${isActive
                        ? "bg-accent-50 dark:bg-accent-500/20 text-accent-700 dark:text-accent-300"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900/50 hover:text-slate-900 dark:text-white"
                      }
                      ${item.id === 'chat' && globalUnread.messages > 0 && !isActive ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold border border-green-200 dark:border-green-500/30 shadow-sm dark:shadow-none animate-pulse' : ''}
                      ${isCollapsed ? "justify-center px-2" : ""}
                    `}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center justify-center min-w-[24px]">
                      <Icon
                        className={`
                          h-4.5 w-4.5 flex-shrink-0
                          ${isActive 
                            ? "text-accent-600 dark:text-accent-400" 
                            : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:text-slate-200"
                          }
                        `}
                      />
                    </div>
                    
                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-sm ${isActive ? "font-medium" : "font-normal"} ${item.id === 'chat' && globalUnread.messages > 0 ? 'font-extrabold text-green-700' : ''}`}>{item.name}</span>
                        {item.badge && (
                          <span className={`
                            px-1.5 py-0.5 text-[10px] font-bold rounded-full
                            ${isActive
                              ? "bg-accent-100 dark:bg-accent-500/30 text-accent-700 dark:text-accent-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                        {item.id === 'chat' && globalUnread.messages > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce whitespace-nowrap">
                                {globalUnread.chats} {globalUnread.chats === 1 ? 'Chat' : 'Chats'} ({globalUnread.messages} Msg)
                            </span>
                        )}
                      </div>
                    )}

                    {/* Badge for collapsed state */}
                    {isCollapsed && item.badge && (
                      <div className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-accent-100 dark:bg-accent-500/30 border border-white dark:border-slate-800">
                        <span className="text-[10px] font-medium text-accent-700 dark:text-accent-300">
                          {parseInt(item.badge) > 9 ? '9+' : item.badge}
                        </span>
                      </div>
                    )}
                    {isCollapsed && item.id === 'chat' && globalUnread.messages > 0 && (
                      <div className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 border border-white animate-bounce shadow-lg">
                        <span className="text-[10px] font-bold text-white">
                          {globalUnread.messages > 9 ? '9+' : globalUnread.messages}
                        </span>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section with profile and logout */}
        <div className="mt-auto border-t border-slate-200 dark:border-slate-700/60">
          {/* Profile Section */}
          <div className={`border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/50 ${isCollapsed ? 'py-3 px-2' : 'p-3'}`}>
            {!isCollapsed ? (
              <div 
                onClick={() => navigate('/profile')}
                className="flex items-center px-3 py-2 rounded-md bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors duration-200"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                  {user?.profileFile && !imgError ? (
                    <img 
                        src={user.profileFile} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                        onError={() => setImgError(true)} 
                    />
                  ) : (
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-xs">{getInitials(user?.name)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 ml-2.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate capitalize">{user?.role || 'User'}</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full ml-2" title="Online" />
              </div>
            ) : (
              <div className="flex justify-center cursor-pointer" onClick={() => navigate('/profile')}>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    {user?.profileFile && !imgError ? (
                      <img 
                          src={user.profileFile} 
                          alt="Profile" 
                          className="w-full h-full object-cover" 
                          onError={() => setImgError(true)} 
                      />
                    ) : (
                      <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">{getInitials(user?.name)}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <div className="p-3">
            <button
              onClick={() => handleItemClick({ id: "logout" })}
              className={`
                w-full flex items-center rounded-md text-left transition-all duration-200 group
                text-red-600 hover:bg-red-50 hover:text-red-700
                ${isCollapsed ? "justify-center p-2.5" : "space-x-2.5 px-3 py-2.5"}
              `}
              title={isCollapsed ? "Logout" : undefined}
            >
              <div className="flex items-center justify-center min-w-[24px]">
                <LogOut className="h-4.5 w-4.5 flex-shrink-0 text-red-500 group-hover:text-red-600" />
              </div>
              
              {!isCollapsed && (
                <span className="text-sm font-semibold">Logout</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
