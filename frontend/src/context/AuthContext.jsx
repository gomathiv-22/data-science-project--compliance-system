/**
 * src/context/AuthContext.jsx
 * State management for user authentication, token persistence, and profile.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [activeLanguage, setActiveLanguage] = useState(() => {
    return localStorage.getItem('pref_lang') || 'en';
  });

  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/profile');
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          if (res.data.user.preferred_language) {
            setActiveLanguage(res.data.user.preferred_language);
            localStorage.setItem('pref_lang', res.data.user.preferred_language);
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    if (userData.preferred_language) {
      setActiveLanguage(userData.preferred_language);
      localStorage.setItem('pref_lang', userData.preferred_language);
    }
    return res.data;
  };

  const signup = async (data) => {
    const res = await api.post('/signup', data);
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    if (userData.preferred_language) {
      setActiveLanguage(userData.preferred_language);
      localStorage.setItem('pref_lang', userData.preferred_language);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const changeLanguage = async (newLang) => {
    setActiveLanguage(newLang);
    localStorage.setItem('pref_lang', newLang);
    if (token) {
      try {
        await api.patch('/profile', { preferred_language: newLang });
        setUser((prev) => (prev ? { ...prev, preferred_language: newLang } : null));
      } catch (err) {
        console.warn('Could not persist language to backend profile:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        loading,
        login,
        signup,
        logout,
        activeLanguage,
        changeLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
